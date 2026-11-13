/**
 * RFC 8785 JSON Canonicalization Scheme (subset sufficient for protocol envelopes).
 * - object keys sorted by UTF-16 code units, no whitespace
 * - numbers use ECMAScript serialisation (JSON.stringify), non-finite numbers rejected
 * - `undefined` members are dropped (same as JSON.stringify)
 */
export function canonicalize(value: unknown): string {
  if (value === null) return "null";
  switch (typeof value) {
    case "boolean": return value ? "true" : "false";
    case "number":
      if (!Number.isFinite(value)) throw new Error("JCS: non-finite number");
      return JSON.stringify(value);
    case "string": return JSON.stringify(value);
    case "object": {
      if (Array.isArray(value)) return `[${value.map((v) => canonicalize(v === undefined ? null : v)).join(",")}]`;
      const obj = value as Record<string, unknown>;
      const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
      return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(",")}}`;
    }
    default: throw new Error(`JCS: unsupported type ${typeof value}`);
  }
}
