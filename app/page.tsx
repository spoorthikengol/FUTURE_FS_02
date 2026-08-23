import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { getSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <Logo />
        <div className="flex gap-2">
          <Link href="/contact">
            <Button variant="secondary">Contact</Button>
          </Link>
          <Link href="/login">
            <Button>Sign in</Button>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-20">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">AI-powered CRM</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
          Turn leads into relationships.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted">
          VeloraCRM helps revenue teams capture, qualify, and convert pipeline with a premium
          workspace, activity timeline, and an AI copilot that stays in recommendation mode.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login">
            <Button size="lg">Open workspace</Button>
          </Link>
          <Link href="/contact">
            <Button size="lg" variant="secondary">
              Capture a website lead
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
