import type { LogicNode } from '@/lib/logicTypes';

type Props = {
  node: LogicNode | null;
  onChange: (nodeId: string, dataPatch: Record<string, string | number>) => void;
};

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number';
}) {
  return (
    <label style={{ display: 'block', marginBottom: '.7rem' }}>
      <span style={{ display: 'block', marginBottom: '.25rem', fontSize: '.72rem', color: 'rgba(255,255,255,.7)' }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          background: 'rgba(255,255,255,.04)',
          border: '1px solid rgba(255,255,255,.14)',
          color: '#e8f0fe',
          borderRadius: '6px',
          padding: '.5rem .65rem',
        }}
      />
    </label>
  );
}

export default function NodeProperties({ node, onChange }: Props) {
  if (!node) {
    return <p style={{ color: 'rgba(255,255,255,.45)', fontSize: '.84rem' }}>Select a node to edit properties.</p>;
  }

  const type = node.type;
  const data = node.data;

  return (
    <div>
      <h3 style={{ margin: '0 0 .8rem 0', color: '#fff', fontSize: '.9rem', textTransform: 'capitalize' }}>
        {type.replace('_', ' ')} Node
      </h3>

      {type === 'menu' && (
        <Field
          label="Label"
          value={data.label ?? ''}
          onChange={(value) => onChange(node.id, { label: value })}
        />
      )}

      {type === 'option' && (
        <>
          <Field
            label="Key"
            type="number"
            value={typeof data.key === 'number' ? data.key : Number(data.key ?? 1)}
            onChange={(value) => onChange(node.id, { key: Number(value || 0) })}
          />
          <Field
            label="Label"
            value={data.label ?? ''}
            onChange={(value) => onChange(node.id, { label: value })}
          />
          <Field
            label="Queue"
            value={data.queue ?? ''}
            onChange={(value) => onChange(node.id, { queue: value })}
          />
        </>
      )}

      {type === 'queue' && (
        <Field
          label="Queue Name"
          value={data.queueName ?? ''}
          onChange={(value) => onChange(node.id, { queueName: value })}
        />
      )}

      {type === 'prompt' && (
        <Field
          label="Prompt Name"
          value={data.promptName ?? ''}
          onChange={(value) => onChange(node.id, { promptName: value })}
        />
      )}

      {type === 'after_hours' && (
        <Field
          label="Destination"
          value={data.destination ?? ''}
          onChange={(value) => onChange(node.id, { destination: value })}
        />
      )}

      {type === 'holiday' && (
        <Field
          label="Destination"
          value={data.destination ?? ''}
          onChange={(value) => onChange(node.id, { destination: value })}
        />
      )}
    </div>
  );
}

