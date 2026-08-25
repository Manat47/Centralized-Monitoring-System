"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  acceptInvitation,
  type InvitationDetails,
  validateInvitation,
} from "../api/invitation";

interface AcceptInvitationFormProps {
  token: string;
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
      <Card className="w-full max-w-md">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Checking invitation...
        </CardContent>
      </Card>
    );
  }

  if (validationError || !details) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Invitation unavailable</CardTitle>
          <CardDescription>
            {validationError ?? "This invitation cannot be used."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Ask an administrator to resend the invitation if you still need access.
          </p>
          <Button
            render={<Link href="/login" />}
            nativeButton={false}
            variant="outline"
            className="w-full"
          >
            Back to sign in
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (accepted) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <CheckCircle2 className="size-10 text-emerald-600" />
          <CardTitle>Account ready</CardTitle>
          <CardDescription>
            Your password has been set. Sign in with {details.email}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            render={<Link href="/login" />}
            nativeButton={false}
            className="w-full"
          >
            Sign in
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="mb-1 flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <KeyRound className="size-5" />
        </div>
        <CardTitle>Set your password</CardTitle>
        <CardDescription>
          Welcome, {details.displayName}. Complete the account for {details.email}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
                className="pr-10"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => setShowPassword((value) => !value)}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Use 8-72 characters.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Setting password..." : "Set password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
