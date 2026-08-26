"use client";

import { deriveJefferyFeedPresence } from "@/lib/jeffery/feedPresence";

interface JefferyPresenceBadgeProps {
  newestCreatedAt: string | null;
  nowMs?: number;
  loaded?: boolean;
}

export default function JefferyPresenceBadge({
  newestCreatedAt,
  nowMs = Date.now(),
  loaded = true,
}: JefferyPresenceBadgeProps) {
  if (!loaded) {
    return (
      <div
        className="ml-auto flex items-center gap-2 min-w-0"
        role="status"
        aria-label="Jeffery presence loading"
      >
        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white/20" />
        </span>
        <span className="text-xs text-white/40 font-medium">Checking feed</span>
      </div>
    );
  }

  const presence = deriveJefferyFeedPresence(newestCreatedAt, nowMs);
  const online = presence.kind === "online";

  return (
    <div
      className="ml-auto flex items-center gap-2 min-w-0 max-w-[min(100%,20rem)]"
      role="status"
      aria-label={presence.label}
    >
      <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
        {online && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
            online ? "bg-emerald-500" : "bg-white/30"
          }`}
        />
      </span>
      <span
        className={`text-xs font-medium truncate ${
          online ? "text-emerald-400" : "text-white/50"
        }`}
      >
        {presence.label}
      </span>
    </div>
  );
}
