import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/page-states";
import { PageContainer, PageHeader } from "@/components/shared/layout";
import { translate, formatDate, formatCurrency, type TranslationKey } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";
import { listMunicipalityGranteeProjects } from "@/modules/grantee";

export const dynamic = "force-dynamic";
export const metadata = { title: "Awarded projects | eGrantet" };

export default async function MunicipalityProjectsPage() {
  const locale = await getServerLocale();
  const t = (key: TranslationKey, values?: Record<string, string | number>) => translate(locale, key, values);
  const projects = await listMunicipalityGranteeProjects();

  return (
    <>
      <PageContainer>
        <PageHeader
          title={t("municipality.projectsPageTitle")}
          description={t("municipality.projectsPageDescription")}
        />
        <div className="mt-6">
          {projects.length === 0 ? (
            <EmptyState title={t("municipality.noProjectsYet")} description={t("municipality.noProjectsYetDescription")} />
          ) : (
            <ul className="space-y-3">
              {projects.map((project) => (
                <li key={project.id}>
                  <Link href={`/municipality/projects/${project.id}`} className="block rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                    <CardContent className="flex flex-wrap items-center justify-between gap-4 p-0">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate font-semibold">{project.title}</h2>
                          {project.overdueCount > 0 && (
                            <Badge className="bg-destructive-background text-destructive"><TriangleAlert className="mr-1 size-3" />{t("municipality.overdueBadge", { count: project.overdueCount })}</Badge>
                          )}
                          {project.stalled && <Badge variant="warning">{t("milestones.stalled")}</Badge>}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatCurrency(locale, project.awardedAmount, "EUR")} · {formatDate(locale, project.projectStart)} – {formatDate(locale, project.projectEnd)} · {t("municipality.milestonesSuffix", { count: project.milestones.length })}
                        </p>
                      </div>
                      <div className="w-40">
                        <p className="text-xs text-muted-foreground">{t("milestones.progress", { percent: project.progress })}</p>
                        <Progress className="mt-1" value={project.progress} />
                      </div>
                    </CardContent>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PageContainer>
    </>
  );
}
