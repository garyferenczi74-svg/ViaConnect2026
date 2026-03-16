// ─── Types ───────────────────────────────────────────────────────────────────

export interface AnalyticsEvent {
  eventName: string;
  userId: string;
  properties: Record<string, unknown>;
  timestamp: Date;
}

export interface TokenAnalyticsConfig {
  posthogHost: string; // self-hosted URL for PHI safety
  posthogApiKey: string;
  batchSize: number;
  flushIntervalMs: number;
  enabled: boolean;
}

export interface RetentionCohort {
  cohortDate: string; // ISO date
  daysSinceFirst: number;
  activeUsers: number;
  totalUsers: number;
  retentionRate: number;
}

export interface RedemptionCorrelation {
  userId: string;
  redemptionDate: Date;
  reorderedWithin30Days: boolean;
  reorderedWithin60Days: boolean;
  reorderCount: number;
}

export interface StreakHealthCorrelation {
  userId: string;
  streakLength: number;
  adherenceRate: number;
  healthOutcomeScore: number; // 0-100
  improvementPercent: number;
}

// ─── Default Config ──────────────────────────────────────────────────────────

export const DEFAULT_ANALYTICS_CONFIG: TokenAnalyticsConfig = {
  posthogHost: 'https://posthog.viaconnect.internal',
  posthogApiKey: 'phc_placeholder_key',
  batchSize: 25,
  flushIntervalMs: 30000,
  enabled: true,
};

// ─── Event Names ─────────────────────────────────────────────────────────────

export const TOKEN_EVENTS = {
  TOKEN_EARNED: 'farmatoken_earned',
  TOKEN_REDEEMED: 'farmatoken_redeemed',
  TOKEN_EXPIRED: 'farmatoken_expired',
  STREAK_STARTED: 'streak_started',
  STREAK_BROKEN: 'streak_broken',
  STREAK_MILESTONE: 'streak_milestone',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  REWARD_VIEWED: 'reward_tier_viewed',
  REWARD_REDEEMED: 'reward_redeemed',
  REFERRAL_CODE_GENERATED: 'referral_code_generated',
  REFERRAL_CODE_USED: 'referral_code_used',
  LEADERBOARD_VIEWED: 'leaderboard_viewed',
  DAILY_CAP_REACHED: 'daily_cap_reached',
} as const;

// ─── Core Functions ──────────────────────────────────────────────────────────

export function createAnalyticsEvent(
  eventName: string,
  userId: string,
  properties: Record<string, unknown>,
): AnalyticsEvent {
  return {
    eventName,
    userId,
    properties,
    timestamp: new Date(),
  };
}

export function trackTokenEarned(
  userId: string,
  actionType: string,
  amount: number,
  metadata?: Record<string, unknown>,
): AnalyticsEvent {
  return createAnalyticsEvent(TOKEN_EVENTS.TOKEN_EARNED, userId, {
    action_type: actionType,
    amount,
    source: metadata?.source ?? 'organic',
    daily_count: metadata?.daily_count ?? 1,
    ...metadata,
  });
}

export function trackTokenRedeemed(
  userId: string,
  rewardId: string,
  amount: number,
  rewardName: string,
): AnalyticsEvent {
  return createAnalyticsEvent(TOKEN_EVENTS.TOKEN_REDEEMED, userId, {
    reward_id: rewardId,
    amount,
    reward_name: rewardName,
    remaining_balance: 0, // caller should set via metadata or post-processing
  });
}

export function trackStreakEvent(
  userId: string,
  eventType: 'started' | 'broken' | 'milestone',
  streakDays: number,
): AnalyticsEvent {
  const eventNameMap: Record<string, string> = {
    started: TOKEN_EVENTS.STREAK_STARTED,
    broken: TOKEN_EVENTS.STREAK_BROKEN,
    milestone: TOKEN_EVENTS.STREAK_MILESTONE,
  };
  return createAnalyticsEvent(eventNameMap[eventType], userId, {
    streak_days: streakDays,
    event_type: eventType,
  });
}

export function trackAchievementUnlocked(
  userId: string,
  achievementId: string,
  achievementName: string,
  tokenReward: number,
): AnalyticsEvent {
  return createAnalyticsEvent(TOKEN_EVENTS.ACHIEVEMENT_UNLOCKED, userId, {
    achievement_id: achievementId,
    achievement_name: achievementName,
    token_reward: tokenReward,
  });
}

