import { NextRequest } from "next/server";
import { handleError } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Lead } from "@/models/Lead";

// Escapes a single CSV field per RFC 4180: wrap in quotes and double up
// any internal quotes whenever the value contains a comma, quote, or
// line break (the three characters that would otherwise break parsing).
function csvField(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(values: unknown[]): string {
  return values.map(csvField).join(",");
}

export async function GET(request: NextRequest) {
  try {
    // Same auth requirement as every other /api/leads route — this is
    // real lead data, not something to expose without a session.
    await requireApiSession(request);
    await connectDB();

    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q")?.trim() ?? "";
    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const priority = searchParams.get("priority");
    const sort = searchParams.get("sort") ?? "createdAt";
    const order = searchParams.get("order") === "asc" ? 1 : -1;

    // Mirrors the exact filter logic in app/api/leads/route.ts (GET),
    // so an export always matches whatever the Leads page currently
    // has filtered/searched — intentionally duplicated here rather
    // than refactored into a shared helper, to avoid touching the
    // existing, working list endpoint for this addition.
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (source) filter.source = source;
    if (priority) filter.priority = priority;
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { company: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
        { source: { $regex: q, $options: "i" } },
        { status: { $regex: q, $options: "i" } },
      ];
    }

    const allowedSort = new Set(["createdAt", "updatedAt", "value", "name", "status"]);
    const sortField = allowedSort.has(sort) ? sort : "createdAt";

    // Exports are inherently unpaginated (the whole filtered set), but
    // capped at a sane ceiling so a runaway export can't hang the
    // request or return an unbounded response.
    const leads = await Lead.find(filter)
      .sort({ [sortField]: order })
      .limit(5000)
      .lean();

    const header = toCsvRow([
      "Name",
      "Email",
      "Phone",
      "Company",
      "Status",
      "Source",
      "Value",
      "Created",
      "Updated",
    ]);

    const rows = leads.map((lead) =>
      toCsvRow([
        lead.name,
        lead.email,
        lead.phone,
        lead.company,
        lead.status,
        lead.source,
        lead.value,
        new Date(lead.createdAt).toISOString(),
        new Date(lead.updatedAt).toISOString(),
      ]),
    );

    // Leading BOM so Excel (Windows in particular) reliably detects
    // UTF-8 instead of mis-rendering non-ASCII names/companies.
    const csv = "\uFEFF" + [header, ...rows].join("\r\n") + "\r\n";

    const filename = `veloracrm-leads-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleError(error);
  }
}