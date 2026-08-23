import { NextRequest } from "next/server";
import { authenticate, setSessionCookie, signSession } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimit(`login:${clientIp(request)}`, 8, 15 * 60 * 1000);
    if (!limited.ok) {
      return fail("Too many login attempts. Try again later.", 429);
    }

    const body = loginSchema.parse(await request.json());
    const user = await authenticate(body.email, body.password);
    if (!user) {
      return fail("Invalid email or password", 401);
    }

    const token = await signSession(user);
    await setSessionCookie(token);
    return ok({ user });
  } catch (error) {
    return handleError(error);
  }
}
