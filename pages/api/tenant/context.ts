import type { NextApiRequest, NextApiResponse } from 'next';
import { HOME_TENANT_SLUG, apiErrorMessage, apiErrorStatus, requireAi4ccContext } from '@/lib/ai4ccServer';
import { tenantById } from '@/lib/tenantModel';
import { resolveModules } from '@/lib/modules';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  try {
    const ctx = await requireAi4ccContext(req);
    const [tenantResult, brandingResult] = await Promise.all([
      tenantById(ctx.admin, ctx.tenantId).then((data) => ({ data, error: data ? null : new Error('Tenant not found') })),
      ctx.admin.from('ai4cc_branding').select('product_name,company_name,logo_url,support_email,settings').eq('tenant_id', ctx.tenantId).maybeSingle(),
    ]);
    if (tenantResult.error) throw tenantResult.error;
    if (brandingResult.error) throw brandingResult.error;
    const tenant = tenantResult.data;
    if (!tenant) throw new Error('Tenant not found');
    const branding = brandingResult.data;
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({
      tenant: { name: tenant.name, slug: tenant.slug, timezone: tenant.timezone },
      role: ctx.role,
      isHome: tenant.slug === HOME_TENANT_SLUG,
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
