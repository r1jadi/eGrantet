import Link from "next/link";
import { PageContainer } from "@/components/shared/layout";
import { translate } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";

export const metadata = { title: "Page not found | eGrantet" };

export default async function RootNotFound() {
  const locale = await getServerLocale().catch(() => "en" as const);
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  return (
    <PageContainer>
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{t("common.notFoundTitle")}</h1>
        <p className="mt-3 text-muted-foreground">{t("common.notFoundMessage")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            {t("common.goHome")}
          </Link>
          <Link href="/grants" className="inline-flex min-h-10 items-center rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted">
            {t("nav.findGrants")}
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
