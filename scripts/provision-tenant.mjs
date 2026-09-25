#!/usr/bin/env node
// Provision a customer workspace (tenant) in the Supabase project named by the environment.
//
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     node scripts/provision-tenant.mjs intake.json [--apply] [--key-out ./slug.intake.key]
//
// Without --apply it only validates and prints the plan (read-only). With --apply it creates:
// tenant, branding, default site, vertical queues, owner user + membership, and the per-tenant
// intake webhook key (only its SHA-256 is stored). On any failure it rolls back (tenant delete
// cascades; a user created by this run is removed). It never sends email and never touches
// ElevenLabs, Twilio, DNS or billing - those are separate, approved steps.
//
// intake.json: { name, slug, owner_email, timezone?, company_name?, product_name?, support_email?,
//                vertical?: home_services|property_management|automotive|general,
//                modules?: "core"|"all"|["/path",...], root_domain?: "stellaruc.com",
//                phone_numbers?: ["+15555550100", ...] (E.164; each becomes an active inbound number) }
// Staging workspaces must use a "stg-" slug and run with AI4CC_ENVIRONMENT=staging (see lib/tenantHost.ts).

import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { isValidTenantSlug } from '../lib/tenantHost.ts';

const args = process.argv.slice(2);
const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--key-out');
const apply = args.includes('--apply');
const keyOutIdx = args.indexOf('--key-out');
const keyOut = keyOutIdx >= 0 ? args[keyOutIdx + 1] : null;
if (!file) {
  console.error('usage: node scripts/provision-tenant.mjs intake.json [--apply] [--key-out file]');
  process.exit(2);
}

const intake = JSON.parse(readFileSync(file, 'utf8'));
const templates = JSON.parse(readFileSync(new URL('./vertical-templates.json', import.meta.url), 'utf8'));

