// Type declaration for the ElevenLabs Conversational AI custom web component
// used by components/VoiceAgentTestWidget.tsx. Not a Next.js/React component —
// registered at runtime by the externally-loaded convai-widget-embed script.
//
// React 19's automatic JSX runtime resolves JSX.IntrinsicElements from the
// 'react' module itself rather than a bare global namespace, so it's augmented
// here rather than via `declare global { namespace JSX {...} }`.
import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'elevenlabs-convai': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        'agent-id'?: string;
      };
    }
  }
}

export {};
