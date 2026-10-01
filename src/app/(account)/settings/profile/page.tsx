import Link from "next/link";
import { ApplicantShell } from "@/modules/grants/components/applicant-shell";
import { PageContainer, PageHeader, Section } from "@/components/shared/layout";
import { getServerLocale } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n";
import { getCurrentProfile } from "@/lib/auth/server";
import { ProfileForm } from "@/modules/users/components/profile-form";

export const metadata = { title: "Profile settings | Team Avengers" };
export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const profile = (await getCurrentProfile())!;

  return (
    <ApplicantShell>
    <PageContainer>
      <PageHeader
        title={t("nav.myProfile")}
        description={t("adminUi.profileShownNote")}
        actions={<Link href="/settings/notifications" className="text-sm font-semibold text-primary hover:underline">{t("adminUi.notificationSettingsLink")}</Link>}
      />
      <Section className="mt-6 max-w-2xl" title={t("nav.myProfile")}>
        <ProfileForm fullName={profile.fullName ?? ""} email={profile.email} />
      </Section>
    </PageContainer>
    </ApplicantShell>
  );
}
