"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { api } from "@/lib/client";
import type { LeadSource } from "@/types/crm";

type Campaign = {
  id: string;
  name: string;
  source: LeadSource;
  spend: number;
  month: string;
};

export default function SettingsPage() {
  const [marketingSpend, setMarketingSpend] = useState(0);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void api<{ marketingSpend: number; campaigns: Campaign[] }>("/api/settings").then((data) => {
      setMarketingSpend(data.marketingSpend);
      setCampaigns(data.campaigns);
    });
  }, []);

  async function save() {
    setSaving(true);
    try {
      await api("/api/settings", {
        method: "PUT",
        body: JSON.stringify({ marketingSpend, campaigns }),
      });
      toast.success("Settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted">Workspace preferences used by ROI analytics.</p>
      </div>
      <Card>
        <CardHeader title="Account" description="Signed-in admin session. Password is stored as a bcrypt hash." />
        <p className="text-sm text-muted">
          Demo login: <span className="text-foreground">ivan.p@example.net</span>
        </p>
      </Card>
      <Card>
        <CardHeader title="Marketing spend" />
        <Label>Total marketing spend</Label>
        <Input
          type="number"
          min={0}
          value={marketingSpend}
          onChange={(e) => setMarketingSpend(Number(e.target.value))}
        />
      </Card>
      <Card>
        <CardHeader
          title="Campaigns"
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                setCampaigns([
                  ...campaigns,
                  {
                    id: crypto.randomUUID(),
                    name: "New campaign",
                    source: "Website",
                    spend: 0,
                    month: new Date().toISOString().slice(0, 7),
                  },
                ])
              }
            >
              Add campaign
            </Button>
          }
        />
        <div className="space-y-3">
          {campaigns.map((campaign, index) => (
            <div key={campaign.id} className="grid gap-2 rounded-xl border border-border p-3 md:grid-cols-4">
              <Input
                value={campaign.name}
                onChange={(e) =>
                  setCampaigns(campaigns.map((item, i) => (i === index ? { ...item, name: e.target.value } : item)))
                }
              />
              <Input
                type="number"
                value={campaign.spend}
                onChange={(e) =>
                  setCampaigns(
                    campaigns.map((item, i) => (i === index ? { ...item, spend: Number(e.target.value) } : item)),
                  )
                }
              />
              <Input
                value={campaign.month}
                onChange={(e) =>
                  setCampaigns(campaigns.map((item, i) => (i === index ? { ...item, month: e.target.value } : item)))
                }
              />
              <Button
                variant="ghost"
                onClick={() => setCampaigns(campaigns.filter((item) => item.id !== campaign.id))}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save settings"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
