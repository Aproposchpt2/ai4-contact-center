type Props = {
  transcript: string[];
};

export default function TranscriptViewer({ transcript }: Props) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.1)',
        borderRadius: '8px',
        padding: '1rem',
      }}
    >
      <h3 style={{ margin: '0 0 .6rem 0', color: '#fff', fontSize: '.95rem' }}>Call Transcript</h3>
      {transcript.length === 0 ? (
        <p style={{ margin: 0, color: 'rgba(255,255,255,.45)' }}>No transcript yet.</p>
      ) : (
        <ol style={{ margin: 0, paddingLeft: '1.2rem' }}>
          {transcript.map((line, index) => (
            <li key={`${index}-${line}`} style={{ marginBottom: '.35rem', color: 'rgba(255,255,255,.85)' }}>
              {line}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

