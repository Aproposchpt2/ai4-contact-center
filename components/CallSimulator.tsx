import type { ParsedCallFlow } from '@/lib/parser';
import {
  advanceCall,
  getCurrentPrompt,
  getMenuOptions,
  selectOption,
  type IvrState,
} from '@/lib/ivrEngine';

type Props = {
  script: ParsedCallFlow;
  state: IvrState | null;
  onStateChange: (nextState: IvrState) => void;
  onTranscriptChange: (transcript: string[]) => void;
};

export default function CallSimulator({ script, state, onStateChange, onTranscriptChange }: Props) {
  if (!state) {
    return <p style={{ color: 'rgba(255,255,255,.45)' }}>Start a simulation to begin.</p>;
  }
  const currentState = state;

  const prompt = getCurrentPrompt(script, currentState);
  const options = getMenuOptions(script);
  const canSelectOptions = currentState.currentNode === 'menu';
  const canAdvance =
    currentState.currentNode === 'queue' ||
    currentState.currentNode === 'after_hours' ||
    currentState.currentNode === 'holiday';

  function handleOptionClick(optionKey: number) {
    const nextState = selectOption(script, currentState, optionKey);
    onStateChange(nextState);
    onTranscriptChange(nextState.transcript);
  }

  function handleAdvance() {
    const nextState = advanceCall(script, currentState);
    onStateChange(nextState);
    onTranscriptChange(nextState.transcript);
  }

  return (
    <div style={{ display: 'grid', gap: '.8rem' }}>
      <div
        style={{
          background: 'rgba(255,255,255,.03)',
          border: '1px solid rgba(255,255,255,.1)',
          borderRadius: '8px',
          padding: '1rem',
        }}
      >
        <h3 style={{ margin: '0 0 .45rem 0', color: '#fff', fontSize: '.95rem' }}>Current Prompt</h3>
        <p style={{ margin: 0, color: 'rgba(255,255,255,.86)', lineHeight: 1.6 }}>{prompt}</p>
      </div>

      {canSelectOptions && (
        <div
          style={{
            background: 'rgba(255,255,255,.03)',
            border: '1px solid rgba(255,255,255,.1)',
            borderRadius: '8px',
            padding: '1rem',
          }}
        >
          <h3 style={{ margin: '0 0 .55rem 0', color: '#fff', fontSize: '.95rem' }}>Menu Options</h3>
          <div style={{ display: 'grid', gap: '.45rem' }}>
            {options.map((option) => (
              <button
                key={option.key}
                onClick={() => handleOptionClick(option.key)}
                style={{
                  background: 'rgba(91,211,255,.1)',
                  color: '#e8f0fe',
                  border: '1px solid rgba(91,211,255,.25)',
                  borderRadius: '6px',
                  padding: '.55rem .7rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                Press {option.key} — {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {canAdvance && (
        <button onClick={handleAdvance} style={advanceBtn}>
          Advance Call
        </button>
      )}

      {currentState.currentNode === 'ended' && (
        <div
          style={{
            background: 'rgba(52,211,153,.08)',
            border: '1px solid rgba(52,211,153,.25)',
            borderRadius: '8px',
            padding: '.7rem .9rem',
            color: '#8ef1ca',
          }}
        >
          Call simulation complete.
        </div>
      )}
    </div>
  );
}

const advanceBtn: React.CSSProperties = {
  background: '#5bd3ff',
  color: '#06111f',
  border: 'none',
  borderRadius: '6px',
  padding: '.6rem .9rem',
  fontWeight: 700,
  cursor: 'pointer',
};
