"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  Check,
  DollarSign,
  Gauge,
  Plus,
  Settings as SettingsIcon,
  Trash2,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { api } from "@/lib/client";
import type { LeadSource } from "@/types/crm";
import { cn } from "@/lib/utils";

type Campaign = {
  id: string;
  name: string;
  source: LeadSource;
  spend: number;
  month: string;
};

type SettingsResponse = {
  marketingSpend: number;
  slaThresholdMinutes: number;
  campaigns: Campaign[];
};

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function SettingsPage() {
  const [marketingSpend, setMarketingSpend] = useState(0);
  const [slaThresholdMinutes, setSlaThresholdMinutes] = useState(5);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  /* ------------------------------------------------------------------------ */
  /* LOAD SETTINGS                                                            */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await api<SettingsResponse>("/api/settings");

        setMarketingSpend(data.marketingSpend);
        setSlaThresholdMinutes(data.slaThresholdMinutes);
        setCampaigns(data.campaigns);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load settings",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadSettings();
  }, []);

  /* ------------------------------------------------------------------------ */
  /* SAVE                                                                     */
  /* ------------------------------------------------------------------------ */

  async function save() {
    setSaving(true);

    try {
      await api("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          marketingSpend,
          slaThresholdMinutes,
          campaigns,
        }),
      });

      toast.success("Settings saved");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Save failed",
      );
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* CAMPAIGNS                                                                */
  /* ------------------------------------------------------------------------ */

  function addCampaign() {
    setCampaigns((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: "New campaign",
        source: "Website",
        spend: 0,
        month: new Date().toISOString().slice(0, 7),
      },
    ]);
  }

  function updateCampaign(
    id: string,
    updates: Partial<Campaign>,
  ) {
    setCampaigns((current) =>
      current.map((campaign) =>
        campaign.id === id
          ? { ...campaign, ...updates }
          : campaign,
      ),
    );
  }

  function removeCampaign(id: string) {
    setCampaigns((current) =>
      current.filter(
        (campaign) => campaign.id !== id,
      ),
    );
  }

  /* ------------------------------------------------------------------------ */
  /* LOADING                                                                  */
  /* ------------------------------------------------------------------------ */

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-5 pb-8">
        <div className="h-32 animate-pulse rounded-2xl border border-border bg-white/[0.025]" />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-28 animate-pulse rounded-2xl border border-border bg-white/[0.025]" />
          <div className="h-28 animate-pulse rounded-2xl border border-border bg-white/[0.025]" />
        </div>

        <div className="h-32 animate-pulse rounded-2xl border border-border bg-white/[0.025]" />

        <div className="h-72 animate-pulse rounded-2xl border border-border bg-white/[0.025]" />
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">

      {/* ================================================================== */}
      {/* HEADER                                                             */}
      {/* ================================================================== */}

      <section
        className="
          relative overflow-hidden
          rounded-2xl
          border border-border
          bg-gradient-to-br
          from-accent/[0.07]
          via-transparent
          to-transparent
          p-5 sm:p-6
        "
      >
        <div
          className="
            pointer-events-none
            absolute -right-24 -top-24
            h-56 w-56
            rounded-full
            bg-accent/[0.05]
            blur-3xl
          "
        />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">

              <div
                className="
                  flex h-10 w-10 shrink-0
                  items-center justify-center
                  rounded-xl
                  border border-accent/20
                  bg-accent/10
                  text-accent
                "
              >
                <SettingsIcon
                  className="h-5 w-5"
                  aria-hidden="true"
                />
              </div>

              <div>
                <h1
                  className="
                    text-2xl
                    font-semibold
                    tracking-tight
                    text-foreground
                  "
                >
                  Settings
                </h1>

                <p className="mt-0.5 text-xs text-muted">
                  Configure workspace preferences and analytics inputs
                </p>
              </div>

            </div>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-strong">
              Manage the values your CRM uses for marketing analytics,
              response-time tracking and campaign performance.
            </p>
          </div>

          {/* SAVE */}
          <Button
            onClick={save}
            disabled={saving}
            className="
              shrink-0
              gap-2
              rounded-xl
              px-4
            "
          >
            {saving ? (
              "Saving..."
            ) : (
              <>
                <Check
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                />
                Save changes
              </>
            )}
          </Button>
        </div>
      </section>

      {/* ================================================================== */}
      {/* ACCOUNT                                                            */}
      {/* ================================================================== */}

      <Card
        className="
          overflow-hidden
          border-border
          bg-gradient-to-br
          from-white/[0.035]
          to-transparent
        "
      >
        <CardHeader
          title="Account"
          description="Administrator session and workspace access."
        />

        <div className="px-5 pb-5">

          <div
            className="
              flex flex-col gap-4
              rounded-xl
              border border-border
              bg-black/10
              p-4
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <div className="flex min-w-0 items-center gap-3">

              <div
                className="
                  flex h-10 w-10 shrink-0
                  items-center justify-center
                  rounded-xl
                  border border-border
                  bg-white/[0.03]
                  text-muted-strong
                "
              >
                <UserRound
                  className="h-4 w-4"
                  aria-hidden="true"
                />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-medium text-muted">
                  Signed-in administrator
                </p>

                <p className="mt-1 truncate text-sm font-semibold text-foreground">
                  ivan.p@example.net
                </p>
              </div>

            </div>

            <div
              className="
                rounded-lg
                border border-border
                bg-white/[0.025]
                px-3 py-2
                text-[10px]
                text-muted
              "
            >
              Secure session
            </div>

          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            Password credentials are stored securely as a bcrypt hash.
          </p>

        </div>
      </Card>

      {/* ================================================================== */}
      {/* ANALYTICS SETTINGS                                                 */}
      {/* ================================================================== */}

      <div className="grid gap-4 md:grid-cols-2">

        {/* MARKETING SPEND */}
        <Card
          className="
            border-border
            bg-gradient-to-br
            from-white/[0.035]
            to-transparent
            transition-all duration-200
            hover:border-accent/15
          "
        >
          <CardHeader
            title="Marketing spend"
            description="Total marketing investment used by ROI analytics."
          />

          <div className="px-5 pb-5">

            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-white/[0.03] text-accent">
              <DollarSign
                className="h-4 w-4"
                aria-hidden="true"
              />
            </div>

            <Label htmlFor="marketing-spend">
              Total marketing spend
            </Label>

            <div className="relative mt-2">
              <span
                className="
                  pointer-events-none
                  absolute left-3 top-1/2
                  -translate-y-1/2
                  text-xs text-muted
                "
              >
                $
              </span>

              <Input
                id="marketing-spend"
                type="number"
                min={0}
                value={marketingSpend}
                onChange={(e) =>
                  setMarketingSpend(
                    Number(e.target.value),
                  )
                }
                className="pl-7"
              />
            </div>

            <p className="mt-2 text-[10px] text-muted">
              Used to calculate marketing efficiency and ROI.
            </p>

          </div>
        </Card>

        {/* SPEED TO LEAD */}
        <Card
          className="
            border-border
            bg-gradient-to-br
            from-white/[0.035]
            to-transparent
            transition-all duration-200
            hover:border-accent/15
          "
        >
          <CardHeader
            title="Speed to Lead"
            description="Response-time target used by lead analytics."
          />

          <div className="px-5 pb-5">

            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-white/[0.03] text-accent">
              <Gauge
                className="h-4 w-4"
                aria-hidden="true"
              />
            </div>

            <Label htmlFor="sla-threshold">
              SLA threshold
            </Label>

            <div className="relative mt-2">
              <Input
                id="sla-threshold"
                type="number"
                min={1}
                value={slaThresholdMinutes}
                onChange={(e) =>
                  setSlaThresholdMinutes(
                    Number(e.target.value),
                  )
                }
                className="pr-16"
              />

              <span
                className="
                  pointer-events-none
                  absolute right-3 top-1/2
                  -translate-y-1/2
                  text-xs text-muted
                "
              >
                minutes
              </span>
            </div>

            <p className="mt-2 text-[10px] text-muted">
              Responses within this threshold count as on-time.
            </p>

          </div>
        </Card>

      </div>

      {/* ================================================================== */}
      {/* CAMPAIGNS                                                          */}
      {/* ================================================================== */}

      <Card
        className="
          overflow-hidden
          border-border
          bg-gradient-to-br
          from-white/[0.035]
          to-transparent
        "
      >

        <div
          className="
            flex flex-col gap-3
            border-b border-border
            px-5 py-4
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div>
            <div className="flex items-center gap-2.5">

              <div
                className="
                  flex h-8 w-8
                  items-center justify-center
                  rounded-lg
                  border border-border
                  bg-white/[0.03]
                  text-accent
                "
              >
                <BarChart3
                  className="h-4 w-4"
                  aria-hidden="true"
                />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Campaigns
                </h2>

                <p className="mt-0.5 text-xs text-muted">
                  Manage campaign spend used by ROI analytics.
                </p>
              </div>

            </div>
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={addCampaign}
            className="gap-1.5 rounded-xl"
          >
            <Plus
              className="h-3.5 w-3.5"
              aria-hidden="true"
            />
            Add campaign
          </Button>
        </div>

        <div className="p-5">

          {campaigns.length === 0 ? (
            <div
              className="
                rounded-xl
                border border-dashed border-border
                bg-black/10
                px-5 py-12
                text-center
              "
            >
              <div
                className="
                  mx-auto flex h-11 w-11
                  items-center justify-center
                  rounded-xl
                  border border-border
                  bg-white/[0.03]
                  text-muted
                "
              >
                <BarChart3
                  className="h-5 w-5"
                  aria-hidden="true"
                />
              </div>

              <p className="mt-4 text-sm font-semibold text-foreground">
                No campaigns yet
              </p>

              <p className="mt-1 text-xs text-muted">
                Add a campaign to start tracking marketing spend.
              </p>

              <Button
                size="sm"
                variant="secondary"
                onClick={addCampaign}
                className="mt-4 gap-1.5 rounded-xl"
              >
                <Plus
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                />
                Add campaign
              </Button>
            </div>
          ) : (
            <div className="space-y-3">

              {campaigns.map((campaign, index) => (
                <div
                  key={campaign.id}
                  className="
                    rounded-2xl
                    border border-border
                    bg-black/10
                    p-4
                    transition-all duration-200
                    hover:border-accent/15
                  "
                >

                  {/* CAMPAIGN HEADER */}
                  <div className="mb-3 flex items-center justify-between">

                    <div className="flex items-center gap-2">

                      <span
                        className="
                          flex h-6 w-6
                          items-center justify-center
                          rounded-lg
                          border border-border
                          bg-white/[0.03]
                          text-[10px]
                          font-medium
                          text-muted
                        "
                      >
                        {index + 1}
                      </span>

                      <span className="text-xs font-medium text-muted">
                        Campaign
                      </span>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeCampaign(
                          campaign.id,
                        )
                      }
                      className="
                        flex h-8 w-8
                        items-center justify-center
                        rounded-lg
                        border border-transparent
                        text-muted
                        transition-all
                        hover:border-border
                        hover:bg-white/[0.03]
                        hover:text-foreground
                      "
                      aria-label={`Remove ${campaign.name}`}
                    >
                      <Trash2
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                    </button>

                  </div>

                  {/* INPUTS */}
                  <div className="grid gap-3 md:grid-cols-3">

                    <div>
                      <Label
                        htmlFor={`campaign-name-${campaign.id}`}
                      >
                        Campaign name
                      </Label>

                      <Input
                        id={`campaign-name-${campaign.id}`}
                        value={campaign.name}
                        onChange={(e) =>
                          updateCampaign(
                            campaign.id,
                            {
                              name: e.target.value,
                            },
                          )
                        }
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor={`campaign-spend-${campaign.id}`}
                      >
                        Spend
                      </Label>

                      <div className="relative mt-2">
                        <span
                          className="
                            pointer-events-none
                            absolute left-3 top-1/2
                            -translate-y-1/2
                            text-xs text-muted
                          "
                        >
                          $
                        </span>

                        <Input
                          id={`campaign-spend-${campaign.id}`}
                          type="number"
                          min={0}
                          value={campaign.spend}
                          onChange={(e) =>
                            updateCampaign(
                              campaign.id,
                              {
                                spend: Number(
                                  e.target.value,
                                ),
                              },
                            )
                          }
                          className="pl-7"
                        />
                      </div>
                    </div>

                    <div>
                      <Label
                        htmlFor={`campaign-month-${campaign.id}`}
                      >
                        Month
                      </Label>

                      <Input
                        id={`campaign-month-${campaign.id}`}
                        type="month"
                        value={campaign.month}
                        onChange={(e) =>
                          updateCampaign(
                            campaign.id,
                            {
                              month: e.target.value,
                            },
                          )
                        }
                        className="mt-2"
                      />
                    </div>

                  </div>

                  {/* SOURCE */}
                  <div className="mt-3 flex items-center justify-between">

                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted">
                        Source
                      </p>

                      <p className="mt-0.5 text-xs font-medium text-foreground">
                        {campaign.source}
                      </p>
                    </div>

                    <span
                      className={cn(
                        "rounded-lg",
                        "border border-border",
                        "bg-white/[0.025]",
                        "px-2 py-1",
                        "text-[10px]",
                        "text-muted",
                      )}
                    >
                      ROI tracking
                    </span>

                  </div>

                </div>
              ))}

            </div>
          )}

        </div>

      </Card>

      {/* ================================================================== */}
      {/* SAVE FOOTER                                                        */}
      {/* ================================================================== */}

      <div
        className="
          flex flex-col gap-3
          rounded-2xl
          border border-border
          bg-black/10
          p-4
          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >
        <div>
          <p className="text-xs font-medium text-foreground">
            Ready to apply your changes?
          </p>

          <p className="mt-0.5 text-[10px] text-muted">
            Changes affect the analytics and reporting shown across the CRM.
          </p>
        </div>

        <Button
          onClick={save}
          disabled={saving}
          className="shrink-0 gap-2 rounded-xl"
        >
          <Check
            className="h-3.5 w-3.5"
            aria-hidden="true"
          />

          {saving ? "Saving..." : "Save settings"}
        </Button>
      </div>

    </div>
  );
}