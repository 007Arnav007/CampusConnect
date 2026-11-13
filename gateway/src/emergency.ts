export type EmergencyRequest = {
  alertId?: string;
  category: string;
  severity: string;
  location: string;
  message: string;
  testOnly: true;
};

const allowedCategories = new Set(["GENERAL", "FIRE", "MEDICAL", "SECURITY", "WEATHER", "OTHER"]);
const allowedSeverities = new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const UUID_PATTERN = /^[\da-f]{8}-([\da-f]{4}-){3}[\da-f]{12}$/i;

export function parseEmergencyRequest(body: unknown): EmergencyRequest | undefined {
  if (!body || typeof body !== "object" || Array.isArray(body)) return undefined;
  const input = body as Record<string, unknown>;
  const category = typeof input.category === "string" ? input.category.trim().toUpperCase() : "";
  const severity = typeof input.severity === "string" ? input.severity.trim().toUpperCase() : "";
  const location = typeof input.location === "string" ? input.location.trim() : "";
  const message = typeof input.message === "string" ? input.message.trim() : "";
  const alertId = input.alertId;
  const testOnly = input.testOnly;

  if (
    !allowedCategories.has(category)
    || !allowedSeverities.has(severity)
    || !location
    || location.length > 180
    || !message
    || message.length > 1000
    || testOnly !== true
    || (alertId !== undefined && (typeof alertId !== "string" || !UUID_PATTERN.test(alertId)))
  ) {
    return undefined;
  }

  return {
    ...(typeof alertId === "string" ? { alertId } : {}),
    category,
    severity,
    location,
    message,
    testOnly: true
  };
}
