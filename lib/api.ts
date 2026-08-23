import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: string;
  details?: unknown;
};

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data } satisfies ApiSuccess<T>, {
    status,
  });
}

export function fail(error: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { success: false, error, details } satisfies ApiFailure,
    { status },
  );
}

export function handleError(error: unknown) {
  if (error instanceof ZodError) {
    return fail("Validation failed", 422, error.issues);
  }
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return fail("Authentication required", 401);
  }
  if (error instanceof Error && error.message.startsWith("Missing required")) {
    return fail("Server configuration error", 500);
  }
  console.error(error);
  return fail("Something went wrong", 500);
}
