// Validates supabase/baseline/00_ai4cc_baseline.sql on an in-process Postgres (PGlite) with Supabase
// role/auth stubs, then checks RLS tenant isolation. Not a repo dependency - run with:
//   npm i --no-save @electric-sql/pglite && node scripts/validate-baseline.mjs
import { PGlite } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFileSync } from 'node:fs';
const db = new PGlite({ extensions: { citext, pgcrypto } });
// Supabase stubs: roles, auth schema, auth.uid(), auth.users
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
`);
const sql = readFileSync(new URL('../supabase/baseline/00_ai4cc_baseline.sql', import.meta.url), 'utf8');
try { await db.exec(sql); console.log('BASELINE APPLIED OK'); } catch (e) { console.log('BASELINE FAILED:', e.message); process.exit(1); }
const q = async (s) => (await db.query(s)).rows;
console.log('tables', (await q("select count(*)::int c from pg_tables where schemaname='public'"))[0].c);
console.log('policies', (await q("select count(*)::int c from pg_policies where schemaname='public'"))[0].c);
console.log('rls-off tables', await q("select tablename from pg_tables where schemaname='public' and not rowsecurity"));
console.log('anon table grants', (await q("select count(*)::int c from information_schema.role_table_grants where table_schema='public' and grantee='anon'"))[0].c);
// functional isolation test with RLS as an authenticated user
await db.exec(`
  insert into auth.users(id,email) values ('11111111-1111-1111-1111-111111111111','a@x'),('22222222-2222-2222-2222-222222222222','b@x');
  insert into ai4cc_tenants(id,name,slug) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','A','acme'),('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','B','beta');
  insert into ai4cc_tenant_members(tenant_id,user_id,role) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','owner'),('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','22222222-2222-2222-2222-222222222222','owner');
  insert into ai4cc_contacts(tenant_id,display_name,email) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','A contact','a@x'),('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','B contact','b@x');
`).catch(e=>console.log('seed note:', e.message.slice(0,200)));
await db.exec(`grant usage on schema public to authenticated, anon; grant select, insert, update, delete on all tables in schema public to authenticated;`);
await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);`);
console.log('user A sees contacts:', await q("select display_name from ai4cc_contacts").catch(e=>e.message));
await db.exec(`select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);`);
console.log('user B sees contacts:', await q("select display_name from ai4cc_contacts").catch(e=>e.message));
await db.exec(`select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);`);
console.log('user B insert into tenant A (expect denied):', await db.query("insert into ai4cc_contacts(tenant_id,display_name) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','evil')").then(()=>'ALLOWED (BAD)').catch(e=>'denied: '+e.message.slice(0,60)));
await db.exec(`reset role; set role anon;`);
console.log('anon:', await q("select 1 from ai4cc_contacts").catch(e=>'DENIED: '+e.message));
