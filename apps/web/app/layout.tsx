import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@workspace/ui/globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "react-hot-toast";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { QueryProvider } from "@/components/providers/query-provider";
import { GoogleTagManager } from "@next/third-parties/google";
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
  title: "10xcoder.club",
  description: "10xcoder.club",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-title" content="10xcoder" />
      </head>
      <GoogleTagManager
        gtmId={publicEnv.NEXT_PUBLIC_GA_MEASUREMENT_ID as string}
      />
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
      </body>
    </html>
  );
}
