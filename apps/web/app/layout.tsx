import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@workspace/ui/globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "react-hot-toast";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { QueryProvider } from "@/components/providers/query-provider";
import { GoogleAnalytics } from "@next/third-parties/google";
import { publicEnv } from "@/env/public";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_APP_URL),
  title: {
    default:
      "10xCoder.club | Curated developer resources to learn, build, and ship faster",
    template: "%s | 10xCoder.club",
  },
  description:
    "Discover and share the best free developer resources on 10xcoder.club — curated tools, articles, and videos to boost your coding journey.",
  keywords: [
    "coding",
    "developer",
    "learning",
    "ai tools",
    "free courses",
    "free coding templates",
  ],
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },

  openGraph: {
    title: "Learn. Build. Ship Faster.",
    description:
      "Discover and share the best free developer resources on 10xcoder.club — curated tools, articles, and videos to boost your coding journey.",
    url: publicEnv.NEXT_PUBLIC_APP_URL,
    siteName: "10xCoder.club",
    images: [
      {
        url: `${(publicEnv.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")}/opengraph-image.png`,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Learn. Build. Ship Faster.",
    description:
      "Discover and share the best free developer resources on 10xcoder.club — curated tools, articles, and videos to boost your coding journey.",
    images: [
      `${(publicEnv.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")}/opengraph-image.png`,
    ],
    creator: "@techysiddhant",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "10xCoder.club",
    url: publicEnv.NEXT_PUBLIC_APP_URL,
    description:
      "Discover and share the best free developer resources — curated tools, articles, and videos to boost your coding journey.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${publicEnv.NEXT_PUBLIC_APP_URL}/resources?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-title" content="10xcoder" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <NuqsAdapter>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <Toaster position="top-right" reverseOrder={false} />
              {children}
            </ThemeProvider>
          </NuqsAdapter>
        </QueryProvider>
        {publicEnv.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <GoogleAnalytics gaId={publicEnv.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        )}
      </body>
    </html>
  );
}
