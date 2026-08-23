import { NextRequest } from "next/server";
import { fail, handleError, ok } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { requireApiSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { toLeadDTO } from "@/lib/serializers";
import { leadCreateSchema } from "@/lib/validations";
import { Lead } from "@/models/Lead";

export async function GET(request: NextRequest) {
  try {
    await requireApiSession(request);
    await connectDB();

    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q")?.trim() ?? "";
    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const priority = searchParams.get("priority");
    const sort = searchParams.get("sort") ?? "createdAt";
    const order = searchParams.get("order") === "asc" ? 1 : -1;
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(50, Math.max(5, Number(searchParams.get("pageSize") ?? 10)));

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (source) filter.source = source;
    if (priority) filter.priority = priority;
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { company: { $regex: q, $options: "i" } },
      ];
    }

    const allowedSort = new Set(["createdAt", "updatedAt", "value", "name", "status"]);
    const sortField = allowedSort.has(sort) ? sort : "createdAt";

    const [items, total] = await Promise.all([
      Lead.find(filter)
        .sort({ [sortField]: order })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Lead.countDocuments(filter),
    ]);

    return ok({
      items: items.map(toLeadDTO),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireApiSession(request);
    await connectDB();
    const body = leadCreateSchema.parse(await request.json());
    const lead = await Lead.create({
      ...body,
      followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
      lastContactedAt: body.lastContactedAt ? new Date(body.lastContactedAt) : null,
    });
    await logActivity({
      leadId: String(lead._id),
      type: "LEAD_CREATED",
      description: `${session.name} created lead ${lead.name} (${lead.company})`,
      metadata: { source: lead.source },
    });
    return ok(toLeadDTO(lead), 201);
  } catch (error) {
    return handleError(error);
  }
}
