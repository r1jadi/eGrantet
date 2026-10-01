"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { signOutAction } from "../actions/auth-actions";

export function SignOutButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className={className}
      disabled={isPending}
      onClick={() => startTransition(async () => { await signOutAction(); router.refresh(); })}
    >
      {children}
    </button>
  );
}