// ─── Batching & PostHog ──────────────────────────────────────────────────────

export function batchEvents(
  events: AnalyticsEvent[],
  config: TokenAnalyticsConfig = DEFAULT_ANALYTICS_CONFIG,
): { batches: AnalyticsEvent[][]; batchCount: number } {
  const batches: AnalyticsEvent[][] = [];
  for (let i = 0; i < events.length; i += config.batchSize) {
    batches.push(events.slice(i, i + config.batchSize));
  }
  return { batches, batchCount: batches.length };
}

export function formatPostHogPayload(
  events: AnalyticsEvent[],
  apiKey: string,
): object {
  return {
    api_key: apiKey,
    batch: events.map((evt) => ({
      event: evt.eventName,
      distinct_id: evt.userId,
      properties: {
        ...evt.properties,
        $lib: 'farmatokens',
      },
      timestamp: evt.timestamp.toISOString(),
    })),
  };
}

// ─── Retention & Correlation Analysis ────────────────────────────────────────

const RETENTION_DAYS = [1, 7, 14, 30, 60, 90];

export function calculateRetentionCohorts(
  earners: { userId: string; firstEarnDate: Date; lastActiveDate: Date }[],
): RetentionCohort[] {
  // Group users by their first-earn date (ISO date string)
  const cohortMap = new Map<string, typeof earners>();
  for (const earner of earners) {
    const key = earner.firstEarnDate.toISOString().slice(0, 10);
    const list = cohortMap.get(key) ?? [];
    list.push(earner);
    cohortMap.set(key, list);
  }

  const cohorts: RetentionCohort[] = [];

  for (const [cohortDate, members] of cohortMap.entries()) {
    const totalUsers = members.length;
    const cohortStart = new Date(cohortDate);

    for (const days of RETENTION_DAYS) {
      const activeUsers = members.filter((m) => {
        const diffMs = m.lastActiveDate.getTime() - cohortStart.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays >= days;
      }).length;

      cohorts.push({
        cohortDate,
        daysSinceFirst: days,
        activeUsers,
        totalUsers,
        retentionRate: totalUsers > 0 ? activeUsers / totalUsers : 0,
      });
    }
  }

  return cohorts;
}

export function calculateRedemptionCorrelation(
  redemptions: { userId: string; redemptionDate: Date }[],
  orders: { userId: string; orderDate: Date }[],
): RedemptionCorrelation[] {
  return redemptions.map((r) => {
    const userOrders = orders.filter(
      (o) =>
        o.userId === r.userId &&
        o.orderDate.getTime() > r.redemptionDate.getTime(),
    );

    const within30 = userOrders.filter((o) => {
      const diff = o.orderDate.getTime() - r.redemptionDate.getTime();
      return diff <= 30 * 24 * 60 * 60 * 1000;
    });

    const within60 = userOrders.filter((o) => {
      const diff = o.orderDate.getTime() - r.redemptionDate.getTime();
      return diff <= 60 * 24 * 60 * 60 * 1000;
    });

    return {
      userId: r.userId,
      redemptionDate: r.redemptionDate,
      reorderedWithin30Days: within30.length > 0,
      reorderedWithin60Days: within60.length > 0,
      reorderCount: userOrders.length,
    };
  });
}

export function calculateStreakHealthCorrelation(
  data: {
    userId: string;
    streakLength: number;
    adherenceRate: number;
    healthScore: number;
    baselineScore: number;
  }[],
): StreakHealthCorrelation[] {
  return data.map((d) => ({
    userId: d.userId,
    streakLength: d.streakLength,
    adherenceRate: d.adherenceRate,
    healthOutcomeScore: d.healthScore,
    improvementPercent:
      d.baselineScore > 0
        ? ((d.healthScore - d.baselineScore) / d.baselineScore) * 100
        : 0,
  }));
}

// ─── Summary ─────────────────────────────────────────────────────────────────

