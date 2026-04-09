'use client';

// Research Hub — Supabase service layer (CRUD for tabs, sources, items, alerts).
// All queries assume RLS enforces user_id scoping.

import { createClient } from '@/lib/supabase/client';
import { SUGGESTED_SOURCES } from './suggested-sources';
import type {
  CategorySlug,
  FeedFilters,
  NewSourceInput,
  ResearchAlert,
  ResearchCategory,
  ResearchItem,
  ScoredItem,
  UserSource,
} from './types';

type SBClient = ReturnType<typeof createClient>;

const sb = (): SBClient => createClient();

// ─── Categories ────────────────────────────────────────────
export async function listCategories(): Promise<ResearchCategory[]> {
  const { data } = await (sb() as any)
    .from('research_hub_categories')
    .select('*')
    .order('sort_order', { ascending: true });
  return (data as ResearchCategory[]) || [];
}

// ─── User tabs ─────────────────────────────────────────────
export async function getActiveCategoryIds(userId: string): Promise<string[]> {
  const { data } = await (sb() as any)
    .from('research_hub_user_tabs')
    .select('category_id, is_active')
    .eq('user_id', userId);
  return ((data as any[]) || []).filter((r) => r.is_active).map((r) => r.category_id);
}

/**
 * Bootstrap defaults for first-time users: ensures every default category
 * has a row in research_hub_user_tabs with is_active = true.
 */
export async function ensureDefaultTabs(
  userId: string,
  categories: ResearchCategory[],
): Promise<void> {
  const defaults = categories.filter((c) => c.is_default);
  if (defaults.length === 0) return;
  const rows = defaults.map((c) => ({
    user_id: userId,
    category_id: c.id,
    is_active: true,
  }));
  await (sb() as any)
    .from('research_hub_user_tabs')
    .upsert(rows, { onConflict: 'user_id,category_id', ignoreDuplicates: true });
}

export async function toggleTab(
  userId: string,
  categoryId: string,
  isActive: boolean,
): Promise<void> {
  await (sb() as any)
    .from('research_hub_user_tabs')
    .upsert(
      { user_id: userId, category_id: categoryId, is_active: isActive },
      { onConflict: 'user_id,category_id' },
    );
}

/**
 * Bootstrap suggested sources for first-time users: ensures every source
 * in SUGGESTED_SOURCES (Publications, Platforms, Social Media, etc.) has
 * a row in research_hub_user_sources for the given user. Idempotent —
 * existing rows are skipped via the unique constraint.
 */
export async function ensureSuggestedSources(
  userId: string,
  categories: ResearchCategory[],
): Promise<void> {
  if (categories.length === 0) return;
  const rows: Array<{
    user_id: string;
    category_id: string;
    source_name: string;
    source_url: string | null;
    source_type: string;
    is_active: boolean;
    notify_alerts: boolean;
    is_custom: boolean;
  }> = [];

  for (const cat of categories) {
    const suggested = SUGGESTED_SOURCES[cat.slug] || [];
    for (const s of suggested) {
      rows.push({
        user_id: userId,
        category_id: cat.id,
        source_name: s.source_name,
        source_url: s.source_url ?? null,
        source_type: s.source_type,
        is_active: true,
        notify_alerts: true,
        is_custom: false,
      });
    }
  }

  if (rows.length === 0) return;

  await (sb() as any)
    .from('research_hub_user_sources')
    .upsert(rows, {
      onConflict: 'user_id,category_id,source_name',
      ignoreDuplicates: true,
    });
}

// ─── User sources ──────────────────────────────────────────
export async function listUserSources(
  userId: string,
  categoryId?: string,
): Promise<UserSource[]> {
  let q = (sb() as any)
    .from('research_hub_user_sources')
    .select('*')
    .eq('user_id', userId)
    .order('added_at', { ascending: true });
  if (categoryId) q = q.eq('category_id', categoryId);
  const { data } = await q;
  return (data as UserSource[]) || [];
}

export async function addSource(
  userId: string,
  categoryId: string,
  input: NewSourceInput,
): Promise<UserSource | null> {
  const { data } = await (sb() as any)
    .from('research_hub_user_sources')
    .upsert(
      {
        user_id: userId,
        category_id: categoryId,
        source_name: input.source_name,
        source_url: input.source_url ?? null,
        source_type: input.source_type,
        source_icon_url: input.source_icon_url ?? null,
        is_active: true,
        notify_alerts: true,
        is_custom: input.is_custom ?? false,
      },
      { onConflict: 'user_id,category_id,source_name' },
    )
    .select()
    .maybeSingle();
  return (data as UserSource) || null;
}

