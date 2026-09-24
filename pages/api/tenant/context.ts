import type { NextApiRequest, NextApiResponse } from 'next';
import { apiErrorMessage, apiErrorStatus, requireAi4ccContext } from '@/lib/ai4ccServer';
import { resolveModules } from '@/lib/modules';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  try {
    const ctx = await requireAi4ccContext(req);
    const [tenantResult, brandingResult] = await Promise.all([
      ctx.admin.from('ai4cc_tenants').select('id,name,slug,timezone').eq('id', ctx.tenantId).single(),
      ctx.admin.from('ai4cc_branding').select('product_name,company_name,logo_url,support_email,settings').eq('tenant_id', ctx.tenantId).maybeSingle(),
    ]);
    if (tenantResult.error) throw tenantResult.error;
    if (brandingResult.error) throw brandingResult.error;
    const tenant = tenantResult.data;
    const branding = brandingResult.data;
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({
      tenant: { name: tenant.name, slug: tenant.slug, timezone: tenant.timezone },
      role: ctx.role,
      branding: branding
        ? { productName: branding.product_name, companyName: branding.company_name, logoUrl: branding.logo_url, supportEmail: branding.support_email }
        : null,
      modules: resolveModules(branding?.settings, tenant.slug),
    });
  } catch (error) {
    const status = apiErrorStatus(error);
    if (status === 500) console.error('[tenant/context] failed', error);
    return res.status(status).json({ error: status === 500 ? 'Could not load workspace' : apiErrorMessage(error) });
  }
}
