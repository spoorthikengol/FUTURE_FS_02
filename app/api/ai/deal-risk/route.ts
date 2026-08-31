import { NextRequest, NextResponse } from "next/server";

import { buildCrmSnapshot } from "@/lib/ai/context";
import { buildDealRiskRadar } from "@/lib/ai/deal-risk";

export async function GET(request: NextRequest) {
  try {
    const snapshot = await buildCrmSnapshot();

    const radar = buildDealRiskRadar({
      leads: snapshot.leads.map((lead) => ({
        ...lead,
        followUps: [],
      })),
    });

    const leadId = request.nextUrl.searchParams.get("leadId");

    if (leadId) {
      const lead = radar.leads.find(
        (item) => item.id === leadId,
      );

      if (!lead) {
        return NextResponse.json(
          {
            success: false,
            error: "Deal risk lead not found.",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          generatedAt: radar.generatedAt,
          leads: [lead],
          summary: {
            total: 1,
            highRisk:
              lead.riskLevel === "High Risk" ? 1 : 0,
            needsAttention:
              lead.riskLevel === "Needs Attention" ? 1 : 0,
            healthy:
              lead.riskLevel === "Healthy" ? 1 : 0,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: radar,
    });
  } catch (error) {
    console.error("Deal risk API error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to build deal risk radar.",
      },
      { status: 500 },
    );
  }
}