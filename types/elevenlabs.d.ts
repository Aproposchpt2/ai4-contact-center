// Type declaration for the ElevenLabs Conversational AI widget custom element.
// The element itself is registered at runtime by the script loaded in
// components/VoiceAgentTestWidget.tsx (https://unpkg.com/@elevenlabs/convai-widget-embed).
import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'elevenlabs-convai': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        'agent-id': string;
      };
    }
  }
}

export {};
