"use client";

import { CheckCircle2, CircleAlert, Eye, EyeOff, LoaderCircle, Mail, MoveLeft } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/client";
import { requestPasswordResetAction, signInAction, signUpAction, updatePasswordAction, type AuthActionState } from "../actions/auth-actions";

type AuthMode = "login" | "register" | "forgot" | "reset";
type Values = Record<string, string>;
type Errors = Record<string, string>;

type ValidationKey = "emailRequired" | "emailInvalid" | "fullNameRequired" | "passwordRequired" | "passwordLength" | "confirmPasswordRequired" | "passwordMismatch" | "nuiRequired" | "nuiInvalid" | "termsRequired";

function validate(mode: AuthMode, values: Values): Partial<Record<keyof Values | "email" | "fullName" | "password" | "confirmPassword" | "businessNui" | "acceptTerms", ValidationKey>> {
  const errors: Partial<Record<string, ValidationKey>> = {};
  const email = values.email?.trim() ?? "";
  if (mode !== "reset" && !email) errors.email = "emailRequired";
  else if (mode !== "reset" && !/^\S+@\S+\.\S+$/.test(email)) errors.email = "emailInvalid";
  if (mode === "register" && !(values.fullName?.trim())) errors.fullName = "fullNameRequired";
  if (mode === "login" || mode === "register" || mode === "reset") {
    if (!values.password) errors.password = "passwordRequired";
    else if (mode !== "login" && values.password.length < 8) errors.password = "passwordLength";
  }
  if (mode === "register" || mode === "reset") {
    if (!values.confirmPassword) errors.confirmPassword = "confirmPasswordRequired";
    else if (values.password !== values.confirmPassword) errors.confirmPassword = "passwordMismatch";
  }
  if (mode === "register" && values.accountType === "business") {
    const nui = values.businessNui?.trim() ?? "";
    if (!nui) errors.businessNui = "nuiRequired";
    else if (nui.length < 6 || nui.length > 10 || !/^[A-Za-z0-9]+$/.test(nui)) errors.businessNui = "nuiInvalid";
  }
  if (mode === "register" && values.acceptTerms !== "true") errors.acceptTerms = "termsRequired"; // submit() normalizes checkbox values before calling validate.
  return errors;
}

const idleState: AuthActionState = { status: "idle" };
const actionByMode = { login: signInAction, register: signUpAction, forgot: requestPasswordResetAction, reset: updatePasswordAction } as const;

