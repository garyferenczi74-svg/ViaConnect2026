# Wellness Portal Design Specification

## Color Palette — GREEN, NOT CYAN

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#4ade80` (Tailwind `green-400`) | Buttons, active tabs, progress fills, positive indicators |
| Secondary | `#fbbf24` (Tailwind `yellow-400`) | Warnings, MTHFR highlights, moderate risk |
| Purple accent | `#a78bfa` (Tailwind `violet-400`) | Genetic correlation, GENEX titles |
| Pink accent | `#f472b6` (Tailwind `pink-400`) | Protocol response |
| Background | `#111827` (Tailwind `gray-900`) | Page background |
| Card bg | `bg-gray-800/50 backdrop-blur-sm` | All card surfaces |
| Card border | `border border-green-400/15` | Default card border |
| Text primary | `white` | Headings, labels |
| Text secondary | `white/60%` | Subtitles, descriptions |
| Text tertiary | `white/40%` | Hints, timestamps |
| Positive | `#4ade80` | Good values, improvements |
| Negative | `#f87171` | Bad values, regressions |

## Component Patterns

### Card
```
bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-6
```

### Active Tab
```
bg-green-400 text-gray-900 rounded-full px-4 py-2 font-medium
```

### Metric Value
```
text-4xl font-bold text-green-400
```

### Gene Badge
```
px-2 py-0.5 rounded-full text-xs font-medium bg-green-400 text-gray-900
```

### Risk Badges
| Level | Classes |
|-------|---------|
| High | `bg-red-400/20 text-red-400` |
| Moderate | `bg-yellow-400/20 text-yellow-400` |
| Low | `bg-green-400/20 text-green-400` |

### Progress Bar
```
Track:  h-1.5 bg-gray-700 rounded-full
Fill:   h-1.5 bg-gradient-to-r from-green-400 to-green-500 rounded-full
```

## Shared Components

### PortalHeader (`apps/web/src/components/wellness/PortalHeader.tsx`)
- Props: `activeTab: string`
- Sticky header with backdrop blur
- "Return to Main Menu" pill button (Link to `/`, ArrowLeft icon, dark glass, border-white/10)
- ViaConnect logo: 48px green circle (#4ade80) with Sparkles icon
- Title: "Personal Wellness Portal" 24px bold white
- Subtitle: "ViaConnect™ AI-Powered Health" 14px white/50%
- Renders `<TabNav>` below

### TabNav (`apps/web/src/components/wellness/TabNav.tsx`)
- Props: `activeTab: string`
- 10 tabs with icons, horizontal scroll on mobile
- Tab IDs: dashboard, genetics, variants, bio, plans, track, share, insights, learn, research
- Active: `bg-green-400 text-gray-900 rounded-full px-4 py-2 font-medium`
- Inactive: `text-white/60 hover:text-white/80`
