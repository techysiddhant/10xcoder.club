"use client";
import { GoogleAnalytics as GoogleAnalyticsComponent } from "@next/third-parties/google";

type GoogleAnalyticsProps = {
  gaId: string;
};

const GoogleAnalytics = ({ gaId }: GoogleAnalyticsProps) => {
  return <GoogleAnalyticsComponent gaId={gaId} />;
};

export default GoogleAnalytics;
