"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileAction, type ProfileActionState } from "../actions/profile-actions";

const initialState: ProfileActionState = { status: "idle" };

/** Own-profile form: display-name editing with server-side validation. */
export function ProfileForm({ fullName, email }: { fullName: string; email: string | null }) {
  const [state, formAction, isPending] = useActionState<ProfileActionState, FormData>(updateProfileAction, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border bg-card p-5">
      {state.status === "success" && state.message && (
        <p className="rounded-md border border-success/30 bg-success-background px-3 py-2 text-sm font-medium text-success" role="status">{state.message}</p>
      )}
      {state.status === "error" && state.message && (
        <p className="rounded-md border border-destructive/30 bg-destructive-background px-3 py-2 text-sm text-destructive" role="alert">{state.message}</p>
      )}
      <div>
        <Label htmlFor="profile-email">Email (account)</Label>
        <Input id="profile-email" value={email ?? "—"} readOnly disabled className="mt-1 bg-muted" />
        <p className="mt-1 text-xs text-muted-foreground">The account email is your notification address and cannot be changed here.</p>
      </div>
      <div>
        <Label htmlFor="profile-full-name">Full name</Label>
        <Input id="profile-full-name" name="fullName" defaultValue={fullName} required maxLength={120} className="mt-1" />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
        Save profile
      </Button>
    </form>
  );
}
