'use strict';
const STAGING_URL = 'https://hvzauakkhlivzeqatfqm.supabase.co';
const STAGING_TENANT = '5885a020-d363-4c27-910a-c035eda132f5';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function readiness(env) {
  if (env.STELLAR_BRIDGE_STAGING !== 'true' && env.RAILWAY_ENVIRONMENT_NAME !== 'staging') return 'NOT_STAGING';
  if (env.STAGING_SUPPORT_WRITES_ENABLED !== 'true') return 'STAGING_WRITES_DISABLED';
  if (env.STAGING_SUPABASE_URL !== STAGING_URL || env.CSS_TENANT_ID !== STAGING_TENANT) return 'STAGING_TARGET_REJECTED';
  if (!env.STAGING_SUPABASE_SERVICE_ROLE_KEY) return 'STAGING_DATABASE_CREDENTIAL_MISSING';
  return 'READY';
}
async function submitStagingSupport(args, callSid, env = process.env, request = fetch) {
  const ready = readiness(env);
  if (ready !== 'READY') throw new Error(ready);
  if (!/^CA[0-9a-f]{32}$/i.test(callSid)) throw new Error('INVALID_STAGING_CALL_ID');
  const limits = {name:150,email:254,phone:40,product:160,purchaseDate:10,issue:2000,steps:2000,impact:2000,priority:10};
  if (!args || typeof args !== 'object' || Array.isArray(args) || Object.keys(args).some(k=>!Object.hasOwn(limits,k))) throw new Error('INVALID_SUPPORT_ARGUMENTS');
  const clean = {};
  for (const [field,max] of Object.entries(limits)) {
    if (typeof args[field] !== 'string' || args[field].length > max) throw new Error('INVALID_SUPPORT_ARGUMENTS');
    clean[field] = args[field].trim();
  }
  if (clean.name.length<2 || clean.product.length<2 || clean.issue.length<10 || (!clean.email && !clean.phone) ||
      !['LOW','NORMAL','HIGH','URGENT'].includes(clean.priority) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(clean.purchaseDate) ||
      Number.isNaN(Date.parse(clean.purchaseDate)) || new Date(clean.purchaseDate).toISOString().slice(0,10)!==clean.purchaseDate)
    throw new Error('INVALID_SUPPORT_ARGUMENTS');
  const payload = {p_tenant_id:STAGING_TENANT,p_session_id:`phone-staging:${callSid}`,p_name:clean.name,p_email:clean.email,
    p_phone:clean.phone,p_product:clean.product,p_purchase_date:clean.purchaseDate,p_issue:clean.issue,
    p_steps:clean.steps,p_impact:clean.impact,p_priority:clean.priority};
  let response;
  try {
    response = await request(`${STAGING_URL}/rest/v1/rpc/stellar_create_phone_support_test_intake`, {
      method:'POST', headers:{'content-type':'application/json',apikey:env.STAGING_SUPABASE_SERVICE_ROLE_KEY,
        authorization:`Bearer ${env.STAGING_SUPABASE_SERVICE_ROLE_KEY}`},
      body:JSON.stringify(payload),signal:AbortSignal.timeout(10000),
    });
  } catch { throw new Error('STAGING_SAVE_NOT_CONFIRMED'); }
  if (!response.ok) throw new Error('STAGING_SAVE_NOT_CONFIRMED');
  let rows; try { rows=await response.json(); } catch { throw new Error('STAGING_SAVE_NOT_CONFIRMED'); }
  const row = Array.isArray(rows) && rows.length===1 ? rows[0] : null;
  if (!row || !UUID.test(row.customer_id) || !UUID.test(row.case_id) || typeof row.created_new!=='boolean') throw new Error('STAGING_SAVE_NOT_CONFIRMED');
  return {success:true,customerId:row.customer_id,caseId:row.case_id,createdNew:row.created_new,testOnly:true,
    notificationSent:false,technicianFollowupConfirmed:false};
}
module.exports={readiness,submitStagingSupport};
