import { useRouter } from 'next/router';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TemplateCard from '@/components/TemplateCard';
import { TEMPLATES } from '@/lib/templates';

export default function TemplatesPage() {
  const router = useRouter();

  function handleLoad(description: string, name: string) {
    router.push(`/builder?text=${encodeURIComponent(description)}&name=${encodeURIComponent(name)}`);
  }

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', background: '#06111f', color: '#e8f0fe', fontFamily: "'Inter', 'Jost', sans-serif", padding: '3rem clamp(1.5rem,4vw,3rem)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: '2.8rem' }}>
            <p style={{ fontSize: '.66rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '.4rem' }}>
              AI4 Contact Center · Template Library
            </p>
            <h1 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.6rem)', fontWeight: 700, lineHeight: 1.1, margin: '0 0 .6rem', color: '#fff' }}>
              Industry Templates
            </h1>
            <p style={{ color: 'rgba(255,255,255,.45)', fontSize: '.92rem', maxWidth: '560px', lineHeight: 1.7 }}>
              Pre-built call flow templates for six industries. Click <strong style={{ color: 'rgba(255,255,255,.7)' }}>Load Template</strong> to open it in the Script Builder — then customize for your organization.
            </p>
          </div>

          {/* Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1rem',
          }}>
            {TEMPLATES.map(t => (
              <TemplateCard
                key={t.id}
                template={t}
                onLoad={(desc) => handleLoad(desc, t.name)}
              />
            ))}
          </div>

          {/* Tip */}
          <div style={{ marginTop: '3rem', padding: '1.2rem 1.5rem', background: 'rgba(91,211,255,.04)', border: '1px solid rgba(91,211,255,.15)', borderRadius: '8px' }}>
            <p style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.45)', margin: 0, lineHeight: 1.7 }}>
              <strong style={{ color: '#5bd3ff' }}>Tip:</strong> Templates are starting points. After loading, edit the description to match your exact routing rules — add queues, change menu options, adjust hours — then generate again.
            </p>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
