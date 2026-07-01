import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { AppShellProvider } from "@/lib/appShell";
import { SkipLink } from "@/components/SkipLink";
import "./globals.css";
import "../styles/dashboard-theme.css";
import "../styles/tokens.css";
import "../styles/app.css";
import "../styles/dashboard-components.css";
import "../styles/dashboard-mock.css";
import "../styles/landing.css";

export const metadata: Metadata = {
  title:       "inferencache",
  description: "Multi-tier semantic caching for LLM APIs. Stop paying for the same prompt twice.",
  icons: {
    icon:  "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
      data-theme="dark"
    >
      <body
        className="antialiased"
        style={{ fontFamily: "var(--font-geist-sans, var(--sans))" }}
      >
        <AppShellProvider>
          <SkipLink />
          {children}
        </AppShellProvider>
      </body>
    </html>
  );
}