export function AuthForm({ mode, next }: { mode: AuthMode; next?: string }) {
  const t = useT();
  const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(actionByMode[mode], idleState);
  const [values, setValues] = useState<Values>({});
  const [errors, setErrors] = useState<Partial<Record<string, ValidationKey>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const isLoading = isPending;
  const isSuccess = state.status === "success" && (mode === "forgot" || state.emailVerificationRequired === true);
  const setValue = (name: string, value: string) => { setValues((current) => ({ ...current, [name]: value })); if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined })); };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    const raw = Object.fromEntries(new FormData(event.currentTarget).entries()) as Values;
    const accepted = raw.acceptTerms === "true" || raw.acceptTerms === "on"; // FormData reports checkboxes as "on"; React state uses "true".
    const nextErrors = validate(mode, { ...raw, acceptTerms: accepted ? "true" : "" });
    setErrors(nextErrors);
    // Field-level problems stop submission; the action is not invoked.
    if (Object.keys(nextErrors).length) { event.preventDefault(); }
  };

  const message = (key: string | undefined) => (key ? t(`auth.validation.${key}` as never) : undefined);

  if (isSuccess) return <SuccessState mode={mode} email={state.email} />;
  return <div className="w-full"><div><p className="text-sm font-semibold uppercase tracking-wider text-primary">{t("auth.brandLine")}</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{t(`auth.${mode}Title` as never)}</h1><p className="mt-2 text-muted-foreground">{t(`auth.${mode}Description` as never)}</p></div><form className="mt-8 space-y-5" noValidate action={formAction} onSubmit={submit}>
    {next && mode === "login" && <input type="hidden" name="next" value={next} />}
    {state.status === "error" && state.message && <Alert role="alert" className="flex items-start gap-2.5 border-destructive/30 bg-destructive-background text-destructive"><CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><span className="font-medium">{state.message}</span></Alert>}
    {mode === "register" && <Field id="fullName" label={t("auth.fullName")} error={message(errors.fullName)}><Input id="fullName" name="fullName" autoComplete="name" value={values.fullName ?? ""} onChange={(event) => setValue("fullName", event.target.value)} aria-invalid={Boolean(errors.fullName)} /></Field>}
    {mode === "register" && <fieldset><legend className="text-sm font-semibold">{t("auth.accountType")}</legend><div className="mt-2 grid gap-3 sm:grid-cols-2">{[["individual", t("auth.accountTypeIndividual"), t("auth.accountTypeIndividualHint")], ["business", t("auth.accountTypeBusiness"), t("auth.accountTypeBusinessHint")]].map(([value, label, hint]) => <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors ${values.accountType === value ? "border-primary bg-secondary" : "hover:bg-muted"}`}><input type="radio" name="accountType" value={value} checked={values.accountType === value} onChange={() => setValue("accountType", value)} className="mt-0.5 size-4 accent-primary" /><span><span className="block text-sm font-semibold">{label}</span><span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span></span></label>)}</div></fieldset>}
    {mode === "register" && values.accountType === "business" && <Field id="businessNui" label={t("auth.businessNui")} error={message(errors.businessNui)}><Input id="businessNui" name="businessNui" value={values.businessNui ?? ""} onChange={(event) => setValue("businessNui", event.target.value)} aria-invalid={Boolean(errors.businessNui)} required placeholder={t("auth.businessNuiPlaceholder")} inputMode="text" /><p className="mt-1.5 text-xs text-muted-foreground">{t("auth.businessNuiHint")}</p></Field>}
    {mode !== "reset" && <Field id="email" label={t("auth.email")} error={message(errors.email)}><div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="email" name="email" type="email" autoComplete="email" className="pl-9" value={values.email ?? ""} onChange={(event) => setValue("email", event.target.value)} aria-invalid={Boolean(errors.email)} /></div></Field>}
    {(mode === "login" || mode === "register" || mode === "reset") && <PasswordField name="password" label={mode === "reset" ? t("auth.newPassword") : t("auth.password")} autoComplete={mode === "login" ? "current-password" : "new-password"} value={values.password ?? ""} error={message(errors.password)} show={showPassword} onToggle={() => setShowPassword((show) => !show)} onChange={(value) => setValue("password", value)} />}
    {(mode === "register" || mode === "reset") && <PasswordField name="confirmPassword" label={t("auth.confirmPassword")} autoComplete="new-password" value={values.confirmPassword ?? ""} error={message(errors.confirmPassword)} show={showPassword} onToggle={() => setShowPassword((show) => !show)} onChange={(value) => setValue("confirmPassword", value)} />}
    {mode === "login" && <div className="flex items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm text-muted-foreground"><Checkbox name="remember" checked={values.remember === "true"} onChange={(event) => setValue("remember", String(event.target.checked))} />{t("auth.rememberMe")}</label><Link href="/forgot-password" className="text-sm font-semibold text-primary hover:underline">{t("auth.forgotPassword")}</Link></div>}
    {mode === "register" && <label className="flex items-start gap-3 text-sm text-muted-foreground"><Checkbox name="acceptTerms" checked={values.acceptTerms === "true"} onChange={(event) => setValue("acceptTerms", String(event.target.checked))} aria-invalid={Boolean(errors.acceptTerms)} /><span>{t("auth.acceptTerms", { terms: t("auth.termsOfUse"), privacy: t("auth.privacyNotice") })}</span></label>}
    {errors.acceptTerms && <p className="text-sm text-destructive" role="alert">{message(errors.acceptTerms)}</p>}
    <Button className="w-full" type="submit" disabled={isLoading}>{isLoading ? <><LoaderCircle className="size-4 animate-spin" />{t("auth.pleaseWait")}</> : t(`auth.${mode}Action` as never)}</Button>
  </form>
  {mode === "login" && <p className="mt-7 text-center text-sm text-muted-foreground">{t("auth.registerPrompt", { action: "" })}<Link href="/register" className="font-semibold text-primary hover:underline">{t("auth.registerPromptAction")}</Link></p>}
  {mode === "register" && <p className="mt-7 text-center text-sm text-muted-foreground">{t("auth.loginPrompt", { action: "" })}<Link href="/login" className="font-semibold text-primary hover:underline">{t("auth.loginPromptAction")}</Link></p>}
  {(mode === "forgot" || mode === "reset") && <Link href="/login" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><MoveLeft className="size-4" />{t("auth.backToSignIn")}</Link>}
  </div>;
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) { return <div><label htmlFor={id} className="text-sm font-semibold">{label}</label><div className="mt-2">{children}</div>{error && <p className="mt-1.5 text-sm text-destructive" role="alert">{error}</p>}</div>; }
function PasswordField({ label, name, autoComplete, value, error, show, onToggle, onChange }: { label: string; name: string; autoComplete: "current-password" | "new-password"; value: string; error?: string; show: boolean; onToggle: () => void; onChange: (value: string) => void }) { const t = useT(); const id = name; return <div><label htmlFor={id} className="text-sm font-semibold">{label}</label><div className="relative mt-2"><Input id={id} name={name} type={show ? "text" : "password"} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} className="pr-10" /><button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground" onClick={onToggle} aria-label={show ? t("auth.hidePassword") : t("auth.showPassword")}>{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div>{error && <p className="mt-1.5 text-sm text-destructive" role="alert">{error}</p>}</div>; }
function SuccessState({ mode, email }: { mode: AuthMode; email?: string }) { const t = useT(); const isLogin = mode === "login"; const isReset = mode === "reset"; const title = isLogin ? t("auth.signedInTitle") : isReset ? t("auth.passwordUpdatedTitle") : t("auth.checkInboxTitle"); const description = isLogin ? t("auth.signedInDescription") : isReset ? t("auth.passwordUpdatedDescription") : t("auth.checkInboxDescription", { email: email ?? "" }); return <div className="w-full text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-success-background text-success"><CheckCircle2 className="size-8" /></span><h1 className="mt-6 text-3xl font-bold tracking-tight">{title}</h1><p className="mx-auto mt-3 max-w-sm text-muted-foreground">{description}</p>{mode === "register" && <Alert className="mt-6 text-left">{t("auth.confirmationSent")}</Alert>}{(isLogin || isReset) && <Link href={isLogin ? "/applications" : "/login"} className="mt-8 inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">{isLogin ? t("auth.continueToGrants") : t("auth.backToSignIn")}</Link>}</div>; }
