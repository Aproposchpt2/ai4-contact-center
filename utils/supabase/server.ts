/**
 * Server-side Supabase client for Pages Router
 * Use inside getServerSideProps, getStaticProps, or API routes.
 *
 * Usage in getServerSideProps:
 *   const supabase = createClient(req, res)
 *   const { data } = await supabase.from('flows').select()
 *
 * Usage in API routes:
 *   const supabase = createClient(req, res)
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { IncomingMessage, ServerResponse } from 'http';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export function createClient(req: IncomingMessage & { cookies: Partial<{ [key: string]: string }> }, res: ServerResponse) {
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return Object.entries(req.cookies ?? {}).map(([name, value]) => ({
          name,
          value: value ?? '',
        }));
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          const serialized = `${name}=${value}; Path=/; HttpOnly; SameSite=Lax${
            options?.maxAge ? `; Max-Age=${options.maxAge}` : ''
          }${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
          const existing = res.getHeader('Set-Cookie');
          const current = Array.isArray(existing) ? existing : existing ? [String(existing)] : [];
          res.setHeader('Set-Cookie', [...current, serialized]);
        });
      },
    },
  });
}
