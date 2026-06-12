// Sweep 2026-06-12: shared icon component type. Bare React.ElementType icon
// props collapse JSX prop types to never under TS 5.9 with @types/react
// 18.3.x, which produced a 90-plus error cluster. Every component that takes
// a Lucide icon as a prop types it with IconType.

import type { LucideIcon } from 'lucide-react';

export type IconType = LucideIcon;
