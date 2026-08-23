import { jwtVerify, SignJWT } from "jose";
import { getJwtSecret } from "@/lib/env";
import type { SessionUser } from "@/types/crm";

export const SESSION_COOKIE = "velora_session";

function secretKey() {
  return new TextEncoder().encode(getJwtSecret());
}

export async function signSession(user: SessionUser) {
  return new SignJWT({
    name: user.name,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || typeof payload.email !== "string") return null;
    return {
      id: payload.sub,
      name: String(payload.name ?? ""),
      email: payload.email,
      role: payload.role === "manager" ? "manager" : "admin",
    };
  } catch {
    return null;
  }
}
