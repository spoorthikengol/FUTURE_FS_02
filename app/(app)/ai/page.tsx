"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, Textarea } from "@/components/ui/input";
import { api } from "@/lib/client";
import type { LeadDTO, Paginated } from "@/types/crm";

type Message = { role: "user" | "assistant"; content: string };

export default function AiPage() {
  const [leads, setLeads] = useState<LeadDTO[]>([]);
  const [leadId, setLeadId] = useState("");
  const [input, setInput] = useState("Summarize this lead and recommend the next action.");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "I'm Velora AI. Ask for lead summaries, insights, email drafts, conversion analysis, or follow-up suggestions. If no model key is configured, I'll use a safe demo mode.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void api<Paginated<LeadDTO>>("/api/leads?pageSize=50").then((data) => setLeads(data.items));
  }, []);

  async function send() {
    if (!input.trim()) return;
    const history = messages;
    const nextMessages: Message[] = [...messages, { role: "user", content: input }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    try {
      const result = await api<{ reply: string; mode: string; disclaimer: string }>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          message: input,
          leadId: leadId || undefined,
          history: history.map(({ role, content }) => ({ role, content })),
        }),
      });
      setMessages([
        ...nextMessages,
        { role: "assistant", content: `${result.reply}\n\n_${result.disclaimer}_` },
      ]);
    } catch (error) {
      setMessages([
        ...nextMessages,
        { role: "assistant", content: error instanceof Error ? error.message : "Assistant unavailable" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Velora AI</h1>
        <p className="text-sm text-muted">Intelligent CRM assistant. Recommendations only — not guaranteed outcomes.</p>
      </div>
      <Select value={leadId} onChange={(e) => setLeadId(e.target.value)}>
        <option value="">No lead context</option>
        {leads.map((lead) => (
          <option key={lead.id} value={lead.id}>
            {lead.name} · {lead.company}
          </option>
        ))}
      </Select>
      <Card className="min-h-[420px] space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`max-w-[90%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
              message.role === "user" ? "ml-auto bg-accent-soft text-foreground" : "bg-white/3 text-muted-strong"
            }`}
          >
            {message.content}
          </div>
        ))}
      </Card>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Textarea
          className="min-h-20"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Velora AI..."
        />
        <Button onClick={send} disabled={loading} className="sm:self-end">
          {loading ? "Thinking..." : "Send"}
        </Button>
      </div>
    </div>
  );
}
