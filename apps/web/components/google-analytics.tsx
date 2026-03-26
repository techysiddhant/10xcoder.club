"use client";

import Script from "next/script";

type GoogleAnalyticsProps = {
  gaId: string;
};

const GoogleAnalytics = ({ gaId }: GoogleAnalyticsProps) => {
  return (
    <>
      <Script
        id="gtag-init"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', '${gaId}');
          `,
        }}
      />
      <Script
        id="gtag-src"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
    </>
  );
};

export default GoogleAnalytics;
