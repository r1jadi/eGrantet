import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { LOCALE_COOKIE, DEFAULT_LOCALE, parseLocale } from "@/lib/i18n/config";
import { setRequestLocale } from "@/lib/i18n/server-locale-registry";
import { LocaleProvider } from "@/lib/i18n/client";
import { CookieConsent } from "@/components/consent/cookie-consent";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://egrantet.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "eGrantet — Municipal grants & subsidies",
    template: "%s | eGrantet",
  },
  description:
    "eGrantet — the municipal grants and subsidies platform. Discover open grants, check requirements, apply online, and track every step of your application.",
  keywords: [
    "eGrantet",
    "municipal grants",
    "subsidies",
    "grantet komunale",
    "subvencione",
    "opštinski grantovi",
    "grant application",
    "Kosovo grants",
  ],
  authors: [{ name: "eGrantet" }],
  creator: "eGrantet",
  publisher: "eGrantet",
  category: "Government",
  openGraph: {
    type: "website",
    siteName: "eGrantet",
    title: "eGrantet — Municipal grants & subsidies",
    description:
      "Discover open municipal grants, check requirements, apply online, and track your application — with transparent human decisions.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "eGrantet — Municipal grants & subsidies",
    description:
      "Discover open municipal grants, check requirements, apply online, and track your application.",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#123f69" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1f33" },
  ],
};

/** Applied before paint so the stored theme never flashes the wrong mode. Light is the default; dark applies only when explicitly chosen. */
const themeScript = `(function(){try{document.documentElement.classList.toggle("dark",localStorage.getItem("theme")==="dark");}catch(e){}})();`;

/**
 * Applied before hydration so the module snapshot of the client locale store
 * starts from the persisted preference and never contradicts the server.
 */
const localeScript = `(function(){try{var m={"sq":1,"en":1,"sr":1};var c=document.cookie.split(/;\\s*/).find(function(p){return p.indexOf("locale=")==0;});var v=c?c.slice("locale=".length):null;if(v&&m[v]){window.__LOCALE__=v;}}catch(e){}})();`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const store = await cookies();
  const locale = parseLocale(store.get(LOCALE_COOKIE)?.value ?? DEFAULT_LOCALE);
  // Record for shared server components (badges, tables, states) rendered in
  // this request; layouts render before pages, so this precedes their reads.
  setRequestLocale(locale);
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "eGrantet",
    url: siteUrl,
    description:
      "Municipal grants and subsidies platform: discover open grants, apply online, and track applications.",
    inLanguage: ["sq", "en", "sr"],
  };
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: localeScript }} />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <LocaleProvider initialLocale={locale}>
          {children}
          <CookieConsent />
        </LocaleProvider>
      </body>
    </html>
  );
}
