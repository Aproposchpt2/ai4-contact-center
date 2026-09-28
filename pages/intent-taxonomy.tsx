import Head from 'next/head';
import Header from '@/components/Header';
import IntentTaxonomyDashboard from '@/components/IntentTaxonomyDashboard';

export default function IntentTaxonomyPage() {
  return (
    <>
      <Head>
        <title>Intent Taxonomy Manager – Stellar Unified Communications</title>
      </Head>
      <Header />
      <main className="min-h-screen bg-gray-50 py-8">
        <IntentTaxonomyDashboard />
      </main>
    </>
  );
}
