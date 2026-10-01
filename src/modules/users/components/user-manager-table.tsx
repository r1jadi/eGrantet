"use client";

import { useRouter } from "next/navigation";
import { useTransition, useRef } from "react";
import { ShieldOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { EmptyState } from "@/components/shared/page-states";
import { useT, useLocale } from "@/lib/i18n/client";
import { formatDate, type TranslationKey } from "@/lib/i18n";
import { changeUserRoleAction, setUserDisabledAction, type AdminUserRow } from "../actions/admin-actions";

const ROLES = ["APPLICANT", "MUNICIPAL_EMPLOYEE", "EVALUATOR", "ADMIN"] as const;

const ROLE_KEYS: Record<(typeof ROLES)[number], TranslationKey> = {
  APPLICANT: "adminUi.roleApplicant",
  MUNICIPAL_EMPLOYEE: "adminUi.roleMunicipalEmployee",
  EVALUATOR: "adminUi.roleEvaluator",
  ADMIN: "adminUi.roleAdmin",
};

/**
 * Admin table of platform accounts. Role changes run through a form per row
 * (self-change is refused server-side); disabling is a confirmed destructive
 * action. Disabled state is read from the auth layer by the server page.
 */
export function UserManagerTable({ users }: { users: AdminUserRow[] }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useT();
  const [isPending, startTransition] = useTransition();
  const errorRef = useRef<HTMLParagraphElement | null>(null);

  if (users.length === 0) {
    return <EmptyState title={t("adminUi.noUsersTitle")} description={t("adminUi.noUsersYet")} />;
  }

  const changeRole = (userId: string, role: string, select: HTMLSelectElement, previousRole: string) =>
    startTransition(async () => {
      const formData = new FormData();
      formData.set("userId", userId);
      formData.set("role", role);
      const result = await changeUserRoleAction({ status: "idle" }, formData);
      if (result.status === "error") {
        // Revert the select to the persisted role and surface the reason
        // (e.g. self-role changes are refused server-side).
        select.value = previousRole;
        if (errorRef.current) {
          errorRef.current.textContent = result.message ?? t("adminUi.unableToChangeRole");
          errorRef.current.classList.remove("hidden");
        }
        return;
      }
      router.refresh();
    });

  const setDisabled = (userId: string, disable: boolean) =>
    startTransition(async () => {
      const formData = new FormData();
      formData.set("userId", userId);
      formData.set("disable", disable ? "true" : "false");
      await setUserDisabledAction({ status: "idle" }, formData);
      router.refresh();
    });

  return (
    <div className="space-y-3">
    <p ref={errorRef} role="alert" className="hidden rounded-lg border border-destructive/30 bg-destructive-background px-4 py-3 text-sm font-medium text-destructive" />
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{t("adminUi.platformUsersCaption")}</caption>
        <thead className="border-b bg-muted/45 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          <tr>
            <th scope="col" className="px-5 py-3.5 font-semibold">{t("adminUi.userColumn")}</th>
            <th scope="col" className="px-5 py-3.5 font-semibold">{t("adminUi.roleColumn")}</th>
            <th scope="col" className="px-5 py-3.5 font-semibold">{t("adminUi.registeredColumn")}</th>
            <th scope="col" className="px-5 py-3.5 font-semibold text-right">{t("adminUi.accessColumn")}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b transition-colors last:border-0 hover:bg-muted/35">
              <td className="px-5 py-4">
                <p className="font-medium">{user.fullName ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{user.email ?? user.id}</p>
              </td>
              <td className="px-5 py-4">
                <label className="sr-only" htmlFor={`role-${user.id}`}>{t("adminUi.roleFor", { email: user.email ?? user.id })}</label>
                <select
                  id={`role-${user.id}`}
                  defaultValue={user.role}
                  disabled={isPending}
                  onChange={(event) => changeRole(user.id, event.target.value, event.currentTarget, user.role)}
                  className="min-h-9 rounded-md border bg-card px-2 py-1.5 text-sm"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>{t(ROLE_KEYS[role])}</option>
                  ))}
                </select>
              </td>
              <td className="px-5 py-4 text-xs text-muted-foreground">
                {formatDate(locale, user.createdAt)}
                {user.disabled && <span className="mt-1 inline-block rounded-full bg-destructive-background px-2 py-0.5 text-[10px] font-semibold text-destructive">{t("adminUi.disabledBadge")}</span>}
              </td>
              <td className="px-5 py-4 text-right">
                {user.disabled ? (
                  <ConfirmActionDialog
                    trigger={
                      <Button type="button" variant="outline" size="sm">
                        <ShieldCheck className="size-4 text-success" aria-hidden="true" />
                        {t("adminUi.reEnable")}
                      </Button>
                    }
                    title={t("adminUi.reEnableTitle")}
                    description={t("adminUi.reEnableDescription")}
                    confirmLabel={t("adminUi.reEnableConfirm")}
                    cancelLabel={t("adminUi.cancelLabel")}
                    action={async () => {
                      await setDisabled(user.id, false);
                    }}
                  />
                ) : (
                  <ConfirmActionDialog
                    trigger={
                      <Button type="button" variant="outline" size="sm">
                        <ShieldOff className="size-4 text-destructive" aria-hidden="true" />
                        {t("adminUi.disable")}
                      </Button>
                    }
                    title={t("adminUi.disableTitle")}
                    description={t("adminUi.disableDescription")}
                    confirmLabel={t("adminUi.disableConfirm")}
                    cancelLabel={t("adminUi.cancelLabel")}
                    action={async () => {
                      await setDisabled(user.id, true);
                    }}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  );
}

export function ShieldCheckIcon() {
  return <ShieldCheck className="size-4" aria-hidden="true" />;
}
