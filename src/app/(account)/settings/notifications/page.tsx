import { Settings } from "lucide-react";
import { ApplicantShell } from "@/modules/grants/components/applicant-shell";
import { PageContainer, PageHeader } from "@/components/shared/layout";
import { NotificationSettingsForm } from "@/modules/notifications/components/notification-settings-form";
import { loadNotificationPreferencesAction } from "@/modules/notifications/actions/preference-actions";
import { translate } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";

export const metadata = { title: "Notification settings | eGrantet" };
export const dynamic = "force-dynamic";

export default async function NotificationSettingsPage() {
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const { preferences, language } = await loadNotificationPreferencesAction();

  return (
    <ApplicantShell>
      <PageContainer>
        <PageHeader title={t("preferences.title")} description={t("preferences.description")} actions={<Settings className="size-8 text-primary" aria-hidden="true" />} />
        <div className="mt-6 max-w-2xl">
          <NotificationSettingsForm preferences={preferences as unknown as Record<string, boolean>} language={language} />
        </div>
      </PageContainer>
    </ApplicantShell>
  );
}
