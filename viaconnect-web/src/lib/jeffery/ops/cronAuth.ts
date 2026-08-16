/** Shared CRON_SECRET Bearer check for ops routes. */

import { timingSafeEqual } from "node:crypto";

const BEARER_PREFIX = "Bearer ";

export function isCronAuthorized(headerValue: string | null): boolean {
  const expected = `${BEARER_PREFIX}${process.env.CRON_SECRET ?? ""}`;
  const actual = headerValue ?? "";
  if (expected.length <= BEARER_PREFIX.length) return false;
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(actual, "utf8"), Buffer.from(expected, "utf8"));
}
