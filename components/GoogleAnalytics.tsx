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
var campaign = new URLSearchParams(window.location.search);
var sources = ['linkedin', 'google_business_profile', 'iss_outreach'];
var media = ['social', 'organic', 'email'];
var names = ['iss_sales', 'opportunity_services'];
var attribution = {};
if (sources.includes(campaign.get('utm_source'))) attribution.campaign_source = campaign.get('utm_source');
if (media.includes(campaign.get('utm_medium'))) attribution.campaign_medium = campaign.get('utm_medium');
if (names.includes(campaign.get('utm_campaign'))) attribution.campaign_name = campaign.get('utm_campaign');
gtag('config', '${MEASUREMENT_ID}', {
  ...attribution,
  page_location: window.location.origin + window.location.pathname
});`}
    </Script>
  </>;
}
