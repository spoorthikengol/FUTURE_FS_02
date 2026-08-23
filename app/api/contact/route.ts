import { NextRequest, NextResponse } from "next/server";
import { handleError } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { connectDB } from "@/lib/db";
import { getContactCorsOrigin } from "@/lib/env";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { toLeadDTO } from "@/lib/serializers";
import { contactSchema } from "@/lib/validations";
import { Lead } from "@/models/Lead";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": getContactCorsOrigin(),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimit(`contact:${clientIp(request)}`, 6, 15 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { success: false, error: "Too many submissions. Please try again later." },
        { status: 429, headers: corsHeaders() },
      );
    }

    await connectDB();
    const body = contactSchema.parse(await request.json());
    const lead = await Lead.create({
      name: body.name,
      email: body.email,
      phone: body.phone,
      company: body.company,
      message: body.message,
      source: "Website",
      status: "NEW",
      value: 0,
      priority: "MEDIUM",
      jobTitle: "",
    });

    await logActivity({
      leadId: String(lead._id),
      type: "LEAD_CREATED",
      description: `${lead.name} submitted the public contact form for ${lead.company}`,
      metadata: { source: "Website", public: true },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          message: "Thanks — your inquiry was received. A specialist will follow up shortly.",
          lead: toLeadDTO(lead),
        },
      },
      { status: 201, headers: corsHeaders() },
    );
  } catch (error) {
    const response = handleError(error);
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status, headers: corsHeaders() });
  }
}
