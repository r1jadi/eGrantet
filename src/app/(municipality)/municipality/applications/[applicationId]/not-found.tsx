import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/page-states";
import { translate } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";

export default async function MunicipalApplicationNotFound() {
  const locale = await getServerLocale();
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <EmptyState
        title={translate(locale, "errors.applicationNotFoundTitle")}
        description={translate(locale, "errors.applicationNotFoundDescription")}
        action={<Link href="/municipality/applications" className="inline-flex min-h-10 items-center justify-center"><Button type="button" variant="outline">{translate(locale, "municipality.backToApplications")}</Button></Link>}
      />
    </main>
  );
}
