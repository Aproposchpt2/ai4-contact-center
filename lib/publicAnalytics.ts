type AnalyticsEvent = 'estimate_calculated' | 'demo_call_clicked' | 'demo_result_viewed' | 'generate_lead';
export function trackPublicEvent(name: AnalyticsEvent) {
  if (typeof window === 'undefined' || !['stellaruc.com', 'www.stellaruc.com'].includes(window.location.hostname)) return;
  try {
    const target = window as Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
    target.dataLayer = target.dataLayer || [];
    target.gtag = target.gtag || function (...args: unknown[]) { target.dataLayer!.push(args); };
    target.gtag('event', name, { send_to: 'G-EF9G9YQDY9', page_location: window.location.origin + window.location.pathname });
  } catch { /* Measurement must never block the customer workflow. */ }
}
