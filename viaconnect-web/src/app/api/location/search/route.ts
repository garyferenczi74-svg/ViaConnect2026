import { NextResponse } from "next/server";
import {
  searchLocations,
  toSearchResponse,
  type LocationSearchKind,
} from "@/lib/location/search";

export const dynamic = "force-dynamic";

const KINDS = new Set<LocationSearchKind>(["country", "subdivision", "city"]);

function isLocationSearchKind(value: string): value is LocationSearchKind {
  return KINDS.has(value as LocationSearchKind);
}

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const kindRaw = url.searchParams.get("kind") ?? "";
  const q = url.searchParams.get("q") ?? "";
  const country = url.searchParams.get("country") ?? "";
  const subdivision = url.searchParams.get("subdivision") ?? "";

  if (!isLocationSearchKind(kindRaw)) {
    return NextResponse.json(
      toSearchResponse({ timedOut: false, error: null, items: [] }),
    );
  }

  const body = await searchLocations({
    kind: kindRaw,
    q,
    country,
    subdivision,
  });
  return NextResponse.json(body);
}
