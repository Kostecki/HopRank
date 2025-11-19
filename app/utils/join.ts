export const JOIN_CODE_PATTERN = /^[A-Z0-9]{5}$/;

export function normalizeJoinCode(raw: string | undefined | null) {
  return (raw ?? "").trim().toUpperCase();
}

export function isValidJoinCode(raw: string | undefined | null) {
  const code = normalizeJoinCode(raw);
  return JOIN_CODE_PATTERN.test(code);
}
