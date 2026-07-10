import type { AnalysisReport } from '@/lib/analyzer';

type Props = {
  report: AnalysisReport;
};

function Section({
  title,
  items,
  color,
}: {
  title: string;
  items: string[];
  color: string;
}) {
  return (
    <section
      style={{
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.1)',
        borderRadius: '8px',
        padding: '1rem',
      }}
    >
      <h3
        style={{
          margin: '0 0 .6rem 0',
          fontSize: '.78rem',
          textTransform: 'uppercase',
          letterSpacing: '.14em',
          color,
        }}
      >
        {title}
      </h3>
      {items.length === 0 ? (
        <p style={{ margin: 0, color: 'rgba(255,255,255,.45)', fontSize: '.85rem' }}>None</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
          {items.map((item, idx) => (
            <li key={`${title}-${idx}`} style={{ color: 'rgba(255,255,255,.85)', marginBottom: '.35rem', fontSize: '.9rem' }}>
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function ReportViewer({ report }: Props) {
  return (
    <div style={{ display: 'grid', gap: '.8rem' }}>
      <Section title="Errors" items={report.errors} color="#ff8f8f" />
      <Section title="Warnings" items={report.warnings} color="#fbbf24" />
      <Section title="Recommendations" items={report.recommendations} color="#5bd3ff" />
    </div>
  );
}

