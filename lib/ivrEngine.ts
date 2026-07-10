import type { ParsedCallFlow } from '@/lib/parser';

export type IvrNode = 'menu' | 'option' | 'queue' | 'after_hours' | 'holiday' | 'ended';

export type IvrState = {
  currentNode: IvrNode;
  transcript: string[];
  selectedOptionKey: number | null;
  destination: string | null;
};

export function startCall(_script: ParsedCallFlow): IvrState {
  return {
    currentNode: 'menu',
    transcript: ['Call started'],
    selectedOptionKey: null,
    destination: null,
  };
}

export function getCurrentPrompt(script: ParsedCallFlow, state: IvrState): string {
  if (state.currentNode === 'menu') return script.menu;

  if (state.currentNode === 'option') {
    const option = script.options.find((o) => o.key === state.selectedOptionKey);
    return option?.label ?? 'Selected Option';
  }

  if (state.currentNode === 'queue') return state.destination ?? 'Queue';
  if (state.currentNode === 'after_hours') return script.after_hours ?? 'After-Hours';
  if (state.currentNode === 'holiday') return script.holiday ?? 'Holiday';
  return 'Call ended';
}

export function getMenuOptions(script: ParsedCallFlow): Array<{ key: number; label: string }> {
  return script.options.map((option) => ({
    key: option.key,
    label: option.label,
  }));
}

export function selectOption(script: ParsedCallFlow, state: IvrState, optionKey: number): IvrState {
  const option = script.options.find((item) => item.key === optionKey);
  if (!option) {
    return {
      ...state,
      transcript: [...state.transcript, `User selected option ${optionKey}`, 'Invalid option selected'],
    };
  }

  const transcript = [...state.transcript, `User selected option ${optionKey}`];
  let currentNode: IvrNode = 'option';
  let destination: string | null = null;

  if (option.queue) {
    currentNode = 'queue';
    destination = option.queue;
    transcript.push(`Routing to queue ${destination}`);
  } else if (script.after_hours) {
    currentNode = 'after_hours';
    destination = script.after_hours;
    transcript.push(`Routing to after-hours destination ${destination}`);
  } else if (script.holiday) {
    currentNode = 'holiday';
    destination = script.holiday;
    transcript.push(`Routing to holiday destination ${destination}`);
  } else {
    currentNode = 'ended';
    transcript.push('No route found. Call ended.');
  }

  return {
    ...state,
    currentNode,
    selectedOptionKey: optionKey,
    destination,
    transcript,
  };
}

export function advanceCall(script: ParsedCallFlow, state: IvrState): IvrState {
  if (state.currentNode === 'queue' || state.currentNode === 'after_hours' || state.currentNode === 'holiday') {
    const destination =
      state.currentNode === 'queue'
        ? state.destination
        : state.currentNode === 'after_hours'
        ? script.after_hours
        : script.holiday;

    return {
      ...state,
      currentNode: 'ended',
      transcript: [...state.transcript, `Call ended at ${destination ?? 'destination'}`],
    };
  }

  return state;
}

export function buildTranscript(state: IvrState): string[] {
  return [...state.transcript];
}

