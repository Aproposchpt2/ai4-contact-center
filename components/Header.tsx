import Link from 'next/link';
import { useRouter } from 'next/router';

const NAV = [
  { href: '/',           label: 'Home'      },
  { href: '/builder',    label: 'Builder'   },
  { href: '/designer',   label: 'Designer'  },
  { href: '/troubleshooter', label: 'Troubleshooter' },
  { href: '/routing-optimizer', label: 'Routing Optimizer' },
  { href: '/voice-attendant', label: 'Voice Attendant' },
  { href: '/agent-workspace', label: 'Agent Workspace' },
  { href: '/lead-management', label: 'Lead Management' },
  { href: '/customer-360', label: 'Customer 360' },
  { href: '/voicemails', label: 'Voicemails' },
  { href: '/analytics-engine', label: 'Analytics Engine' },
  { href: '/flow-simulator', label: 'Flow Simulator' },
  { href: '/flow-auto-repair', label: 'Flow Auto-Repair' },
  { href: '/flow-versioning', label: 'Flow Versioning' },
  { href: '/flow-deployment', label: 'Flow Deployment' },
  { href: '/flow-runtime-monitor', label: 'Runtime Monitor' },
  { href: '/transcript-intelligence', label: 'Transcript Intelligence' },
  { href: '/agent-coaching', label: 'Agent Coaching' },
  { href: '/intent-taxonomy', label: 'Intent Taxonomy' },
  { href: '/workforce-management', label: 'Workforce Management' },
  { href: '/quality-assurance', label: 'Quality Assurance' },
  { href: '/journey-designer', label: 'Journey Designer' },
  { href: '/flow-governance', label: 'Flow Governance' },
  { href: '/localization-engine', label: 'Localization Engine' },
  { href: '/data-lake', label: 'Data Lake' },
  { href: '/agent-assist', label: 'Agent Assist' },
  { href: '/experimentation', label: 'Experiments' },
  { href: '/cost-optimizer', label: 'Cost Optimizer' },
  { href: '/compliance-automation', label: 'Compliance Automation' },
  { href: '/integration-hub', label: 'Integration Hub' },
  { href: '/agent-skill-matrix', label: 'Agent Skill Matrix' },
  { href: '/flow-rewrite', label: 'Flow Rewrite' },
  { href: '/prompt-manager', label: 'Prompt Manager' },
  { href: '/knowledge-vault', label: 'Knowledge Vault' },
  { href: '/templates',  label: 'Templates'      },
  { href: '/dashboard',  label: 'Dashboard'      },
];

export default function Header() {
  const { pathname } = useRouter();

  return (
    <>
      <header className="siteHeader">
        <Link href="/" className="brand">
          <span className="brandMark">AI4</span>
          <span className="brandText">Contact Center</span>
        </Link>

        <nav className="navRail" aria-label="Primary navigation">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={pathname === href ? 'navLink active' : 'navLink'}
            >
              {label}
            </Link>
          ))}
        </nav>

        <Link href="/builder" className="builderCta">
          Open Builder →
        </Link>
      </header>

      <style jsx>{`
        .siteHeader {
          position: sticky;
          top: 0;
          z-index: 100;
          width: 100%;
          max-width: 100vw;
          min-width: 0;
          height: 60px;
          padding: 0 clamp(.75rem, 2.4vw, 2rem);
          display: flex;
          align-items: center;
          gap: 1rem;
          overflow: hidden;
          background: rgba(7,26,60,.96);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255,255,255,.13);
        }
        :global(.brand) {
          display: flex;
          align-items: center;
          gap: .7rem;
          flex: 0 0 auto;
          text-decoration: none;
        }
        .brandMark {
          width: 30px;
          height: 30px;
          border-radius: 6px;
          background: linear-gradient(135deg,#E8CB87,#D5AE55);
          display: grid;
          place-items: center;
          font-size: .65rem;
          font-weight: 900;
          color: #071A3C;
          letter-spacing: .06em;
        }
        .brandText {
          font-size: .78rem;
          font-weight: 700;
          color: #EEF3FF;
          letter-spacing: .04em;
          white-space: nowrap;
        }
        .navRail {
          flex: 1 1 auto;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 1.35rem;
          overflow-x: auto;
          overflow-y: hidden;
          overscroll-behavior-x: contain;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          mask-image: linear-gradient(to right, transparent 0, #000 12px, #000 calc(100% - 12px), transparent 100%);
        }
        .navRail::-webkit-scrollbar { display: none; }
        :global(.navLink),
        :global(.navLink:visited) {
          flex: 0 0 auto;
          padding: 20px 0 4px;
          border-bottom: 1px solid transparent;
          color: rgba(255,255,255,.58);
          font-size: .7rem;
          font-weight: 600;
          line-height: 1;
          letter-spacing: .1em;
          text-transform: uppercase;
          text-decoration: none;
          white-space: nowrap;
        }
        :global(.navLink:hover) {
          color: #EEF3FF;
          text-decoration: none;
        }
        :global(.navLink.active),
        :global(.navLink.active:visited) {
          color: #E8CB87;
          border-bottom-color: #D5AE55;
        }
        :global(.builderCta),
        :global(.builderCta:visited) {
          flex: 0 0 auto;
          padding: .55rem 1rem;
          border-radius: 6px;
          background: #D5AE55;
          color: #071A3C;
          font-size: .7rem;
          font-weight: 800;
          letter-spacing: .1em;
          text-transform: uppercase;
          text-decoration: none;
          white-space: nowrap;
        }
        :global(.builderCta:hover) {
          text-decoration: none;
          filter: brightness(1.05);
        }
        @media (max-width: 1180px) {
          :global(.builderCta) { display: none; }
        }
        @media (max-width: 700px) {
          .siteHeader { gap: .7rem; padding-inline: .65rem; }
          .brandText { display: none; }
          .navRail { gap: 1rem; }
          :global(.navLink) { font-size: .66rem; letter-spacing: .08em; }
        }
      `}</style>
    </>
  );
}
