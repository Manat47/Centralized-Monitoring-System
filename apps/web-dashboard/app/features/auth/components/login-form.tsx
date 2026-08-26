"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { AuthBrand } from "./auth-shell";
import { useAuth } from "./auth-provider";
import { AuthSystemVisual } from "./auth-system-visual";

function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Unable to sign in";
  }

  try {
    const parsed = JSON.parse(error.message) as {
      message?: string | string[];
    };

    if (Array.isArray(parsed.message)) {
      return parsed.message.join(", ");
    }

    if (typeof parsed.message === "string") {
      return parsed.message;
    }
  } catch {
    // Error message is not JSON.
  }

  return error.message;
}

export function LoginForm() {
  const router = useRouter();
  const { login, status, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login({ email, password });
      router.replace("/");
      router.refresh();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  const isCheckingSession = status === "loading" || isAuthenticated;

  return (
    <div className="mx-auto grid min-h-svh w-full max-w-[1600px] lg:grid-cols-[minmax(0,0.93fr)_minmax(540px,1.07fr)]">
      <section className="flex min-h-svh flex-col px-6 py-7 sm:px-12 lg:px-14 xl:px-20">
        <AuthBrand />

        <div className="flex flex-1 items-center py-16">
          <div className="w-full max-w-[440px]">
            {isCheckingSession ? (
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <LoaderCircle className="size-4 animate-spin text-blue-400" />
                Checking session...
              </div>
            ) : (
              <>
                <div className="mb-9">
                  <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                    Sign in to Monitoring
                  </h1>
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    Access infrastructure metrics, health checks, alerts, and operational history.
                  </p>
                </div>

                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-slate-200">
                      Work email
                    </Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        disabled={isSubmitting}
                        aria-invalid={Boolean(errorMessage)}
                        className="h-12 rounded-lg border-white/15 bg-black/20 pl-10 text-white placeholder:text-slate-600 focus-visible:border-blue-400 focus-visible:ring-blue-400/20"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-slate-200">
                      Password
                    </Label>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        minLength={8}
                        maxLength={72}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        disabled={isSubmitting}
                        aria-invalid={Boolean(errorMessage)}
                        className="h-12 rounded-lg border-white/15 bg-black/20 px-10 text-white focus-visible:border-blue-400 focus-visible:ring-blue-400/20"
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

                  {errorMessage && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-lg border border-red-400/20 bg-red-950/40 px-3 py-2.5 text-sm text-red-200"
                    >
                      <AlertCircle className="mt-0.5 size-4 shrink-0" />
                      <p>{errorMessage}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="h-12 w-full justify-center bg-white text-slate-950 hover:bg-slate-200 focus-visible:ring-white/30"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <LoaderCircle className="animate-spin" />}
                    {isSubmitting ? "Signing in..." : "Sign in"}
                    {!isSubmitting && <ArrowRight data-icon="inline-end" />}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600">
          <ShieldCheck className="size-3.5" />
          Authorized access only
        </div>
      </section>

      <AuthSystemVisual />
    </div>
  );
}