export function generateAnalyticsSummary(events: AnalyticsEvent[]): {
  totalEvents: number;
  uniqueUsers: number;
  topActions: { action: string; count: number }[];
  avgTokensPerUser: number;
  redemptionRate: number;
} {
  const totalEvents = events.length;
  const uniqueUserSet = new Set(events.map((e) => e.userId));
  const uniqueUsers = uniqueUserSet.size;

  // Count actions
  const actionCounts = new Map<string, number>();
  for (const e of events) {
    actionCounts.set(e.eventName, (actionCounts.get(e.eventName) ?? 0) + 1);
  }
  const topActions = Array.from(actionCounts.entries())
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count);

  // Average tokens per user (from earned events)
  const earnedEvents = events.filter(
    (e) => e.eventName === TOKEN_EVENTS.TOKEN_EARNED,
  );
  const totalTokens = earnedEvents.reduce(
    (sum, e) => sum + (typeof e.properties.amount === 'number' ? e.properties.amount : 0),
    0,
  );
  const avgTokensPerUser = uniqueUsers > 0 ? totalTokens / uniqueUsers : 0;

  // Redemption rate: redeemed events / earned events
  const redeemedEvents = events.filter(
    (e) => e.eventName === TOKEN_EVENTS.TOKEN_REDEEMED,
  );
  const redemptionRate =
    earnedEvents.length > 0 ? redeemedEvents.length / earnedEvents.length : 0;

  return {
    totalEvents,
    uniqueUsers,
    topActions,
    avgTokensPerUser,
    redemptionRate,
  };
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

function _date(daysAgo: number): Date {
  const d = new Date('2026-03-16T12:00:00Z');
  d.setDate(d.getDate() - daysAgo);
  return d;
}

