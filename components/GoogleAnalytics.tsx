import Script from 'next/script';
import { useEffect, useState } from 'react';

const MEASUREMENT_ID = 'G-EF9G9YQDY9';

export default function GoogleAnalytics() {
  const [productionHost, setProductionHost] = useState(false);

  useEffect(() => {
    setProductionHost(['stellaruc.com', 'www.stellaruc.com'].includes(window.location.hostname));
  }, []);

  if (!productionHost) return null;

  return <>
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`}
      strategy="afterInteractive"
    />
    <Script id="stellaruc-ga4" strategy="afterInteractive">
      {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${MEASUREMENT_ID}', {
  page_location: window.location.origin + window.location.pathname
});`}
    </Script>
  </>;
}
