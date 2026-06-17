import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AppShellProvider } from "@/lib/appShell";
import { ThemeProvider } from "@/lib/theme";
import { SkipLink } from "@/components/SkipLink";
import "./globals.css";
import "../styles/mockup.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font",
  weight: ["300", "400", "500", "600"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title:       "promptcache · cache testing",
  description: "Run prompt suites against real APIs and measure semantic cache hit rate, cost savings, and latency.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`} suppressHydrationWarning data-theme="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("promptcache-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);else if(window.matchMedia("(prefers-color-scheme: dark)").matches)document.documentElement.setAttribute("data-theme","dark");}catch(e){}})();`,
          }}
        />
      </head>
      <body className="h-screen overflow-hidden antialiased" style={{ fontFamily: "var(--font), system-ui, sans-serif" }}>
        <ThemeProvider>
          <AppShellProvider>
            <SkipLink />
            {children}
          </AppShellProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
