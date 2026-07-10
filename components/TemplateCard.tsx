import { CallFlowTemplate } from '@/lib/templates';

interface Props {
  template: CallFlowTemplate;
  onLoad: (description: string) => void;
}

const INDUSTRY_COLORS: Record<string, string> = {
  'Higher Education': '#7c3aed',
  'Healthcare':       '#059669',
  'Retail':           '#d97706',
  'Government':       '#1d4ed8',
  'Finance':          '#0891b2',
  'Real Estate':      '#be185d',
};

export default function TemplateCard({ template, onLoad }: Props) {
  const color = INDUSTRY_COLORS[template.industry] || '#5bd3ff';

  return (
    <div style={{
      background: 'rgba(255,255,255,.03)',
      border: '1px solid rgba(255,255,255,.08)',
      borderRadius: '10px',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '.8rem',
      transition: 'border-color .2s, background .2s',
      cursor: 'default',
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLDivElement).style.borderColor = color + '66';
      (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,.05)';
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,.08)';
      (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,.03)';
    }}
    >
      {/* Tag */}
      <span style={{
        display: 'inline-block',
        fontSize: '.6rem', fontWeight: 700,
        letterSpacing: '.14em', textTransform: 'uppercase',
        color, background: color + '1a',
        border: `1px solid ${color}44`,
        borderRadius: '999px', padding: '.2rem .7rem',
        alignSelf: 'flex-start',
      }}>
        {template.industry}
      </span>

      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', lineHeight: 1.2, margin: 0 }}>
        {template.name}
      </h3>
      <p style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.4)', lineHeight: 1.6, margin: 0 }}>
        {template.preview}
      </p>

      <button
        onClick={() => onLoad(template.description)}
        style={{
          marginTop: 'auto',
          background: color + '22',
          border: `1px solid ${color}55`,
          color,
          borderRadius: '6px',
          padding: '.6rem 1rem',
          fontSize: '.72rem', fontWeight: 700,
          letterSpacing: '.12em', textTransform: 'uppercase',
          cursor: 'pointer',
          transition: 'background .2s',
        }}
      >
        Load Template →
      </button>
    </div>
  );
}
