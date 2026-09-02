import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { signupSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimit(
      `signup:${clientIp(request)}`,
      5,
      15 * 60 * 1000,
    );

    if (!limited.ok) {
      return fail("Too many signup attempts. Try again later.", 429);
    }

    const body = signupSchema.parse(await request.json());

    await connectDB();

    const email = body.email.toLowerCase();

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return fail("An account with this email already exists", 409);
    }

    const passwordHash = await hashPassword(body.password);

    const user = await User.create({
      name: body.name,
      email,
      passwordHash,
      role: "admin",
    });

    return ok({
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    }, 201);
  } catch (error) {
    return handleError(error);
  }
}