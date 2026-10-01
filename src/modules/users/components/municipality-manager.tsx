"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Building2, Pencil, Plus, Trash2, UserPlus, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { EmptyState } from "@/components/shared/page-states";
import { useT } from "@/lib/i18n/client";
import {
  addMunicipalityMemberAction,
  createMunicipalityAction,
  deleteMunicipalityAction,
  listMunicipalityMembersAdminAction,
  removeMunicipalityMemberAction,
  renameMunicipalityAction,
  type AdminMunicipality,
} from "../actions/admin-actions";

interface ActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

const idle: ActionState = { status: "idle" };

/** Admin management surface for the municipality registry and its employees. */
export function MunicipalityManager({ municipalities }: { municipalities: AdminMunicipality[] }) {
  const router = useRouter();
  const t = useT();
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState<ActionState>(idle);
  const [renaming, setRenaming] = useState<AdminMunicipality | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const run = (work: () => Promise<ActionState>, onSuccess?: () => void) =>
    startTransition(async () => {
      const result = await work();
      setFormState(result);
      if (result.status === "success") {
        setRenaming(null);
        onSuccess?.();
        router.refresh();
      }
    });

  return (
    <div className="space-y-4">
      {formState.status !== "idle" && formState.message && (
        <Alert
          className={
            formState.status === "error"
              ? "border-destructive/30 bg-destructive-background text-destructive"
              : "border-success/30 bg-success-background text-success"
          }
          role={formState.status === "error" ? "alert" : undefined}
        >
          <p className="font-semibold">{formState.message}</p>
        </Alert>
      )}

      <Card>
        <CardContent className="p-5">
          <form
            action={(formData) => run(() => createMunicipalityAction(idle, formData))}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <Label htmlFor="new-municipality-name">{t("adminUi.municipalityNameLabel")}</Label>
              <Input id="new-municipality-name" name="name" required maxLength={120} placeholder={t("adminUi.municipalityNamePlaceholder")} className="mt-1" />
            </div>
            <Button type="submit" disabled={isPending}>
              <Plus className="size-4" /> {t("adminUi.createMunicipality")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {municipalities.length === 0 ? (
        <EmptyState title={t("adminUi.noMunicipalitiesTitle")} description={t("adminUi.noMunicipalitiesYet")} />
      ) : (
        <ul className="space-y-3">
          {municipalities.map((municipality) => (
            <li key={municipality.id} className="rounded-xl border bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                    <Building2 className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{municipality.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("adminUi.employeeCount", { count: municipality.memberCount })} · {t("adminUi.grantCount", { count: municipality.grantCount })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setExpanded(expanded === municipality.id ? null : municipality.id)}>
                    {expanded === municipality.id ? t("adminUi.hideEmployees") : t("adminUi.employeesToggle")}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setRenaming(municipality)}>
                    <Pencil className="size-4" aria-hidden="true" />
                    <span className="sr-only">{t("adminUi.renameSr", { name: municipality.name })}</span>
                  </Button>
                  <ConfirmActionDialog
                    trigger={
                      <Button type="button" variant="outline" size="sm">
                        <Trash2 className="size-4 text-destructive" aria-hidden="true" />
                        <span className="sr-only">{t("adminUi.deleteSr", { name: municipality.name })}</span>
                      </Button>
                    }
                    title={t("adminUi.deleteMunicipalityTitle", { name: municipality.name })}
                    description={t("adminUi.deleteMunicipalityDescription")}
                    confirmLabel={t("adminUi.deleteMunicipalityConfirm")}
                    cancelLabel={t("adminUi.cancelLabel")}
                    action={() => deleteMunicipalityAction(idle, buildForm({ municipalityId: municipality.id })).then(unwrap)}
                  />
                </div>
              </div>

              {renaming?.id === municipality.id && (
                <form
                  action={(formData) => run(() => renameMunicipalityAction(idle, formData), () => setRenaming(null))}
                  className="mt-4 flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-end"
                >
                  <input type="hidden" name="municipalityId" value={municipality.id} />
                  <div className="flex-1">
                    <Label htmlFor={`rename-${municipality.id}`}>{t("adminUi.newNameLabel")}</Label>
                    <Input id={`rename-${municipality.id}`} name="name" defaultValue={municipality.name} required maxLength={120} className="mt-1" />
                  </div>
                  <Button type="submit" size="sm" disabled={isPending}>{t("adminUi.saveName")}</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setRenaming(null)}>
                    <X className="size-4" aria-hidden="true" />
                    <span className="sr-only">{t("adminUi.cancelRename")}</span>
                  </Button>
                </form>
              )}

              {expanded === municipality.id && (
                <MunicipalityEmployees municipalityId={municipality.id} municipalityName={municipality.name} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MunicipalityEmployees({ municipalityId, municipalityName }: { municipalityId: string; municipalityName: string }) {
  const router = useRouter();
  const t = useT();
  const [members, setMembers] = useState<Awaited<ReturnType<typeof listMunicipalityMembersAdminAction>> | null>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const load = () =>
    startTransition(async () => {
      setMembers(await listMunicipalityMembersAdminAction(municipalityId).catch(() => []));
    });
  // Load once when the panel expands. Deferred to an effect so the fetch
  // never starts during render (React forbids transitions while rendering).
  useEffect(() => {
    if (members === null && !isPending) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members === null]);

  return (
    <div className="mt-4 rounded-lg border bg-muted/30 p-4">
      <p className="text-sm font-semibold">{t("adminUi.employeesOf", { name: municipalityName })}</p>
      <form
        action={(formData) =>
          startTransition(async () => {
            const result = await addMunicipalityMemberAction({ status: "idle" }, formData);
            setMessage(result.message ?? null);
            if (result.status === "success") {
              setMembers(await listMunicipalityMembersAdminAction(municipalityId).catch(() => []));
              router.refresh();
            }
          })
        }
        className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <input type="hidden" name="municipalityId" value={municipalityId} />
        <div className="flex-1">
          <Label htmlFor={`email-${municipalityId}`}>{t("adminUi.employeeEmailLabel")}</Label>
          <Input id={`email-${municipalityId}`} name="userEmail" type="email" required placeholder="name@municipality.example" className="mt-1" />
        </div>
        <Button type="submit" size="sm" disabled={isPending}>
          <UserPlus className="size-4" /> {t("adminUi.addEmployee")}
        </Button>
      </form>
      {message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}
      <ul className="mt-4 space-y-2">
        {(members ?? []).length === 0 ? (
          <li className="text-sm text-muted-foreground">{t("adminUi.noEmployeesYet")}</li>
        ) : (
          (members ?? []).map((member) => (
            <li key={member.userId} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card px-3 py-2">
              <div className="min-w-0 text-sm">
                <p className="truncate font-medium">{member.fullName ?? member.email ?? member.userId}</p>
                {member.fullName && member.email && <p className="truncate text-xs text-muted-foreground">{member.email}</p>}
              </div>
              <ConfirmActionDialog
                trigger={
                  <Button type="button" variant="ghost" size="sm">
                    <X className="size-4 text-destructive" aria-hidden="true" />
                    <span className="sr-only">{t("adminUi.removeSr", { email: member.email ?? member.userId })}</span>
                  </Button>
                }
                title={t("adminUi.removeEmployeeTitle")}
                description={t("adminUi.removeEmployeeDescription")}
                confirmLabel={t("adminUi.removeEmployeeConfirm")}
                cancelLabel={t("adminUi.cancelLabel")}
                action={() =>
                  removeMunicipalityMemberAction(idle, buildForm({ municipalityId, userId: member.userId })).then(async () => {
                    setMembers(await listMunicipalityMembersAdminAction(municipalityId).catch(() => []));
                  })
                }
              />
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function buildForm(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) formData.set(key, value);
  return formData;
}

async function unwrap(result: { status: string; message?: string }): Promise<string> {
  if (result.status === "error") throw new Error(result.message ?? "The action failed.");
  return result.message ?? "";
}