const problems = [];
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const name = str(intake.name);
const slug = str(intake.slug).toLowerCase();
const ownerEmail = str(intake.owner_email).toLowerCase();
const vertical = str(intake.vertical) || 'general';
const rootDomain = str(intake.root_domain) || 'stellaruc.com';
const timezone = str(intake.timezone) || 'America/Los_Angeles';
if (!name) problems.push('name is required');
if (!isValidTenantSlug(slug)) problems.push(`slug "${slug}" is invalid or reserved (3-32 chars, a-z 0-9 hyphen, no "--")`);
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) problems.push('owner_email is invalid');
if (!templates[vertical]) problems.push(`vertical must be one of: ${Object.keys(templates).join(', ')}`);
try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }); } catch { problems.push(`timezone "${timezone}" is not valid`); }
const modules = intake.modules ?? 'core';
const modulesOk = modules === 'core' || modules === 'all' || (Array.isArray(modules) && modules.every((m) => typeof m === 'string' && m.startsWith('/')));
if (!modulesOk) problems.push('modules must be "core", "all" or an array of paths');
const phoneNumbers = intake.phone_numbers ?? [];
if (!Array.isArray(phoneNumbers) || !phoneNumbers.every((p) => typeof p === 'string' && /^\+[1-9][0-9]{6,14}$/.test(p))) {
  problems.push('phone_numbers must be an array of E.164 strings like +15555550100');
}
if (problems.length) {
  console.error('Intake problems:\n - ' + problems.join('\n - '));
  process.exit(2);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(2);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

// AI4CC_SCHEMA_MODEL=stellar targets the Stellar database (public.tenants / tenant_users / tenant_phone_numbers,
// tenant created through public.provision_stellar_tenant). Default is the legacy ai4cc_* tenant tables.
const STELLAR = process.env.AI4CC_SCHEMA_MODEL === 'stellar';
const T = STELLAR
  ? { tenants: 'tenants', members: 'tenant_users', slugCol: 'tenant_slug' }
  : { tenants: 'ai4cc_tenants', members: 'ai4cc_tenant_members', slugCol: 'slug' };

const host = `${slug}.${rootDomain}`;
const queues = templates[vertical].queues;

const { data: existing, error: existingErr } = await db.from(T.tenants).select('id').eq(T.slugCol, slug).maybeSingle();
if (existingErr) {
  console.error('Could not check slug:', existingErr.message);
  process.exit(1);
}
if (existing) {
  console.error(`Slug "${slug}" is already taken.`);
  process.exit(1);
}

// Preflight: in Stellar mode a tenant cannot be rolled back by the service role, so prove every table this run
// writes is reachable BEFORE the tenant is created.
for (const t of ['ai4cc_branding', 'ai4cc_queues', 'ai4cc_integrations', 'ai4cc_contacts', 'ai4cc_leads', 'ai4cc_interactions', ...(STELLAR ? [] : ['ai4cc_sites'])]) {
  const { error } = await db.from(t).select('*', { count: 'exact', head: true }).limit(1);
  if (error) {
    console.error(`Preflight failed on ${t}: ${error.message}`);
    process.exit(1);
  }
}

console.log(`Plan for "${name}"`);
console.log(`  project     ${new URL(url).host}`);
console.log(`  workspace   https://${host}`);
console.log(`  owner       ${ownerEmail}`);
console.log(`  vertical    ${vertical} (${queues.length} queues: ${queues.map((q) => q.code).join(', ')})`);
console.log(`  modules     ${JSON.stringify(modules)}   timezone ${timezone}`);
if (!apply) {
  console.log('\nDry run only. Re-run with --apply to create it.');
  process.exit(0);
}

let tenantId = null;
let createdUserId = null;
try {
  const ins = async (table, row) => {
    const { data, error } = await db.from(table).insert(row).select().single();
    if (error) throw new Error(`${table}: ${error.message}`);
    return data;
  };
  // Owner: reuse an existing auth user, otherwise create one (confirmed, no password) and mint a
  // one-time invite link. Nothing is emailed by this script.
  let ownerId = null;
  for (let page = 1; page <= 20 && !ownerId; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`auth listUsers: ${error.message}`);
    ownerId = data.users.find((u) => (u.email ?? '').toLowerCase() === ownerEmail)?.id ?? null;
    if (data.users.length < 200) break;
  }
  let inviteLink = null;
  if (!ownerId) {
    const { data, error } = await db.auth.admin.generateLink({
      type: 'invite',
      email: ownerEmail,
      options: { redirectTo: `https://${host}/dashboard` },
    });
    if (error) throw new Error(`auth generateLink: ${error.message}`);
    ownerId = data.user.id;
    createdUserId = ownerId;
    inviteLink = data.properties?.action_link ?? null;
  }
  if (STELLAR) {
    const { data: prov, error: provErr } = await db.rpc('provision_stellar_tenant', { _business_name: name, _owner_email: ownerEmail, _owner_user_id: ownerId, _timezone: timezone });
    if (provErr) throw new Error(`provision_stellar_tenant: ${provErr.message}`);
    const row = Array.isArray(prov) ? prov[0] : prov;
    if (!row?.tenant_id) throw new Error('provision_stellar_tenant returned no tenant');
    tenantId = row.tenant_id;
    // The engine derives the slug from the business name and leaves the tenant in SETUP. The service role
    // cannot write tenants, so the plan slug must match what the engine produced.
    if (row.tenant_slug !== slug) {
      throw new Error(`provision_stellar_tenant produced slug "${row.tenant_slug}", not "${slug}" (tenant ${tenantId} was created and must be removed by the database owner)`);
    }
  } else {
    const tenant = await ins('ai4cc_tenants', { name, slug, timezone, status: 'active' });
    tenantId = tenant.id;
  }
  await ins('ai4cc_branding', {
    tenant_id: tenantId,
    company_name: str(intake.company_name) || name,
    product_name: str(intake.product_name) || 'Contact Center',
    support_email: str(intake.support_email) || null,
    settings: { modules, vertical },
  });
  // The Stellar database does not carry ai4cc_sites; queues there have a nullable site_id.
  const site = STELLAR ? { id: null } : await ins('ai4cc_sites', { tenant_id: tenantId, name: 'Main', code: 'main', timezone });
  const { error: qErr } = await db
    .from('ai4cc_queues')
    .insert(queues.map((q) => ({ ...q, tenant_id: tenantId, site_id: site.id, status: 'active' })));
  if (qErr) throw new Error(`ai4cc_queues: ${qErr.message}`);

  if (STELLAR) {
    // The provisioning engine created the OWNER membership for _owner_user_id (verified below).
  } else {
    const { error: mErr } = await db.from('ai4cc_tenant_members').insert({ tenant_id: tenantId, user_id: ownerId, role: 'owner' });
    if (mErr) throw new Error(`ai4cc_tenant_members: ${mErr.message}`);
  }

  if (phoneNumbers.length && STELLAR) {
    console.log('  note: phone numbers are not written in Stellar mode (service role cannot write tenant_phone_numbers); add them as the database owner');
  } else if (phoneNumbers.length) {
    const { error: pErr } = await db
      .from(STELLAR ? 'tenant_phone_numbers' : 'ai4cc_phone_numbers')
      .insert(phoneNumbers.map((e164) => (STELLAR ? { tenant_id: tenantId, e164_number: e164, provider: 'twilio', status: 'ACTIVE' } : { tenant_id: tenantId, e164, provider: 'twilio', purpose: 'inbound', status: 'active' })));
    if (pErr) throw new Error(`phone numbers: ${pErr.message}`);
  }

  const intakeKey = randomBytes(32).toString('hex');
  await ins('ai4cc_integrations', {
    tenant_id: tenantId,
    provider: 'elevenlabs',
    integration_type: 'intake_webhook',
    display_name: `${name} intake agent`,
    status: 'active',
    config: { key_sha256: createHash('sha256').update(intakeKey).digest('hex'), actor_user_id: ownerId },
    secret_reference: 'elevenlabs tool header x-ai4cc-intake-key',
  });

  // Verify: the new workspace starts empty and has exactly one member.
  const counts = {};
  for (const t of ['ai4cc_contacts', 'ai4cc_leads', 'ai4cc_interactions']) {
    const { count, error } = await db.from(t).select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId);
    if (error) throw new Error(`verify ${t}: ${error.message}`);
    counts[t] = count;
  }
  const { count: memberCount } = await db
    .from(T.members)
    .select('user_id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);
  if (Object.values(counts).some((c) => c !== 0) || memberCount !== 1) {
    throw new Error(`verification failed: ${JSON.stringify({ counts, memberCount })}`);
  }

  console.log(`\nCreated tenant ${tenantId}`);
  console.log(`  workspace  https://${host}  (needs DNS + Netlify domain alias before it resolves)`);
  console.log(`  webhook    https://${host}/api/intake/webhook   header: x-ai4cc-intake-key`);
  if (keyOut) {
    writeFileSync(keyOut, intakeKey, { mode: 0o600 });
    console.log(`  intake key written to ${keyOut} (not printed)`);
  } else {
    console.log(`  intake key (shown once, store it now): ${intakeKey}`);
  }
  if (inviteLink) console.log(`  owner invite link (one-time; send it to ${ownerEmail} yourself): ${inviteLink}`);
  else console.log(`  owner ${ownerEmail} already had an account and now has owner access.`);
  console.log('\nNext (manual/approved steps): DNS + domain alias, ElevenLabs agent from the vertical template, Twilio number, script tests, guides.');
} catch (err) {
  console.error('\nFAILED:', err.message);
  if (tenantId) {
    if (STELLAR) {
      console.error(`tenant ${tenantId} remains in the database (the service role cannot delete tenants); ask the database owner to remove it`);
    } else {
      const { error } = await db.from(T.tenants).delete().eq('id', tenantId);
      console.error(error ? `rollback of tenant failed: ${error.message}` : 'rolled back tenant (cascade)');
    }
  }
  if (createdUserId) {
    const { error } = await db.auth.admin.deleteUser(createdUserId);
    console.error(error ? `rollback of user failed: ${error.message}` : 'rolled back created user');
  }
  process.exit(1);
}
