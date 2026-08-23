import { NextRequest } from "next/server";
import { handleError, ok } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { settingsSchema } from "@/lib/validations";
import { Settings } from "@/models/Settings";

export async function GET(request: NextRequest) {
  try {
    await requireApiSession(request);
    await connectDB();
    const settings =
      (await Settings.findOne({ key: "default" }).lean()) ??
      (await Settings.create({ key: "default" })).toObject();
    return ok({
      marketingSpend: settings.marketingSpend,
      campaigns: settings.campaigns ?? [],
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireApiSession(request);
    await connectDB();
    const body = settingsSchema.parse(await request.json());
    const settings = await Settings.findOneAndUpdate(
      { key: "default" },
      body,
      { new: true, upsert: true },
    );
    return ok({
      marketingSpend: settings.marketingSpend,
      campaigns: settings.campaigns ?? [],
    });
  } catch (error) {
    return handleError(error);
  }
}