export const MOCK_ANALYTICS_DATA = {
  events: [
    createAnalyticsEvent(TOKEN_EVENTS.TOKEN_EARNED, 'usr_001', { action_type: 'prescription_refill', amount: 10, source: 'organic', daily_count: 1 }),
    createAnalyticsEvent(TOKEN_EVENTS.TOKEN_EARNED, 'usr_002', { action_type: 'health_check', amount: 5, source: 'organic', daily_count: 1 }),
    createAnalyticsEvent(TOKEN_EVENTS.TOKEN_EARNED, 'usr_003', { action_type: 'survey_completed', amount: 15, source: 'campaign', daily_count: 2 }),
    createAnalyticsEvent(TOKEN_EVENTS.TOKEN_REDEEMED, 'usr_001', { reward_id: 'rwd_01', amount: 50, reward_name: 'Pharmacy Discount', remaining_balance: 120 }),
    createAnalyticsEvent(TOKEN_EVENTS.TOKEN_REDEEMED, 'usr_004', { reward_id: 'rwd_02', amount: 30, reward_name: 'Free Delivery', remaining_balance: 45 }),
    createAnalyticsEvent(TOKEN_EVENTS.STREAK_STARTED, 'usr_005', { streak_days: 1, event_type: 'started' }),
    createAnalyticsEvent(TOKEN_EVENTS.STREAK_MILESTONE, 'usr_002', { streak_days: 7, event_type: 'milestone' }),
    createAnalyticsEvent(TOKEN_EVENTS.STREAK_BROKEN, 'usr_006', { streak_days: 12, event_type: 'broken' }),
    createAnalyticsEvent(TOKEN_EVENTS.ACHIEVEMENT_UNLOCKED, 'usr_003', { achievement_id: 'ach_01', achievement_name: 'First Refill', token_reward: 25 }),
    createAnalyticsEvent(TOKEN_EVENTS.ACHIEVEMENT_UNLOCKED, 'usr_001', { achievement_id: 'ach_02', achievement_name: 'Weekly Warrior', token_reward: 50 }),
    createAnalyticsEvent(TOKEN_EVENTS.REWARD_VIEWED, 'usr_007', { tier: 'gold', rewards_available: 5 }),
    createAnalyticsEvent(TOKEN_EVENTS.REWARD_REDEEMED, 'usr_002', { reward_id: 'rwd_03', reward_name: 'Vitamin Pack', cost: 75 }),
    createAnalyticsEvent(TOKEN_EVENTS.REFERRAL_CODE_GENERATED, 'usr_001', { code: 'REF-USR001', channel: 'sms' }),
    createAnalyticsEvent(TOKEN_EVENTS.REFERRAL_CODE_USED, 'usr_008', { code: 'REF-USR001', referrer: 'usr_001' }),
    createAnalyticsEvent(TOKEN_EVENTS.LEADERBOARD_VIEWED, 'usr_003', { rank: 12, total_participants: 340 }),
    createAnalyticsEvent(TOKEN_EVENTS.DAILY_CAP_REACHED, 'usr_009', { cap_amount: 100, earned_today: 100 }),
    createAnalyticsEvent(TOKEN_EVENTS.TOKEN_EARNED, 'usr_004', { action_type: 'medication_log', amount: 8, source: 'organic', daily_count: 3 }),
    createAnalyticsEvent(TOKEN_EVENTS.TOKEN_EXPIRED, 'usr_010', { amount: 25, reason: 'inactivity', expired_at: '2026-03-01' }),
    createAnalyticsEvent(TOKEN_EVENTS.TOKEN_EARNED, 'usr_005', { action_type: 'health_check', amount: 5, source: 'organic', daily_count: 1 }),
    createAnalyticsEvent(TOKEN_EVENTS.STREAK_MILESTONE, 'usr_001', { streak_days: 30, event_type: 'milestone' }),
  ] as AnalyticsEvent[],

  retentionCohorts: [
    { cohortDate: '2026-01-01', daysSinceFirst: 7, activeUsers: 42, totalUsers: 50, retentionRate: 0.84 },
    { cohortDate: '2026-01-01', daysSinceFirst: 30, activeUsers: 31, totalUsers: 50, retentionRate: 0.62 },
    { cohortDate: '2026-01-15', daysSinceFirst: 7, activeUsers: 38, totalUsers: 45, retentionRate: 0.844 },
    { cohortDate: '2026-02-01', daysSinceFirst: 7, activeUsers: 55, totalUsers: 60, retentionRate: 0.917 },
    { cohortDate: '2026-02-01', daysSinceFirst: 30, activeUsers: 40, totalUsers: 60, retentionRate: 0.667 },
  ] as RetentionCohort[],

  redemptionCorrelations: [
    { userId: 'usr_001', redemptionDate: _date(45), reorderedWithin30Days: true, reorderedWithin60Days: true, reorderCount: 3 },
    { userId: 'usr_002', redemptionDate: _date(30), reorderedWithin30Days: true, reorderedWithin60Days: true, reorderCount: 2 },
    { userId: 'usr_003', redemptionDate: _date(60), reorderedWithin30Days: false, reorderedWithin60Days: true, reorderCount: 1 },
    { userId: 'usr_004', redemptionDate: _date(20), reorderedWithin30Days: true, reorderedWithin60Days: true, reorderCount: 4 },
    { userId: 'usr_005', redemptionDate: _date(10), reorderedWithin30Days: false, reorderedWithin60Days: false, reorderCount: 0 },
    { userId: 'usr_006', redemptionDate: _date(50), reorderedWithin30Days: true, reorderedWithin60Days: true, reorderCount: 2 },
    { userId: 'usr_007', redemptionDate: _date(35), reorderedWithin30Days: false, reorderedWithin60Days: true, reorderCount: 1 },
    { userId: 'usr_008', redemptionDate: _date(15), reorderedWithin30Days: true, reorderedWithin60Days: true, reorderCount: 3 },
  ] as RedemptionCorrelation[],

  streakHealthCorrelations: [
    { userId: 'usr_001', streakLength: 30, adherenceRate: 0.95, healthOutcomeScore: 82, improvementPercent: 17.1 },
    { userId: 'usr_002', streakLength: 14, adherenceRate: 0.85, healthOutcomeScore: 74, improvementPercent: 10.4 },
    { userId: 'usr_003', streakLength: 60, adherenceRate: 0.98, healthOutcomeScore: 91, improvementPercent: 24.7 },
    { userId: 'usr_004', streakLength: 7, adherenceRate: 0.71, healthOutcomeScore: 65, improvementPercent: 5.2 },
    { userId: 'usr_005', streakLength: 45, adherenceRate: 0.92, healthOutcomeScore: 88, improvementPercent: 20.3 },
    { userId: 'usr_006', streakLength: 3, adherenceRate: 0.60, healthOutcomeScore: 58, improvementPercent: 2.1 },
    { userId: 'usr_007', streakLength: 21, adherenceRate: 0.88, healthOutcomeScore: 77, improvementPercent: 13.6 },
    { userId: 'usr_008', streakLength: 90, adherenceRate: 0.99, healthOutcomeScore: 95, improvementPercent: 31.2 },
    { userId: 'usr_009', streakLength: 10, adherenceRate: 0.78, healthOutcomeScore: 69, improvementPercent: 7.8 },
    { userId: 'usr_010', streakLength: 5, adherenceRate: 0.65, healthOutcomeScore: 62, improvementPercent: 3.5 },
  ] as StreakHealthCorrelation[],
};
