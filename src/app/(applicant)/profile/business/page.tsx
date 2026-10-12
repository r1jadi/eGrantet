import { Briefcase, CalendarDays, FileText, Landmark, MapPin, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors/app-error";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/layout";
import { getMyBusinessAction } from "@/modules/users/actions/business-actions";
import { translate, formatDateLong, type TranslationKey } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";
import { listMyBusinessUploadsAction } from "@/modules/users/actions/business-upload-actions";
import type { BusinessDocument } from "@/modules/users/services/business-documents-service";
import type { BusinessUploadedDocument } from "@/modules/users/services/business-upload-service";
import { MyBusinessDocuments } from "@/modules/users/components/my-business-documents";

export const metadata = { title: "My Business | eGrantet" };
export const dynamic = "force-dynamic";

export default async function MyBusinessPage() {
  const locale = await getServerLocale();
  const t = (key: TranslationKey, values?: Record<string, string | number>) => translate(locale, key, values);
  let business: Awaited<ReturnType<typeof getMyBusinessAction>>["business"];
  let documents: BusinessDocument[];
  let uploads: BusinessUploadedDocument[] = [];
  try {
    const result = await getMyBusinessAction();
    business = result.business;
    documents = result.documents;
    uploads = await listMyBusinessUploadsAction().catch(() => []);
  } catch (error) {
    if (error instanceof AppError && (error.code === "AUTHENTICATION" || error.code === "AUTHORIZATION")) redirect("/");
    throw error;
  }

  const facts = [
    { icon: Briefcase, label: t("business.businessNameLabel"), value: business.businessName },
    { icon: FileText, label: "NUI", value: business.nui },
    { icon: Landmark, label: t("business.businessTypeLabel"), value: business.businessType },
    { icon: CalendarDays, label: t("business.registrationDateLabel"), value: formatDateLong(locale, business.registrationDate) },
    { icon: FileText, label: t("business.businessActivityLabel"), value: business.businessActivity },
    { icon: MapPin, label: t("business.addressLabel"), value: business.address },
    { icon: Landmark, label: t("grants.municipalityLabel"), value: business.municipality },
    { icon: UserRound, label: t("business.ownerLabel"), value: business.owner },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader title={t("nav.myBusiness")} description={t("business.pageDescription", { nui: business.nui })} />
      <Card className="mt-6">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("business.arbkRegistryRecord")}</p>
              <p className="mt-1 text-lg font-bold tracking-tight">{business.businessName}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${business.status === "Active" ? "bg-success-background text-success" : "bg-warning-background text-warning"}`}>{business.status}</span>
          </div>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            {facts.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex gap-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 break-words text-sm font-medium">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      <MyBusinessDocuments arbkDocuments={documents} uploads={uploads} />
    </main>
  );
}
