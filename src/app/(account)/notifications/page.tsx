import Link from "next/link";
import { Bell } from "lucide-react";
import { ApplicantShell } from "@/modules/grants/components/applicant-shell";
import { EmptyState } from "@/components/shared/page-states";
import { PageContainer, PageHeader } from "@/components/shared/layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MarkAllReadButton, listNotificationsForCurrentUser } from "@/modules/notifications";
import { ClearReadButton } from "@/modules/notifications/components/clear-read-button";
import { translate, formatDate, type TranslationKey } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";

export const metadata = { title: "Notifications | City grants" };
export const dynamic = "force-dynamic";

const typeLabelKeys: Record<string, TranslationKey> = {
  APPLICATION_STATUS: "statusLabels.application.SUBMITTED",
  CORRECTION_REQUEST: "statusLabels.application.CORRECTION_REQUESTED",
  MILESTONE: "milestones.milestones",
  SYSTEM: "common.productName",
};

export default async function NotificationsPage() {
  // Guest guard: the bell link is visible site-wide, so unauthenticated
  // visitors are redirected to sign-in instead of an error.
  const locale = await getServerLocale();
  const t = (key: TranslationKey) => translate(locale, key);
  let notifications: Awaited<ReturnType<typeof listNotificationsForCurrentUser>> = [];
  let loadFailed = false;
  try {
    notifications = await listNotificationsForCurrentUser();
  } catch {
    loadFailed = true;
  }
  const unreadCount = notifications.filter((notification) => notification.readAt === null).length;

  return (
    <ApplicantShell>
      <PageContainer>
        <PageHeader
          title={t("nav.notifications")}
          description={t("notifications.inboxDescription")}
          actions={<Bell className="size-8 text-primary" aria-hidden="true" />}
        />
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? t("notifications.unreadCount").replace("{count}", String(unreadCount)) : t("notifications.allRead")}
          </p>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && <MarkAllReadButton label={t("notifications.markAllRead")} />}
            {notifications.some((notification) => notification.readAt !== null) && (
              <ClearReadButton label="Clear read" />
            )}
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {loadFailed ? (
            <EmptyState title={t("errors.generic")} description={t("notifications.inboxDescription")} />
          ) : notifications.length === 0 ? (
            <EmptyState title={t("notifications.emptyTitle")} description={t("notifications.emptyDescription")} action={<Link href="/grants" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">{t("applications.browseOpenGrants")}</Link>} />
          ) : (
            notifications.map((notification) => (
              <Card key={notification.id} className={notification.readAt === null ? "border-primary/30" : undefined}>
                <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{notification.title}</h2>
                      {notification.readAt === null && <Badge className="bg-primary text-primary-foreground">{t("notifications.new")}</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(locale, notification.createdAt)}</p>
                  </div>
                  {notification.applicationId && (
                    <Link href={`/applications/${notification.applicationId}`} className="text-sm font-semibold text-primary hover:underline">
                      {t("notifications.viewApplication")}
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </PageContainer>
    </ApplicantShell>
  );
}
