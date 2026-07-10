import Link from 'next/link';
import { useRouter } from 'next/router';

const NAV = [
  { href: '/',           label: 'Home'      },
  { href: '/builder',    label: 'Builder'   },
  { href: '/designer',   label: 'Designer'  },
  { href: '/troubleshooter', label: 'Troubleshooter' },
  { href: '/routing-optimizer', label: 'Routing Optimizer' },
  { href: '/prompt-manager', label: 'Prompt Manager' },
  { href: '/knowledge-vault', label: 'Knowledge Vault' },
  { href: '/templates',  label: 'Templates' },
  { href: '/dashboard',  label: 'Dashboard' },
];

export default function Header() {
  const { pathname } = useRouter();

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(6,17,31,.92)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,.08)',
      padding: '0 clamp(1.5rem,4vw,3rem)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: '60px',
    }}>
      {/* Brand */}
      <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '.7rem' }}>
        <span style={{
          width: '30px', height: '30px', borderRadius: '6px',
          background: 'linear-gradient(135deg,#5bd3ff,#0078d4)',
          display: 'grid', placeItems: 'center',
          fontSize: '.65rem', fontWeight: 900, color: '#06111f',
          letterSpacing: '.06em',
        }}>AI4</span>
        <span style={{ fontSize: '.78rem', fontWeight: 700, color: '#fff', letterSpacing: '.04em' }}>
          Contact Center
        </span>
      </Link>

      {/* Nav */}
      <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            style={{
              fontSize: '.75rem', fontWeight: 600,
              letterSpacing: '.12em', textTransform: 'uppercase',
              textDecoration: 'none',
              color: pathname === href ? '#5bd3ff' : 'rgba(255,255,255,.5)',
              borderBottom: pathname === href ? '1px solid #5bd3ff' : '1px solid transparent',
              paddingBottom: '2px',
              transition: 'color .2s',
            }}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* CTA */}
      <Link
        href="/builder"
        style={{
          background: '#5bd3ff', color: '#06111f',
          fontWeight: 800, fontSize: '.72rem',
          letterSpacing: '.14em', textTransform: 'uppercase',
          textDecoration: 'none',
          padding: '.55rem 1.2rem', borderRadius: '5px',
        }}
      >
        Open Builder →
      </Link>
    </header>
  );
}
