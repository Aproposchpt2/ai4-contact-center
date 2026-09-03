import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

type Theme = 'light' | 'black';

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
  const [theme, setTheme] = useState<Theme>('black');

  useEffect(() => {
    const current = document.documentElement.dataset.theme === 'light' ? 'light' : 'black';
    setTheme(current);
  }, []);

  const applyTheme = (next: Theme) => {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('ai4-theme', next); } catch (_) {}
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    themeMeta?.setAttribute('content', next === 'light' ? '#F4F2ED' : '#01050D');
  };

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

        <div className="themeSwitch" role="group" aria-label="Color theme">
          <button
            type="button"
            className={theme === 'light' ? 'themeOption activeTheme' : 'themeOption'}
            aria-pressed={theme === 'light'}
            onClick={() => applyTheme('light')}
          >
            ◐ LIGHT
          </button>
          <span className="themeDivider" aria-hidden="true">/</span>
          <button
            type="button"
            className={theme === 'black' ? 'themeOption activeTheme' : 'themeOption'}
            aria-pressed={theme === 'black'}
            onClick={() => applyTheme('black')}
          >
            ◑ BLACK
          </button>
        </div>

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
          background: rgba(1,5,13,.965);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(200,169,107,.14);
          box-shadow: 0 12px 36px rgba(0,0,0,.22);
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
          background: linear-gradient(145deg,#07142F,#030A18);
          border: 1px solid rgba(200,169,107,.58);
          display: grid;
          place-items: center;
          font-size: .65rem;
          font-weight: 900;
          color: #E2CEA2;
          letter-spacing: .06em;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.025),0 8px 24px rgba(0,0,0,.28);
        }
        .brandText {
          font-family: Georgia, "Times New Roman", serif;
          font-size: .86rem;
          font-weight: 400;
          color: #F5F7FA;
          letter-spacing: .02em;
          white-space: nowrap;
        }
        .navRail {
          flex: 1 1 auto;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 1.35rem;
          padding-left: 4px;
          scroll-padding-left: 4px;
          overflow-x: auto;
          overflow-y: hidden;
          overscroll-behavior-x: contain;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          mask-image: linear-gradient(to right, #000 0, #000 calc(100% - 12px), transparent 100%);
          -webkit-mask-image: linear-gradient(to right, #000 0, #000 calc(100% - 12px), transparent 100%);
        }
        .navRail::-webkit-scrollbar { display: none; }
        :global(.navLink),
        :global(.navLink:visited) {
          flex: 0 0 auto;
          padding: 20px 0 4px;
          border-bottom: 1px solid transparent;
          color: #8F9CAF;
          font-size: .7rem;
          font-weight: 600;
          line-height: 1;
          letter-spacing: .1em;
          text-transform: uppercase;
          text-decoration: none;
          white-space: nowrap;
        }
        :global(.navLink:hover) {
          color: #F5F7FA;
          text-decoration: none;
        }
        :global(.navLink.active),
        :global(.navLink.active:visited) {
          color: #E2CEA2;
          border-bottom-color: #C8A96B;
        }
        .themeSwitch {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 3px;
          border: 1px solid rgba(200,169,107,.24);
          border-radius: 7px;
          background: rgba(255,255,255,.025);
        }
        .themeOption {
          min-height: 28px;
          padding: 0 .52rem;
          border: 1px solid transparent;
          border-radius: 5px;
          background: transparent;
          color: #7D899C;
          cursor: pointer;
          font-size: .58rem;
          font-weight: 800;
          line-height: 1;
          letter-spacing: .08em;
          white-space: nowrap;
        }
        .themeOption:hover { color: #F5F7FA; }
        .themeOption.activeTheme {
          color: #E2CEA2;
          border-color: rgba(200,169,107,.34);
          background: rgba(200,169,107,.07);
        }
        .themeDivider {
          color: rgba(125,137,156,.58);
          font-size: .62rem;
          user-select: none;
        }
        :global(.builderCta),
        :global(.builderCta:visited) {
          flex: 0 0 auto;
          padding: .55rem 1rem;
          border-radius: 6px;
          background: transparent;
          color: #E2CEA2;
          border: 1px solid rgba(200,169,107,.48);
          font-size: .7rem;
          font-weight: 800;
          letter-spacing: .1em;
          text-transform: uppercase;
          text-decoration: none;
          white-space: nowrap;
        }
        :global(.builderCta:hover) {
          text-decoration: none;
          background: rgba(200,169,107,.08);
          color: #F5F7FA;
        }
        @media (max-width: 1260px) {
          :global(.builderCta) { display: none; }
        }
        @media (max-width: 820px) {
          .themeOption { padding-inline: .42rem; }
          .siteHeader { gap: .72rem; }
        }
        @media (max-width: 700px) {
          .siteHeader { gap: .55rem; padding-inline: .65rem; }
          .brandText { display: none; }
          .navRail { gap: 1rem; }
          :global(.navLink) { font-size: .66rem; letter-spacing: .08em; }
          .themeOption { font-size: .54rem; padding-inline: .34rem; }
        }
        @media (max-width: 470px) {
          .themeDivider { display: none; }
          .themeSwitch { gap: 0; }
          .themeOption { padding-inline: .3rem; }
        }
      `}</style>
    </>
  );
}
