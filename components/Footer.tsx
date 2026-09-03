import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid rgba(200,169,107,.14)',
      padding: '2.75rem clamp(1.5rem,4vw,3rem)',
      background: '#01050D',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.015)',
    }}>
      <div style={{
        maxWidth: '1100px', margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '2rem',
        marginBottom: '2rem',
      }}>
        <div>
          <div style={{ fontSize: '.72rem', fontWeight: 900, color: '#E2CEA2', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '.5rem' }}>
            AI4 Contact Center
          </div>
          <p style={{ fontSize: '.78rem', color: '#8F9CAF', lineHeight: 1.7 }}>
            AI-powered call flow engineering for modern contact centers.
          </p>
          <p style={{ fontSize: '.72rem', color: '#7D899C', marginTop: '.5rem' }}>
            Apropos Group LLC
          </p>
        </div>

        <div>
          <div style={{ fontSize: '.62rem', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#C8A96B', marginBottom: '.8rem' }}>Product</div>
          {[
            { href: '/builder',   label: 'Script Builder' },
            { href: '/templates', label: 'Templates'      },
            { href: '/dashboard', label: 'Dashboard'      },
          ].map(({ href, label }) => (
            <div key={href} style={{ marginBottom: '.4rem' }}>
              <Link href={href} style={{ fontSize: '.8rem', color: '#9CA8BA', textDecoration: 'none' }}>{label}</Link>
            </div>
          ))}
        </div>

        <div>
          <div style={{ fontSize: '.62rem', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#C8A96B', marginBottom: '.8rem' }}>Company</div>
          {[
            { href: 'https://aproposgroupllc.com', label: 'Apropos Group LLC' },
            { href: 'https://aibizcenter.aproposgroupllc.com', label: 'Business Center' },
          ].map(({ href, label }) => (
            <div key={href} style={{ marginBottom: '.4rem' }}>
              <a href={href} target="_blank" rel="noopener" style={{ fontSize: '.8rem', color: '#9CA8BA', textDecoration: 'none' }}>{label}</a>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,.07)', paddingTop: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.5rem' }}>
        <span style={{ fontSize: '.72rem', color: '#7D899C' }}>
          © 2026 Apropos Group LLC · AI4 Contact Center Engineering Suite
        </span>
        <span style={{ fontSize: '.68rem', color: '#657187', fontStyle: 'italic' }}>
          MVP v1.0 · July 2026
        </span>
      </div>
    </footer>
  );
}
