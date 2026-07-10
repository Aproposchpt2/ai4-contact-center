import type { LogicNodeType } from '@/lib/logicTypes';

type Props = {
  onAddNode: (type: LogicNodeType) => void;
};

const BUTTONS: Array<{ type: LogicNodeType; label: string }> = [
  { type: 'menu', label: 'Add Menu' },
  { type: 'option', label: 'Add Option' },
  { type: 'queue', label: 'Add Queue' },
  { type: 'prompt', label: 'Add Prompt' },
  { type: 'after_hours', label: 'Add After-Hours' },
  { type: 'holiday', label: 'Add Holiday' },
];

export default function NodeMenu({ onAddNode }: Props) {
  return (
    <div style={{ display: 'grid', gap: '.5rem' }}>
      {BUTTONS.map((button) => (
        <button
          key={button.type}
          onClick={() => onAddNode(button.type)}
          style={{
            background: 'rgba(91,211,255,.08)',
            color: '#e8f0fe',
            border: '1px solid rgba(91,211,255,.25)',
            borderRadius: '6px',
            padding: '.6rem .8rem',
            textAlign: 'left',
            fontSize: '.82rem',
            cursor: 'pointer',
          }}
        >
          {button.label}
        </button>
      ))}
    </div>
  );
}

