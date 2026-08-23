"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { api } from "@/lib/client";

type EmailResult = { subject: string; body: string; mode: "live" | "demo" };

export function EmailGenerator({ leadId }: { leadId: string }) {
  const [instruction, setInstruction] = useState("");
  const [email, setEmail] = useState<EmailResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const result = await api<EmailResult>("/api/ai/email", {
        method: "POST",
        body: JSON.stringify({ leadId, instruction }),
      });
      setEmail(result);
      toast.success(result.mode === "demo" ? "Demo email generated" : "Email generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!email) return;
    await navigator.clipboard.writeText(`${email.subject}\n\n${email.body}`);
    toast.success("Copied to clipboard");
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Generates a draft only. Emails are never sent automatically. This is an AI recommendation.
      </p>
      <Textarea
        placeholder="Optional instruction, e.g. mention the proposal deadline"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button onClick={generate} disabled={loading}>
          {loading ? "Generating..." : email ? "Regenerate" : "Generate email reply"}
        </Button>
        <Button variant="secondary" onClick={copy} disabled={!email}>
          Copy
        </Button>
      </div>
      {email ? (
        <div className="space-y-2">
          <input
            className="h-10 w-full rounded-lg border border-border bg-zinc-950/40 px-3 text-sm"
            value={email.subject}
            onChange={(e) => setEmail({ ...email, subject: e.target.value })}
          />
          <textarea
            className="min-h-48 w-full rounded-lg border border-border bg-zinc-950/40 px-3 py-2 text-sm"
            value={email.body}
            onChange={(e) => setEmail({ ...email, body: e.target.value })}
          />
          <p className="text-[11px] text-zinc-500">Mode: {email.mode === "live" ? "connected model" : "demo fallback"}</p>
        </div>
      ) : null}
    </div>
  );
}
