import Head from 'next/head';
import { useRouter } from 'next/router';

const pages: Record<string, { title: string; description: string }> = {
  "/": {
    "title": "24/7 Sales Service System & CRM | StellarUC",
    "description": "Keep sales open 24/7 with intelligent call engagement, lead management, Customer 360 and human follow-up. Request a personal consultation to discuss transparent usage-based pricing."
  },
  "/platform": {
    "title": "Sales Platform, Lead Management & Customer 360 | StellarUC",
    "description": "Explore StellarUC voice, SMS, web chat, lead management, Customer 360, agent workspaces, analytics and governed sales workflows."
  },
  "/demo": {
    "title": "Live Sales Service Demo | StellarUC",
    "description": "Call the StellarUC live demo to experience intelligent sales intake and see how a conversation becomes a lead with customer context and follow-up."
  },
  "/partners": {
    "title": "Sales Engagement Platform for BPOs, MSPs & Agencies | StellarUC",
    "description": "Explore the StellarUC platform for BPOs, MSPs and agencies: multichannel engagement, lead management, Customer 360 and a live intake demonstration."
  },
  "/acquisition": {
    "title": "Customer Engagement Platform Overview | StellarUC",
    "description": "Review StellarUC customer engagement, voice, SMS, web chat, lead workflows, Customer 360 and platform operations."
  },
  "/platform/flow-authoring": {
    "title": "Flow Design & Automation | StellarUC",
    "description": "Explore flow design & automation in the StellarUC Customer Engagement Operations Center and connected sales platform."
  },
  "/platform/governance-platform": {
    "title": "Governance & Tenant Controls | StellarUC",
    "description": "Explore governance & tenant controls in the StellarUC Customer Engagement Operations Center and connected sales platform."
  },
  "/platform/intelligence-qa": {
    "title": "Conversation Analytics & Quality | StellarUC",
    "description": "Explore conversation analytics & quality in the StellarUC Customer Engagement Operations Center and connected sales platform."
  },
  "/platform/live-operations": {
    "title": "Live Sales Operations & Customer 360 | StellarUC",
    "description": "Explore live sales operations & customer 360 in the StellarUC Customer Engagement Operations Center and connected sales platform."
  }
};
const origin = 'https://stellaruc.com';
export default function SearchMetadata() {
  const { pathname } = useRouter();
  const page = pages[pathname];
  if (!page) return <Head><meta name="robots" content="noindex,follow" key="robots" /></Head>;
  const url = origin + (pathname === '/' ? '/' : pathname);
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': origin + '/#organization', name: 'Apropos Group LLC', url: 'https://aproposgroupllc.com/' },
      { '@type': 'WebSite', '@id': origin + '/#website', name: 'StellarUC', url: origin + '/', publisher: { '@id': origin + '/#organization' } },
      { '@type': 'WebPage', '@id': url + '#webpage', url, name: page.title, description: page.description, isPartOf: { '@id': origin + '/#website' } },
      ...(pathname === '/' || pathname === '/platform' ? [{
        '@type': 'Service', '@id': origin + '/#sales-service', name: 'Sales Service System', url: origin + '/',
        provider: { '@id': origin + '/#organization' },
        serviceType: '24/7 sales engagement, lead management and Customer 360',
        description: 'Around-the-clock inbound sales engagement with lead capture, customer context and human follow-up. Customers pay for platform access and actual monthly usage.'
      }] : [])
    ]
  };
  return <Head>
    <title>{page.title}</title>
    <meta name="description" content={page.description} key="description" />
    <meta name="robots" content="index,follow,max-image-preview:large" key="robots" />
    <link rel="canonical" href={url} key="canonical" />
    <meta property="og:site_name" content="StellarUC" key="og:site_name" />
    <meta property="og:type" content="website" key="og:type" />
    <meta property="og:title" content={page.title} key="og:title" />
    <meta property="og:description" content={page.description} key="og:description" />
    <meta property="og:url" content={url} key="og:url" />
    <meta property="og:image" content={origin + '/images/hero-embedded.png'} key="og:image" />
    <meta property="og:image:alt" content="StellarUC intelligent customer engagement" key="og:image:alt" />
    <meta name="twitter:card" content="summary_large_image" key="twitter:card" />
    <meta name="twitter:image" content={origin + '/images/hero-embedded.png'} key="twitter:image" />
    <meta name="twitter:image:alt" content="StellarUC intelligent customer engagement" key="twitter:image:alt" />
    <meta name="twitter:title" content={page.title} key="twitter:title" />
    <meta name="twitter:description" content={page.description} key="twitter:description" />
    <script type="application/ld+json" key="search-schema" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
  </Head>;
}
