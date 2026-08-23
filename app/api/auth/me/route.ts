import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/api";

export async function GET() {
  const session = await getSession();
  if (!session) return fail("Authentication required", 401);
  return ok({ user: session });
}
