// Research Hub — TypeScript types matching the migration schema.

export type CategorySlug =
  | 'publications'
  | 'platforms'
  | 'social_media'
  | 'podcasts'
  | 'clinical_trials'
  | 'news';

export type SourceType =
  | 'journal'
  | 'website'
  | 'influencer'
  | 'podcast'
  | 'organization'
  | 'platform'
  | 'custom';

export interface ResearchCategory {
  id: string;
  slug: CategorySlug;
  label: string;
  icon_name: string;
  description: string | null;
  sort_order: number;
  is_default: boolean;
}

export interface UserTab {
  id: string;
  user_id: string;
  category_id: string;
  is_active: boolean;
  activated_at: string;
}

export interface UserSource {
  id: string;
  user_id: string;
  category_id: string;
  source_name: string;
  source_url: string | null;
  source_type: SourceType;
  source_icon_url: string | null;
  is_active: boolean;
  notify_alerts: boolean;
  is_custom: boolean;
  added_at: string;
}

export interface ResearchItem {
  id: string;
  category_id: string;
  source_name: string;
  title: string;
  summary: string | null;
  original_url: string | null;
  author: string | null;
  published_at: string | null;
  image_url: string | null;
  tags: string[];
  raw_metadata: Record<string, unknown>;
  created_at: string;
}

export interface UserItem {
  id: string;
  user_id: string;
  item_id: string;
  relevance_score: number;
  relevance_reasons: string[];
  matched_domains: string[];
  is_bookmarked: boolean;
  is_read: boolean;
  is_dismissed: boolean;
  surfaced_at: string;
  read_at: string | null;
}

/** Joined item + per-user state for feed display. */
export interface ScoredItem extends ResearchItem {
  category_slug: CategorySlug;
  user_item_id: string | null;
  relevance_score: number;
  relevance_reasons: string[];
  matched_domains: string[];
  is_bookmarked: boolean;
  is_read: boolean;
  is_dismissed: boolean;
}

export interface ResearchAlert {
  id: string;
  user_id: string;
  user_item_id: string;
  alert_type: 'relevance' | 'breaking' | 'protocol_match';
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NewSourceInput {
  source_name: string;
  source_url?: string | null;
  source_type: SourceType;
  source_icon_url?: string | null;
  is_custom?: boolean;
}

export interface FeedFilters {
  categorySlug?: CategorySlug | 'all';
  minRelevance?: number;
  status?: 'all' | 'unread' | 'bookmarked';
  sortBy?: 'relevance' | 'recent';
  limit?: number;
}
