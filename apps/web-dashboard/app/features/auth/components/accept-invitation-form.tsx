"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  acceptInvitation,
  type InvitationDetails,
  validateInvitation,
} from "../api/invitation";
import { AuthBrand } from "./auth-shell";

interface AcceptInvitationFormProps {
  token: string;
}

function InvitationFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col px-6 py-7 sm:px-10">
      <AuthBrand />
      <div className="flex flex-1 items-center justify-center py-16">
        <div className="w-full max-w-[480px]">{children}</div>
      </div>
    </div>
  );
}

function formatExpiration(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value));
}

function getInitial(displayName: string): string {
  return displayName.trim().charAt(0).toUpperCase() || "U";
}

export function AcceptInvitationForm({ token }: AcceptInvitationFormProps) {
  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [validationError, setValidationError] = useState<string | null>(
    token ? null : "This invitation link is incomplete.",
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    let active = true;

    if (!token) {
      return;
    }

    void validateInvitation(token)
      .then((result) => active && setDetails(result))
      .catch((error: unknown) => {
        if (active) {
          setValidationError(
            error instanceof Error
              ? error.message
              : "Invitation is invalid or expired",
          );
        }
      })
      .finally(() => active && setIsLoading(false));

    return () => {
      active = false;
    };
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await acceptInvitation(token, password);
      setAccepted(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Unable to set password",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <InvitationFrame>
        <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-400">
          <LoaderCircle className="size-4 animate-spin text-blue-400" />
          Checking invitation...
        </div>
      </InvitationFrame>
    );
  }

  if (validationError || !details) {
    return (
      <InvitationFrame>
        <div className="mb-5 flex size-11 items-center justify-center rounded-lg border border-amber-400/20 bg-amber-400/10 text-amber-300">
          <TriangleAlert className="size-5" />
        </div>
        <h1 className="text-2xl font-semibold text-white">Invitation unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          {validationError ?? "This invitation cannot be used."}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Ask an administrator to resend the invitation if you still need access.
        </p>
        <Link
          href="/login"
          className={buttonVariants({
            variant: "outline",
            className:
              "mt-7 h-11 w-full border-white/15 bg-transparent text-slate-200 hover:bg-white/10 hover:text-white",
          })}
        >
          Back to sign in
        </Link>
      </InvitationFrame>
    );
  }

  if (accepted) {
    return (
      <InvitationFrame>
        <div className="mb-5 flex size-11 items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
          <CheckCircle2 className="size-5" />
        </div>
        <h1 className="text-2xl font-semibold text-white">Account ready</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Your password has been set. Sign in with {details.email}.
        </p>
        <Link
          href="/login"
          className={buttonVariants({
            className: "mt-7 h-11 w-full bg-white text-slate-950 hover:bg-slate-200",
          })}
        >
          Sign in
        </Link>
      </InvitationFrame>
    );
  }

  return (
    <InvitationFrame>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-sm font-semibold text-white">
          {getInitial(details.displayName)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">
            {details.displayName}
          </p>
          <p className="truncate text-xs text-slate-500">{details.email}</p>
        </div>
      </div>

      <h1 className="text-3xl font-semibold text-white">
        Join Monitoring Control Plane
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-400">
        Set a password for <span className="font-medium text-slate-200">{details.email}</span>.
        The invitation expires {formatExpiration(details.expiresAt)}.
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="new-password" className="text-sm font-medium text-slate-200">
            Password
          </Label>
          <div className="relative">
            <Input
              id="new-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              placeholder="Use 8-72 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting}
              className="h-12 rounded-lg border-white/15 bg-black/20 pr-11 text-white placeholder:text-slate-600 focus-visible:border-blue-400 focus-visible:ring-blue-400/20"
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:bg-white/10 hover:text-slate-200"
              onClick={() => setShowPassword((value) => !value)}
              disabled={isSubmitting}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff /> : <Eye />}
              <span className="sr-only">
                {showPassword ? "Hide password" : "Show password"}
              </span>
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password" className="text-sm font-medium text-slate-200">
            Confirm password
          </Label>
          <Input
            id="confirm-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={isSubmitting}
            className="h-12 rounded-lg border-white/15 bg-black/20 text-white focus-visible:border-blue-400 focus-visible:ring-blue-400/20"
            required
          />
        </div>

        {submitError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-400/20 bg-red-950/40 px-3 py-2.5 text-sm text-red-200"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <p>{submitError}</p>
          </div>
        )}

        <Button
          type="submit"
          className="h-12 w-full bg-white text-slate-950 hover:bg-slate-200 focus-visible:ring-white/30"
          disabled={isSubmitting}
        >
          {isSubmitting && <LoaderCircle className="animate-spin" />}
          {isSubmitting ? "Setting password..." : "Accept invitation"}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-500">
        Already activated your account?{" "}
        <Link href="/login" className="text-slate-300 underline underline-offset-4 hover:text-white">
          Sign in
        </Link>
      </p>
    </InvitationFrame>
  );
}
