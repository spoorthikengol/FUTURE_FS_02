"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { api } from "@/lib/client";

const DEMO_EMAIL = "ivan.p@example.net";
const DEMO_PASSWORD = "VeloraAdmin123!";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  async function signIn(
    loginEmail: string,
    loginPassword: string,
    isDemo = false,
  ) {
    if (isDemo) {
      setDemoLoading(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      // Demo should always go directly to dashboard
      if (isDemo) {
        router.replace("/dashboard");
      } else {
        const next = searchParams.get("next") || "/dashboard";
        router.replace(next);
      }
      // Intentionally no router.refresh() here: calling refresh() immediately
      // after replace() can race with the still-pending navigation transition
      // (both are non-blocking/uncommitted router operations), which can leave
      // the UI stuck on this page even though the destination route already
      // resolved successfully server-side. replace() alone renders the
      // destination with fresh server data since it's a real navigation, not
      // an in-place revalidation.
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in",
      );
      // Only reset the loading state on failure. On success we deliberately
      // leave the button in its loading/disabled state: this component is
      // about to unmount as the browser navigates to the destination route,
      // and resetting state here would just risk a premature flicker back to
      // the idle button if navigation takes a moment to commit.
      setLoading(false);
      setDemoLoading(false);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    await signIn(email, password, false);
  }

  async function handleDemo() {
    // Automatically log in with the seeded demo account.
    await signIn(DEMO_EMAIL, DEMO_PASSWORD, true);
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col justify-center">

        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">

          {/* Header */}
          <div className="text-center">
            <h1 className="text-2xl font-semibold">
              Welcome back
            </h1>

            <p className="mt-2 text-sm text-muted">
              Sign in to your VeloraCRM workspace and manage
              your leads with confidence.
            </p>
          </div>

          {/* Login Form */}
          <form
            onSubmit={onSubmit}
            className="mt-7 space-y-5"
          >
            {/* Email */}
            <div>
              <Label htmlFor="email">
                Email address
              </Label>

              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                autoComplete="email"
                disabled={loading || demoLoading}
              />
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password">
                Password
              </Label>

              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                autoComplete="current-password"
                disabled={loading || demoLoading}
              />
            </div>

            {/* Error */}
            <FieldError message={error} />

            {/* Sign In */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || demoLoading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />

            <span className="text-xs text-muted">
              OR
            </span>

            <div className="h-px flex-1 bg-border" />
          </div>

          {/* DEMO BUTTON */}
          <Button
  type="button"
  className="w-full"
  onClick={handleDemo}
  disabled={loading || demoLoading}
>
  {demoLoading
    ? "Opening demo..."
    : "✨ Try Demo — No signup needed"}
</Button>

          {/* Signup */}
          <p className="mt-6 text-center text-sm text-muted">
            Don't have an account?{" "}
            <a
              href="/signup"
              className="font-medium text-primary hover:underline"
            >
              Create your workspace
            </a>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted">
          By continuing, you agree to VeloraCRM's terms
          and privacy policy.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Loading...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}