export async function removeSource(sourceId: string): Promise<void> {
  await (sb() as any).from('research_hub_user_sources').delete().eq('id', sourceId);
}

export async function toggleSourceActive(
  sourceId: string,
  isActive: boolean,
): Promise<void> {
  await (sb() as any)
    .from('research_hub_user_sources')
    .update({ is_active: isActive })
    .eq('id', sourceId);
}

export async function toggleSourceAlerts(
  sourceId: string,
  notify: boolean,
): Promise<void> {
  await (sb() as any)
    .from('research_hub_user_sources')
    .update({ notify_alerts: notify })
    .eq('id', sourceId);
}

// ─── Items ─────────────────────────────────────────────────
export async function listItemsForCategory(categoryId: string): Promise<ResearchItem[]> {
  const { data } = await (sb() as any)
    .from('research_hub_items')
    .select('*')
    .eq('category_id', categoryId)
    .order('published_at', { ascending: false })
    .limit(50);
  return (data as ResearchItem[]) || [];
}

export async function listAllItems(): Promise<ResearchItem[]> {
  const { data } = await (sb() as any)
    .from('research_hub_items')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(200);
  return (data as ResearchItem[]) || [];
}

// ─── User items (read/save/dismiss + relevance) ────────────
export async function upsertUserItem(
  userId: string,
  itemId: string,
  patch: {
    relevance_score?: number;
    relevance_reasons?: string[];
    matched_domains?: string[];
    is_read?: boolean;
    is_bookmarked?: boolean;
    is_dismissed?: boolean;
  },
): Promise<void> {
  await (sb() as any)
    .from('research_hub_user_items')
    .upsert(
      {
        user_id: userId,
        item_id: itemId,
        ...patch,
        ...(patch.is_read ? { read_at: new Date().toISOString() } : {}),
      },
      { onConflict: 'user_id,item_id' },
    );
}

export async function listUserItemStates(userId: string): Promise<
  Record<string, { user_item_id: string; relevance_score: number; relevance_reasons: string[]; matched_domains: string[]; is_read: boolean; is_bookmarked: boolean; is_dismissed: boolean }>
> {
  const { data } = await (sb() as any)
    .from('research_hub_user_items')
    .select('id, item_id, relevance_score, relevance_reasons, matched_domains, is_read, is_bookmarked, is_dismissed')
    .eq('user_id', userId);
  const map: Record<string, any> = {};
  ((data as any[]) || []).forEach((r) => {
    map[r.item_id] = {
      user_item_id: r.id,
      relevance_score: Number(r.relevance_score) || 0,
      relevance_reasons: Array.isArray(r.relevance_reasons) ? r.relevance_reasons : [],
      matched_domains: Array.isArray(r.matched_domains) ? r.matched_domains : [],
      is_read: !!r.is_read,
      is_bookmarked: !!r.is_bookmarked,
      is_dismissed: !!r.is_dismissed,
    };
  });
  return map;
}

// ─── Alerts ────────────────────────────────────────────────
export async function listAlerts(userId: string, unreadOnly = false): Promise<ResearchAlert[]> {
  let q = (sb() as any)
    .from('research_hub_alerts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (unreadOnly) q = q.eq('is_read', false);
  const { data } = await q;
  return (data as ResearchAlert[]) || [];
}

export async function markAlertRead(alertId: string): Promise<void> {
  await (sb() as any)
    .from('research_hub_alerts')
    .update({ is_read: true })
    .eq('id', alertId);
}

export async function getUnreadAlertCount(userId: string): Promise<number> {
  const { count } = await (sb() as any)
    .from('research_hub_alerts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  return typeof count === 'number' ? count : 0;
}

// ─── Helpers ───────────────────────────────────────────────
export function applyFeedFilters(items: ScoredItem[], filters: FeedFilters): ScoredItem[] {
  let out = items.filter((i) => !i.is_dismissed);
  if (filters.categorySlug && filters.categorySlug !== 'all') {
    out = out.filter((i) => i.category_slug === filters.categorySlug);
  }
  if (typeof filters.minRelevance === 'number') {
    out = out.filter((i) => i.relevance_score >= filters.minRelevance!);
  }
  if (filters.status === 'unread') out = out.filter((i) => !i.is_read);
  if (filters.status === 'bookmarked') out = out.filter((i) => i.is_bookmarked);
  if (filters.sortBy === 'recent') {
    out.sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''));
  } else {
    out.sort((a, b) => b.relevance_score - a.relevance_score);
  }
  if (filters.limit) out = out.slice(0, filters.limit);
  return out;
}

export type { CategorySlug, ScoredItem, UserSource, ResearchCategory, ResearchItem };
