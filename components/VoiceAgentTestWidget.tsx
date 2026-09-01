'use client';
import Script from 'next/script';

// Disposable ElevenLabs test agent created for validating that Conversational AI
// can be embedded in ai4-contact-center. Public agent (auth disabled) — connects
// with just the agent ID, no signed-URL server route required.
// Not connected to any live pipeline (NGCC / NAT-CORP) — safe to test freely.
const TEST_AGENT_ID = 'agent_5201m1d72hh8et8vh4w35enpvt9x';

export default function VoiceAgentTestWidget() {
  return (
    <>
      <Script src="https://unpkg.com/@elevenlabs/convai-widget-embed" strategy="lazyOnload" />
      <elevenlabs-convai agent-id={TEST_AGENT_ID} />
    </>
  );
}
