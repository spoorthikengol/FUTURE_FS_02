import { NextRequest } from "next/server";

import { buildCrmSnapshot } from "@/lib/ai/context";
import { buildDealRiskRadar } from "@/lib/ai/deal-risk";
import { fail, ok } from "@/lib/api";

export async function GET(
  request: NextRequest,
) {
  try {
    const snapshot =
      await buildCrmSnapshot();

    const radar =
      buildDealRiskRadar(snapshot);

    const leadId =
      request.nextUrl.searchParams.get(
        "leadId",
      );

    if (leadId) {
      const lead = radar.leads.find(
        (item) => item.id === leadId,
      );

      if (!lead) {
        return fail(
          "Deal risk lead not found.",
          404,
        );
      }

      return ok({
        generatedAt: radar.generatedAt,
        leads: [lead],
        summary: {
          total: 1,
          highRisk:
            lead.riskLevel === "High Risk"
              ? 1
              : 0,
          needsAttention:
            lead.riskLevel ===
            "Needs Attention"
              ? 1
              : 0,
          healthy:
            lead.riskLevel === "Healthy"
              ? 1
              : 0,
        },
      });
    }

    return ok(radar);
  } catch (error) {
    console.error(
      "Deal risk API error:",
      error,
    );

    return fail(
      error instanceof Error
        ? error.message
        : "Failed to build deal risk radar.",
      500,
    );
  }
}