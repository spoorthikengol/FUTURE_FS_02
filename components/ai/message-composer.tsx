"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";

type Channel = "email" | "whatsapp";

type EmailResult = { subject: string; body: string; mode: "live" | "demo" };
type WhatsAppResult = { message: string; mode: "live" | "demo" };

export function MessageComposer({ leadId, leadName }: { leadId: string; leadName: string }) {
  const [channel, setChannel] = useState<Channel>("email");
  const [instruction, setInstruction] = useState("");
  const [email, setEmail] = useState<EmailResult | null>(null);
  const [whatsapp, setWhatsapp] = useState<WhatsAppResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      if (channel === "email") {
        const result = await api<EmailResult>("/api/ai/email", {
          method: "POST",
          body: JSON.stringify({ leadId, instruction: instruction || undefined }),
        });
        setEmail(result);
        toast.success(result.mode === "demo" ? "Demo email generated" : "Email generated");
      } else {
        const result = await api<WhatsAppResult>("/api/ai/whatsapp", {
          method: "POST",
          body: JSON.stringify({ leadId, instruction: instruction || undefined }),
        });
        setWhatsapp(result);
        toast.success(result.mode === "demo" ? "Demo WhatsApp reply generated" : "WhatsApp reply generated");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    const text = channel === "email" ? (email ? `${email.subject}\n\n${email.body}` : "") : whatsapp?.message ?? "";
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  }

  const result = channel === "email" ? email : whatsapp;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">
          Draft only for <span className="text-muted-strong">{leadName}</span> — nothing is sent automatically.
        </p>
        <div className="flex rounded-lg border border-border p-0.5 text-xs">
          <button
            onClick={() => setChannel("email")}
            className={cn("rounded-md px-2.5 py-1", channel === "email" ? "bg-accent-soft text-accent" : "text-muted")}
          >
            Email
          </button>
          <button
            onClick={() => setChannel("whatsapp")}
            className={cn("rounded-md px-2.5 py-1", channel === "whatsapp" ? "bg-accent-soft text-accent" : "text-muted")}
          >
            WhatsApp
          </button>
        </div>
      </div>

      <Textarea
        placeholder={
          channel === "email"
            ? "Optional instruction, e.g. mention the proposal deadline"
            : "Optional instruction, e.g. keep it under 3 lines"
        }
        value={instruction}
        onChange={(event) => setInstruction(event.target.value)}
        className="min-h-16"
      />

      <div className="flex flex-wrap gap-2">
        <Button onClick={generate} disabled={loading}>
          {loading ? "Generating..." : result ? "Regenerate" : `Generate ${channel === "email" ? "email" : "WhatsApp"} reply`}
        </Button>
        <Button variant="secondary" onClick={copy} disabled={!result}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          Copy
        </Button>
      </div>

      {channel === "email" && email ? (
        <div className="space-y-2">
          <input
            className="h-10 w-full rounded-lg border border-border bg-zinc-950/40 px-3 text-sm"
            value={email.subject}
            onChange={(event) => setEmail({ ...email, subject: event.target.value })}
          />
          <textarea
            className="min-h-40 w-full rounded-lg border border-border bg-zinc-950/40 px-3 py-2 text-sm"
            value={email.body}
            onChange={(event) => setEmail({ ...email, body: event.target.value })}
          />
          <div className="flex items-center justify-between">
            <span />
            <Badge className={email.mode === "live" ? "bg-emerald-500/10 text-emerald-300" : "bg-zinc-500/10 text-zinc-300"}>
              {email.mode === "live" ? "Connected model" : "Demo mode"}
            </Badge>
          </div>
        </div>
      ) : null}

      {channel === "whatsapp" && whatsapp ? (
        <div className="space-y-2">
          <textarea
            className="min-h-28 w-full rounded-lg border border-border bg-zinc-950/40 px-3 py-2 text-sm"
            value={whatsapp.message}
            onChange={(event) => setWhatsapp({ ...whatsapp, message: event.target.value })}
          />
          <div className="flex items-center justify-between">
            <span />
            <Badge className={whatsapp.mode === "live" ? "bg-emerald-500/10 text-emerald-300" : "bg-zinc-500/10 text-zinc-300"}>
              {whatsapp.mode === "live" ? "Connected model" : "Demo mode"}
            </Badge>
          </div>
        </div>
      ) : null}
    </div>
  );
}
