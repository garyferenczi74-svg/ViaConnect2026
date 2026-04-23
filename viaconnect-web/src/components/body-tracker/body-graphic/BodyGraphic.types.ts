// Prompt #118 — Body Graphic type surface.

export type Gender = "male" | "female";
export type BodyView = "front" | "back";
export type BodyMode = "composition" | "muscle";
export type RegionId = string;
export type RegionType = "composition" | "muscle" | "both";
export type HealthStatus = "healthy" | "caution" | "alert" | "no-data";
export type Trend = "up" | "down" | "stable" | "unknown";
export type GraphicSize = "compact" | "standard" | "large";

export interface RegionDefinition {
  id: RegionId;
  displayName: string;
  displayNameFr?: string;
  regionType: RegionType;
  parentRegion?: RegionId;
  anatomicalGroup: "upper-body" | "core" | "lower-body" | "upper-limb" | "lower-limb";
  hasView: BodyView[];
  displayOrder: number;
  isBilateral?: boolean;
}

export interface RegionOverlayData {
  value?: number;
  rawValue?: number;
  unit?: string;
  color?: string;
  label?: string;
  status?: HealthStatus;
  trend?: Trend;
  lastMeasuredAt?: string;
}

export interface BodySvgProps {
  showAnatomicalDetail?: boolean;
  showCompositionRegions?: boolean;
  showMuscleRegions?: boolean;
  onRegionClick?: (regionId: RegionId) => void;
  onRegionHover?: (regionId: RegionId | null) => void;
  highlightedRegions?: RegionId[];
  regionOverlayFills?: Record<RegionId, string>;
  className?: string;
}

export interface BodyGraphicEvent {
  type: "gender-change" | "view-change" | "region-click" | "region-hover" | "panel-open" | "panel-close" | "label-toggle";
  payload?: Record<string, unknown>;
  timestamp: number;
}

export interface BodyGraphicProps {
  mode: BodyMode;
  gender: Gender;
  onGenderChange: (gender: Gender) => void;
  view: BodyView;
  onViewChange: (view: BodyView) => void;
  overlayData?: Record<RegionId, RegionOverlayData>;
  onRegionClick?: (regionId: RegionId) => void;
  selectedRegion?: RegionId | null;
  highlightedRegions?: RegionId[];
  showLabels?: boolean;
  showAnatomicalDetail?: boolean;
  size?: GraphicSize;
  className?: string;
  onInteractionEvent?: (event: BodyGraphicEvent) => void;
}

export interface BodyGraphicPreferencesRow {
  user_id: string;
  default_gender: Gender;
  default_view: BodyView;
  show_anatomical_detail: boolean;
  show_region_labels: boolean;
  preferred_size: GraphicSize;
  updated_at: string;
}

export interface ArnoldBlurbResponse {
  blurb: string;
  kelsey_verdict: "APPROVED" | "CONDITIONAL" | "BLOCKED" | "ESCALATE";
  disclaimer_required: boolean;
  cached: boolean;
  latency_ms: number;
}
