// Prompt 201: Lucide icon resolver for the Connected Sources registry.
//
// Each ConnectedSource carries an icon string (the Lucide component name).
// This map turns that string into a component. Every icon is rendered at
// strokeWidth 1.5 by the consuming card. Add a registry source with a new
// icon by importing it here once; no other UI edit is required.
//
// All comments use hyphens only. No em-dashes or en-dashes.

import {
  Activity,
  PencilLine,
  HeartPulse,
  Watch,
  Plug,
  type LucideIcon,
} from 'lucide-react';

export const SOURCE_ICON_MAP: Record<string, LucideIcon> = {
  Activity,
  PencilLine,
  HeartPulse,
  Watch,
};

export function resolveSourceIcon(name: string): LucideIcon {
  return SOURCE_ICON_MAP[name] ?? Plug;
}
