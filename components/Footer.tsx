import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid rgba(255,255,255,.08)',
      padding: '2.5rem clamp(1.5rem,4vw,3rem)',
      background: '#06111f',
    }}>
      <div style={{
        maxWidth: '1100px', margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '2rem',
        marginBottom: '2rem',
      }}>
        {/* Brand */}
        <div>
          <div style={{ fontSize: '.72rem', fontWeight: 900, color: '#5bd3ff', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '.5rem' }}>
            AI4 Contact Center
          </div>
          <p style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.4)', lineHeight: 1.7 }}>
            AI-powered call flow engineering for modern contact centers.
          </p>
          <p style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.25)', marginTop: '.5rem' }}>
            Apropos Group LLC
          </p>
        </div>

        {/* Product */}
        <div>
          <div style={{ fontSize: '.62rem', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)', marginBottom: '.8rem' }}>Product</div>
          {[
            { href: '/builder',   label: 'Script Builder' },
            { href: '/templates', label: 'Templates'      },
            { href: '/dashboard', label: 'Dashboard'      },
          ].map(({ href, label }) => (
            <div key={href} style={{ marginBottom: '.4rem' }}>
              <Link href={href} style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.45)', textDecoration: 'none' }}>{label}</Link>
            </div>
          ))}
        </div>

        {/* Company */}
        <div>
          <div style={{ fontSize: '.62rem', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)', marginBottom: '.8rem' }}>Company</div>
          {[
            { href: 'https://aproposgroupllc.com', label: 'Apropos Group LLC' },
            { href: 'https://aibizcenter.aproposgroupllc.com', label: 'Business Center' },
          ].map(({ href, label }) => (
            <div key={href} style={{ marginBottom: '.4rem' }}>
              <a href={href} target="_blank" rel="noopener" style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.45)', textDecoration: 'none' }}>{label}</a>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.5rem' }}>
        <span style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.25)' }}>
          © 2026 Apropos Group LLC · AI4 Contact Center Engineering Suite
        </span>
        <span style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.18)', fontStyle: 'italic' }}>
          MVP v1.0 · July 2026
        </span>
      </div>
    </footer>
  );
}
