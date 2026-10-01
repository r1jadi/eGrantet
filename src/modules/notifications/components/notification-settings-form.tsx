"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { useT } from "@/lib/i18n/client";
import { saveLanguagePreferenceAction, saveNotificationPreferencesAction, type PreferenceState } from "../actions/preference-actions";

const initialState: PreferenceState = { status: "idle" };

const CATEGORIES: Array<{ name: import("@/lib/i18n").TranslationKey; hintKey: import("@/lib/i18n").TranslationKey; key: string; locked?: boolean }> = [
  { name: "preferences.grantAnnouncements", hintKey: "preferences.grantAnnouncementsHint", key: "grant_announcements" },
  { name: "preferences.recommendedGrants", hintKey: "preferences.recommendedGrantsHint", key: "recommended_grants" },
  { name: "preferences.applicationUpdates", hintKey: "preferences.applicationUpdatesHint", key: "application_updates" },
  { name: "preferences.documentUpdates", hintKey: "preferences.documentUpdatesHint", key: "document_updates" },
  { name: "preferences.verificationUpdates", hintKey: "preferences.verificationUpdatesHint", key: "verification_updates" },
  { name: "preferences.evaluationUpdates", hintKey: "preferences.evaluationUpdatesHint", key: "evaluation_updates" },
  { name: "preferences.decisionNotifications", hintKey: "preferences.decisionNotificationsHint", key: "decision_notifications", locked: true },
  { name: "preferences.milestoneUpdates", hintKey: "preferences.milestoneUpdatesHint", key: "milestone_updates" },
];

/** Notification settings: per-category email+in-app toggles and language choice. */
export function NotificationSettingsForm({
  preferences,
  language,
}: {
  preferences: Record<string, boolean>;
  language: string;
}) {
  const t = useT();
  const [state, formAction, isPending] = useActionState<PreferenceState, FormData>(saveNotificationPreferencesAction, initialState);
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [languageSaved, setLanguageSaved] = useState(false);
  const [languagePending, setLanguagePending] = useState(false);

  const saveLanguage = async () => {
    setLanguagePending(true);
    setLanguageSaved(false);
    try {
      const { saveLanguagePreferenceAction: persist } = await import("../actions/preference-actions");
      await persist(selectedLanguage);
      setLanguageSaved(true);
    } finally {
      setLanguagePending(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>{t("preferences.title")}</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        {state.status === "success" && (
          <Alert className="border-success/30 bg-success-background text-success"><p className="font-semibold">{t("preferences.saved")}</p></Alert>
        )}
        {state.status === "error" && (
          <Alert className="border-destructive/30 bg-destructive-background text-destructive" role="alert"><p className="font-semibold">{state.message}</p></Alert>
        )}

        <p className="text-sm text-muted-foreground">{t("preferences.description")}</p>

        <form action={formAction} className="space-y-3">
          {CATEGORIES.map((category) => (
            <label key={category.key} className="flex items-start justify-between gap-4 rounded-lg border p-4">
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{t(category.name)}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{t(category.hintKey)}</span>
                {category.locked && <span className="mt-1 block text-xs font-medium text-warning">{t("preferences.emailAlwaysOnNote")}</span>}
              </span>
              {/* Uncontrolled: checked boxes submit "on", unchecked submit nothing (matches action parsing). Locked categories always render checked; the server pins them regardless. */}
              <Checkbox name={category.key} defaultChecked={category.locked ? true : preferences[category.key] !== false} disabled={category.locked} className="mt-1 size-5 shrink-0" />
            </label>
          ))}
          <Button type="submit" disabled={isPending}>
            {isPending ? <><LoaderCircle className="size-4 animate-spin" />{t("preferences.saving")}</> : <><Check className="size-4" />{t("preferences.save")}</>}
          </Button>
        </form>

        <div className="rounded-lg border p-4">
          <label className="block text-sm font-semibold">{t("language.preferenceTitle")}
            <Select value={selectedLanguage} onChange={(event) => { setSelectedLanguage(event.target.value); setLanguageSaved(false); }} className="mt-2 font-normal">
              <option value="sq">{t("language.sq")}</option>
              <option value="en">{t("language.en")}</option>
              <option value="sr">{t("language.sr")}</option>
            </Select>
          </label>
          <p className="mt-2 text-sm text-muted-foreground">{t("language.preferenceDescription")}</p>
          <div className="mt-3 flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" disabled={languagePending} onClick={() => void saveLanguage()}>
              {languagePending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
              {t("common.save")}
            </Button>
            {languageSaved && <span className="text-sm font-medium text-success">{t("language.saved")}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
