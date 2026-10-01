import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { LOCALE_COOKIE, DEFAULT_LOCALE, parseLocale } from "@/lib/i18n/config";
import { setRequestLocale } from "@/lib/i18n/server-locale-registry";
import { LocaleProvider } from "@/lib/i18n/client";

export const metadata: Metadata = {
  title: "Team Avengers — Public grants",
  description: "Find and apply for municipal grant opportunities.",
};

/** Applied before paint so the stored theme never flashes the wrong mode. */
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light"){document.documentElement.classList.toggle("dark",t==="dark");return;}if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches){document.documentElement.classList.add("dark");}}catch(e){}})();`;

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
        <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
