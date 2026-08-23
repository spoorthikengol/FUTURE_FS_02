function required(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getMongoUri() {
  return required("MONGODB_URI");
}

export function getJwtSecret() {
  return required("JWT_SECRET");
}

export function getAiConfig() {
  return {
    apiKey: process.env.AI_API_KEY || process.env.OPENAI_API_KEY || "",
    baseUrl: process.env.AI_BASE_URL || "https://api.openai.com/v1",
    model: process.env.AI_MODEL || "gpt-4o-mini",
  };
}

export function getAppUrl() {
  return process.env.APP_URL || "http://localhost:3000";
}

export function getContactCorsOrigin() {
  return process.env.CONTACT_CORS_ORIGIN || "*";
}
