// ─────────────────────────────────────────────────────────────────────────────
// FarmaTokens — Ledger & Earning Engine for ViaConnect GeneX360
// ─────────────────────────────────────────────────────────────────────────────

// ── Types ────────────────────────────────────────────────────────────────────

export type ActionType =
  | 'caq_completion'
  | 'genetic_upload'
  | 'protocol_adherence'
  | 'supplement_purchase'
  | 'health_goal_achieved'
  | 'community_post'
  | 'referral_signup'
  | 'referral_purchase'
  | 'streak_bonus'
  | 'daily_check_in'
  | 'lab_import'
  | 'wearable_sync'
  | 'review_supplement'
  | 'share_protocol'
  | 'achievement_unlocked'
  | 'redemption'
  | 'expiration'
  | 'admin_adjustment';

export type TransactionType = 'earn' | 'spend' | 'expire' | 'adjustment';

export interface LedgerEntry {
  id: string;
  userId: string;
  actionType: ActionType;
  transactionType: TransactionType;
  amount: number; // positive for earn, negative for spend/expire
  referenceId?: string; // links to order, protocol, achievement, etc.
  idempotencyKey?: string; // prevents double-spend on redemption
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface TokenBalance {
  userId: string;
  available: number;
  pending: number;
  lifetime: number;
  lastUpdated: Date;
}

export interface StreakState {
  userId: string;
  streakCurrent: number;
  streakLongest: number;
  streakStartDate: Date | null;
  lastAdherenceDate: Date | null;
}

export interface ReferralCode {
  code: string;
  userId: string;
  createdAt: Date;
  usedBy: string[];
  tokensEarned: number;
}

export interface DailyCap {
  actionType: ActionType;
  maxPerDay: number;
  currentCount: number;
  resetAt: Date;
}

export interface RewardTier {
  id: string;
  name: string;
  description: string;
  tokenCost: number;
  rewardType:
    | 'store_credit'
    | 'free_product'
    | 'vip_access'
    | 'exclusive_content'
    | 'discount';
  rewardValue: string;
  icon: string;
  available: boolean;
}

export interface RedemptionResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  remainingBalance?: number;
}

export interface EarningResult {
  success: boolean;
  tokensEarned: number;
  newBalance: number;
  dailyCapReached: boolean;
  streakBonus?: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category:
    | 'streak'
    | 'protocol'
    | 'genomics'
    | 'community'
    | 'shopping'
    | 'milestone';
  requirement: string;
  tokenReward: number;
  unlockedAt?: Date;
}

export interface LeaderboardEntry {
  rank: number;
  displayName: string; // anonymized
  tokensLifetime: number;
  streakCurrent: number;
  achievementCount: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

export const TOKEN_VALUES: Record<ActionType, number> = {
  caq_completion: 500,
  genetic_upload: 300,
  protocol_adherence: 10, // per day
  supplement_purchase: 50, // per order
  health_goal_achieved: 100,
  community_post: 15,
  referral_signup: 200,
  referral_purchase: 100,
  streak_bonus: 0, // calculated dynamically
  daily_check_in: 5,
  lab_import: 75,
  wearable_sync: 20,
  review_supplement: 25,
  share_protocol: 30,
  achievement_unlocked: 0, // varies per achievement
  redemption: 0,
  expiration: 0,
  admin_adjustment: 0,
};

export const DAILY_CAPS: Partial<Record<ActionType, number>> = {
  protocol_adherence: 30, // max 3 times/day
  daily_check_in: 5, // once/day
  community_post: 45, // 3 posts/day
  review_supplement: 50, // 2 reviews/day
  wearable_sync: 20, // once/day
};

// ── Reward Tiers ─────────────────────────────────────────────────────────────

export const REWARD_TIERS: RewardTier[] = [
  {
    id: 'tier_01_5_credit',
    name: '$5 Store Credit',
    description: 'Redeem for $5 off your next supplement order.',
    tokenCost: 100,
    rewardType: 'store_credit',
    rewardValue: '5.00',
    icon: 'gift',
    available: true,
  },
  {
    id: 'tier_02_10_credit',
    name: '$10 Store Credit',
    description: 'Redeem for $10 off your next supplement order.',
    tokenCost: 200,
    rewardType: 'store_credit',
    rewardValue: '10.00',
    icon: 'gift',
    available: true,
  },
  {
    id: 'tier_03_free_shipping',
    name: 'Free Shipping',
    description: 'Free standard shipping on your next order.',
    tokenCost: 150,
    rewardType: 'discount',
    rewardValue: 'free_shipping',
    icon: 'truck',
    available: true,
  },
  {
    id: 'tier_04_15_discount',
    name: '15% Discount',
    description: '15% off a single order — stackable with subscriptions.',
    tokenCost: 300,
    rewardType: 'discount',
    rewardValue: '15_percent',
    icon: 'percent',
    available: true,
  },
  {
    id: 'tier_05_25_credit',
    name: '$25 Store Credit',
    description: 'Redeem for $25 off your next supplement order.',
    tokenCost: 500,
    rewardType: 'store_credit',
    rewardValue: '25.00',
    icon: 'gift',
    available: true,
  },
  {
    id: 'tier_06_free_sample',
    name: 'Free Product Sample',
    description: 'Receive a complimentary sample of a new formula.',
    tokenCost: 750,
    rewardType: 'free_product',
    rewardValue: 'sample_pack',
    icon: 'package',
    available: true,
  },
  {
    id: 'tier_07_50_credit',
    name: '$50 Store Credit',
    description: 'Redeem for $50 off your next supplement order.',
    tokenCost: 1000,
    rewardType: 'store_credit',
    rewardValue: '50.00',
    icon: 'gift',
    available: true,
  },
  {
    id: 'tier_08_consultation',
    name: 'Premium Consultation',
    description:
      'One-on-one 30-minute session with a pharmacogenomics specialist.',
    tokenCost: 1500,
    rewardType: 'exclusive_content',
    rewardValue: 'pgx_consultation_30',
    icon: 'user-check',
    available: true,
  },
  {
    id: 'tier_09_100_credit',
    name: '$100 Store Credit',
    description: 'Redeem for $100 off your next supplement order.',
    tokenCost: 2000,
    rewardType: 'store_credit',
    rewardValue: '100.00',
    icon: 'gift',
    available: true,
  },
  {
    id: 'tier_10_founders_circle',
    name: 'Founders Circle VIP',
    description:
      'Exclusive access, priority support, and a 20% lifetime discount on all orders.',
    tokenCost: 3000,
    rewardType: 'vip_access',
    rewardValue: 'founders_circle_vip',
    icon: 'crown',
    available: true,
  },
];

// ── Achievement Database ─────────────────────────────────────────────────────

export const ACHIEVEMENTS: Achievement[] = [
  // Streak
  {
    id: 'streak_7_day',
    name: '7-Day Warrior',
    description: 'Maintain a protocol adherence streak for 7 consecutive days.',
    icon: 'flame',
    category: 'streak',
    requirement: 'streak >= 7',
    tokenReward: 50,
  },
  {
    id: 'streak_30_day',
    name: '30-Day Champion',
    description:
      'Maintain a protocol adherence streak for 30 consecutive days.',
    icon: 'trophy',
    category: 'streak',
    requirement: 'streak >= 30',
    tokenReward: 250,
  },
  {
    id: 'streak_90_day',
    name: '90-Day Legend',
    description:
      'Maintain a protocol adherence streak for 90 consecutive days.',
    icon: 'star',
    category: 'streak',
    requirement: 'streak >= 90',
    tokenReward: 1000,
  },
  // Protocol
  {
    id: 'protocol_first',
    name: 'First Protocol',
    description: 'Complete your first personalized supplement protocol.',
    icon: 'clipboard-check',
    category: 'protocol',
    requirement: 'protocolCount >= 1',
    tokenReward: 25,
  },
  {
    id: 'protocol_master',
    name: 'Protocol Master',
    description: 'Complete 10 protocol cycles with documented outcomes.',
    icon: 'award',
    category: 'protocol',
    requirement: 'protocolCount >= 10',
    tokenReward: 100,
  },
  {
    id: 'protocol_full_week',
    name: 'Full Adherence Week',
    description: 'Achieve 100% adherence across all supplements for 7 days.',
    icon: 'check-circle',
    category: 'protocol',
    requirement: 'streak >= 7 && fullAdherence',
    tokenReward: 75,
  },
  // Genomics
  {
    id: 'genomics_first_report',
    name: 'First Report',
    description: 'Generate your first pharmacogenomic insight report.',
    icon: 'dna',
    category: 'genomics',
    requirement: 'genomicPanels >= 1',
    tokenReward: 50,
  },
  {
    id: 'genomics_all_panels',
    name: 'All Panels Complete',
    description:
      'Complete every available genomic panel for comprehensive coverage.',
    icon: 'layers',
    category: 'genomics',
    requirement: 'genomicPanels >= 5',
    tokenReward: 200,
  },
  {
    id: 'genomics_pathway_pioneer',
    name: 'Pathway Pioneer',
    description:
      'Be among the first to explore a newly released metabolic pathway panel.',
    icon: 'map',
    category: 'genomics',
    requirement: 'genomicPanels >= 3',
    tokenReward: 100,
  },
  // Community
  {
    id: 'community_first_post',
    name: 'First Post',
    description: 'Publish your first community post or question.',
    icon: 'message-circle',
    category: 'community',
    requirement: 'communityPosts >= 1',
    tokenReward: 10,
  },
  {
    id: 'community_helpful_answer',
    name: 'Helpful Answer',
    description: 'Receive 5 upvotes on a single community answer.',
    icon: 'thumbs-up',
    category: 'community',
    requirement: 'communityPosts >= 10',
    tokenReward: 50,
  },
  {
    id: 'community_leader',
    name: 'Community Leader',
    description:
      'Reach 50 community contributions with consistently high ratings.',
    icon: 'users',
    category: 'community',
    requirement: 'communityPosts >= 50',
    tokenReward: 200,
  },
  // Shopping
  {
    id: 'shopping_first_purchase',
    name: 'First Purchase',
    description: 'Complete your first supplement purchase through ViaConnect.',
    icon: 'shopping-bag',
    category: 'shopping',
    requirement: 'purchaseCount >= 1',
    tokenReward: 25,
  },
  {
    id: 'shopping_loyal_customer',
    name: 'Loyal Customer',
    description: 'Complete 10 supplement purchases.',
    icon: 'heart',
    category: 'shopping',
    requirement: 'purchaseCount >= 10',
    tokenReward: 100,
  },
  {
    id: 'shopping_big_spender',
    name: 'Big Spender',
    description: 'Complete 25 supplement purchases — you know what works.',
    icon: 'zap',
    category: 'shopping',
    requirement: 'purchaseCount >= 25',
    tokenReward: 150,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

let _idCounter = 0;

/**
 * Generate a unique ID with a prefix. Uses a monotonic counter combined with a
 * random suffix so IDs are both human-readable and collision-resistant.
 */
function generateId(prefix: string): string {
  _idCounter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${_idCounter}_${rand}`;
}

/**
 * Check whether two Date objects fall on the same calendar day (UTC).
 */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/**
 * Check whether two dates are consecutive calendar days (UTC).
 */
function isConsecutiveDay(earlier: Date, later: Date): boolean {
  const msPerDay = 86_400_000;
  const startOfEarlier = Date.UTC(
    earlier.getUTCFullYear(),
    earlier.getUTCMonth(),
    earlier.getUTCDate(),
  );
  const startOfLater = Date.UTC(
    later.getUTCFullYear(),
    later.getUTCMonth(),
    later.getUTCDate(),
  );
  return startOfLater - startOfEarlier === msPerDay;
}

/**
 * Anonymize a userId into a display-safe name for leaderboards.
 */
function anonymize(userId: string): string {
  const hash = Array.from(userId).reduce(
    (acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) | 0,
    0,
  );
  const adjectives = [
    'Swift',
    'Bright',
    'Bold',
    'Keen',
    'Calm',
    'Pure',
    'Vivid',
    'Brave',
  ];
  const nouns = [
    'Helix',
    'Strand',
    'Gene',
    'Cell',
    'Pulse',
    'Atom',
    'Wave',
    'Core',
  ];
  const adj = adjectives[Math.abs(hash) % adjectives.length];
  const noun = nouns[Math.abs(hash >> 4) % nouns.length];
  const num = Math.abs(hash % 1000)
    .toString()
    .padStart(3, '0');
  return `${adj}${noun}#${num}`;
}

// ── Streak Bonus ─────────────────────────────────────────────────────────────

/**
 * Calculate the one-time streak milestone bonus for a given streak length.
 *
 * Milestones:
 *   7 days  -> +50 FT
 *  14 days  -> +100 FT
 *  30 days  -> +250 FT
 *  60 days  -> +500 FT
 *  90 days  -> +1 000 FT
 *  Every additional 30 days beyond 90 -> +500 FT
 */
export function calculateStreakBonus(streakDays: number): number {
  if (streakDays <= 0) return 0;

  // Fixed milestones
  const milestones: [number, number][] = [
    [7, 50],
    [14, 100],
    [30, 250],
    [60, 500],
    [90, 1000],
  ];

  // Check fixed milestones (exact match — bonuses are awarded once at the
  // milestone day, not cumulatively).
  for (const [day, bonus] of milestones) {
    if (streakDays === day) return bonus;
  }

  // Every 30 days beyond 90
  if (streakDays > 90 && streakDays % 30 === 0) {
    return 500;
  }

  return 0;
}

// ── Core Functions ───────────────────────────────────────────────────────────

/**
 * Create a new immutable ledger entry. This is the single write-path for all
 * token mutations — earn, spend, expire, and admin adjustments.
 */
export function createLedgerEntry(
  userId: string,
  actionType: ActionType,
  amount: number,
  description: string,
  referenceId?: string,
  idempotencyKey?: string,
  metadata?: Record<string, unknown>,
): LedgerEntry {
  let transactionType: TransactionType;

  if (actionType === 'redemption') {
    transactionType = 'spend';
  } else if (actionType === 'expiration') {
    transactionType = 'expire';
  } else if (actionType === 'admin_adjustment') {
    transactionType = 'adjustment';
  } else {
    transactionType = 'earn';
  }

  return {
    id: generateId('txn'),
    userId,
    actionType,
    transactionType,
    amount,
    referenceId,
    idempotencyKey,
    description,
    metadata,
    createdAt: new Date(),
  };
}

/**
 * Derive the current token balance for a user from their complete ledger.
 *
 * - `available`: net spendable balance (earn + adjustment - spend - expire)
 * - `pending`: reserved for future use (always 0 in this implementation)
 * - `lifetime`: sum of all positive transactions (earn + positive adjustments)
 */
export function calculateBalance(entries: LedgerEntry[]): TokenBalance {
  if (entries.length === 0) {
    return {
      userId: '',
      available: 0,
      pending: 0,
      lifetime: 0,
      lastUpdated: new Date(),
    };
  }

  const userId = entries[0].userId;
  let available = 0;
  let lifetime = 0;
  let lastUpdated = new Date(0);

  for (const entry of entries) {
    available += entry.amount;

    if (entry.amount > 0) {
      lifetime += entry.amount;
    }

    if (entry.createdAt > lastUpdated) {
      lastUpdated = entry.createdAt;
    }
  }

  // Guard against floating-point drift
  available = Math.round(available);
  lifetime = Math.round(lifetime);

  return {
    userId,
    available: Math.max(available, 0),
    pending: 0,
    lifetime,
    lastUpdated,
  };
}

/**
 * Check whether a given action is still within its daily cap.
 */
export function checkDailyCap(
  actionType: ActionType,
  caps: DailyCap[],
): { allowed: boolean; remaining: number } {
  const capLimit = DAILY_CAPS[actionType];

  // No cap configured — always allowed
  if (capLimit === undefined) {
    return { allowed: true, remaining: Infinity };
  }

  const existing = caps.find((c) => c.actionType === actionType);
  const now = new Date();

  if (!existing) {
    // No tracking entry yet — full allowance available
    return { allowed: true, remaining: capLimit };
  }

  // If the cap has expired (past its reset time), treat as fresh
  if (now >= existing.resetAt) {
    return { allowed: true, remaining: capLimit };
  }

  const tokenValue = TOKEN_VALUES[actionType];
  const remaining = existing.maxPerDay - existing.currentCount;
  const allowed = remaining >= tokenValue;

  return { allowed, remaining: Math.max(remaining, 0) };
}

/**
 * Process an earning action for a user. Validates daily caps, awards base
 * tokens, and calculates any applicable streak bonus.
 *
 * Returns the resulting earning summary including new balance.
 */
export function processEarning(
  userId: string,
  actionType: ActionType,
  ledger: LedgerEntry[],
  dailyCaps: DailyCap[],
  streak: StreakState,
): EarningResult {
  // Check daily cap
  const capCheck = checkDailyCap(actionType, dailyCaps);
  if (!capCheck.allowed) {
    const balance = calculateBalance(
      ledger.filter((e) => e.userId === userId),
    );
    return {
      success: false,
      tokensEarned: 0,
      newBalance: balance.available,
      dailyCapReached: true,
    };
  }

  const baseAmount = TOKEN_VALUES[actionType];

  // Create the base earning entry
  const entry = createLedgerEntry(
    userId,
    actionType,
    baseAmount,
    `Earned ${baseAmount} FT for ${actionType.replace(/_/g, ' ')}`,
  );
  ledger.push(entry);

  // Update daily cap tracking
  const capLimit = DAILY_CAPS[actionType];
  if (capLimit !== undefined) {
    const existing = dailyCaps.find((c) => c.actionType === actionType);
    const now = new Date();

    if (existing && now < existing.resetAt) {
      existing.currentCount += baseAmount;
    } else {
      // Reset or create cap tracker
      const resetAt = new Date(now);
      resetAt.setUTCHours(23, 59, 59, 999);

      if (existing) {
        existing.currentCount = baseAmount;
        existing.resetAt = resetAt;
      } else {
        dailyCaps.push({
          actionType,
          maxPerDay: capLimit,
          currentCount: baseAmount,
          resetAt,
        });
      }
    }
  }

  // Calculate streak bonus for adherence actions
  let streakBonus = 0;
  if (actionType === 'protocol_adherence' || actionType === 'daily_check_in') {
    streakBonus = calculateStreakBonus(streak.streakCurrent);
    if (streakBonus > 0) {
      const bonusEntry = createLedgerEntry(
        userId,
        'streak_bonus',
        streakBonus,
        `Streak bonus: ${streak.streakCurrent}-day milestone (+${streakBonus} FT)`,
        undefined,
        undefined,
        { streakDays: streak.streakCurrent },
      );
      ledger.push(bonusEntry);
    }
  }

  const totalEarned = baseAmount + streakBonus;
  const balance = calculateBalance(ledger.filter((e) => e.userId === userId));

  // Check if cap is now reached after this earning
  const postCapCheck = checkDailyCap(actionType, dailyCaps);

  return {
    success: true,
    tokensEarned: totalEarned,
    newBalance: balance.available,
    dailyCapReached: !postCapCheck.allowed,
    streakBonus: streakBonus > 0 ? streakBonus : undefined,
  };
}

/**
 * Process a token redemption against a reward tier. Validates sufficient
 * balance and idempotency to prevent duplicate redemptions.
 */
export function processRedemption(
  userId: string,
  rewardTierId: string,
  balance: TokenBalance,
  idempotencyKey: string,
  ledger?: LedgerEntry[],
): RedemptionResult {
  // Find the reward tier
  const tier = REWARD_TIERS.find((t) => t.id === rewardTierId);
  if (!tier) {
    return { success: false, error: 'Reward tier not found.' };
  }

  if (!tier.available) {
    return { success: false, error: 'This reward is currently unavailable.' };
  }

  // Check balance
  if (balance.available < tier.tokenCost) {
    return {
      success: false,
      error: `Insufficient balance. Need ${tier.tokenCost} FT, have ${balance.available} FT.`,
    };
  }

  // Check idempotency — prevent duplicate redemptions
  if (ledger) {
    const duplicate = ledger.find(
      (e) => e.idempotencyKey === idempotencyKey,
    );
    if (duplicate) {
      return {
        success: false,
        error: 'Duplicate redemption detected (idempotency key already used).',
        transactionId: duplicate.id,
      };
    }
  }

  // Create the spend entry
  const entry = createLedgerEntry(
    userId,
    'redemption',
    -tier.tokenCost,
    `Redeemed ${tier.tokenCost} FT for ${tier.name}`,
    rewardTierId,
    idempotencyKey,
    { rewardType: tier.rewardType, rewardValue: tier.rewardValue },
  );

  if (ledger) {
    ledger.push(entry);
  }

  return {
    success: true,
    transactionId: entry.id,
    remainingBalance: balance.available - tier.tokenCost,
  };
}

/**
 * Evaluate and update a user's adherence streak based on their adherence log.
 *
 * The log should contain Date objects representing days the user adhered to
 * their protocol. Dates need not be sorted — the function handles ordering.
 */
export function evaluateStreak(
  userId: string,
  adherenceLog: Date[],
  currentStreak: StreakState,
): StreakState {
  if (adherenceLog.length === 0) {
    return { ...currentStreak };
  }

  // Sort ascending by date
  const sorted = [...adherenceLog].sort((a, b) => a.getTime() - b.getTime());
  const latestAdherence = sorted[sorted.length - 1];

  // If the latest adherence is today and we already counted it, return as-is
  if (
    currentStreak.lastAdherenceDate &&
    isSameDay(currentStreak.lastAdherenceDate, latestAdherence)
  ) {
    return { ...currentStreak };
  }

  let newStreak: StreakState;

  if (
    currentStreak.lastAdherenceDate &&
    isConsecutiveDay(currentStreak.lastAdherenceDate, latestAdherence)
  ) {
    // Streak continues
    const streakCurrent = currentStreak.streakCurrent + 1;
    newStreak = {
      userId,
      streakCurrent,
      streakLongest: Math.max(currentStreak.streakLongest, streakCurrent),
      streakStartDate: currentStreak.streakStartDate,
      lastAdherenceDate: latestAdherence,
    };
  } else if (
    currentStreak.lastAdherenceDate &&
    isSameDay(currentStreak.lastAdherenceDate, latestAdherence)
  ) {
    // Same day — no change
    newStreak = { ...currentStreak };
  } else {
    // Streak broken or first adherence — start fresh
    newStreak = {
      userId,
      streakCurrent: 1,
      streakLongest: Math.max(currentStreak.streakLongest, 1),
      streakStartDate: latestAdherence,
      lastAdherenceDate: latestAdherence,
    };
  }

  return newStreak;
}

/**
 * Generate a referral code in VIA-XXXX-XXXX format for the given user.
 */
export function generateReferralCode(userId: string): ReferralCode {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1 for clarity
  let segment1 = '';
  let segment2 = '';

  for (let i = 0; i < 4; i++) {
    segment1 += chars[Math.floor(Math.random() * chars.length)];
    segment2 += chars[Math.floor(Math.random() * chars.length)];
  }

  return {
    code: `VIA-${segment1}-${segment2}`,
    userId,
    createdAt: new Date(),
    usedBy: [],
    tokensEarned: 0,
  };
}

/**
 * Process a referral: credit both the referrer and the new user.
 *
 * Returns the two ledger entries on success, or null if the code is invalid,
 * the user has already used a referral, or the user is trying to self-refer.
 */
export function processReferral(
  referralCode: string,
  newUserId: string,
  referralCodes: ReferralCode[],
): { referrerEarning: LedgerEntry; newUserEarning: LedgerEntry } | null {
  const codeRecord = referralCodes.find((rc) => rc.code === referralCode);

  if (!codeRecord) {
    return null; // Invalid code
  }

  // Prevent self-referral
  if (codeRecord.userId === newUserId) {
    return null;
  }

  // Prevent duplicate use by the same new user
  if (codeRecord.usedBy.includes(newUserId)) {
    return null;
  }

  // Credit referrer
  const referrerEarning = createLedgerEntry(
    codeRecord.userId,
    'referral_signup',
    TOKEN_VALUES.referral_signup,
    `Referral bonus: ${newUserId} signed up with code ${referralCode}`,
    referralCode,
    undefined,
    { referredUser: newUserId },
  );

  // Credit new user
  const newUserEarning = createLedgerEntry(
    newUserId,
    'referral_signup',
    TOKEN_VALUES.referral_signup,
    `Welcome bonus: signed up with referral code ${referralCode}`,
    referralCode,
    undefined,
    { referrer: codeRecord.userId },
  );

  // Update the code record
  codeRecord.usedBy.push(newUserId);
  codeRecord.tokensEarned += TOKEN_VALUES.referral_signup;

  return { referrerEarning, newUserEarning };
}

/**
 * Return reward tiers the user can currently afford.
 */
export function getAvailableRewards(balance: TokenBalance): RewardTier[] {
  return REWARD_TIERS.filter(
    (tier) => tier.available && tier.tokenCost <= balance.available,
  );
}

/**
 * Build a leaderboard from a collection of user data. Entries are sorted by
 * lifetime tokens descending. User names are anonymized for privacy.
 */
export function getLeaderboard(
  entries: {
    userId: string;
    entries: LedgerEntry[];
    streak: StreakState;
    achievements: Achievement[];
  }[],
): LeaderboardEntry[] {
  const board: LeaderboardEntry[] = entries.map((user) => {
    const balance = calculateBalance(user.entries);
    return {
      rank: 0, // assigned after sort
      displayName: anonymize(user.userId),
      tokensLifetime: balance.lifetime,
      streakCurrent: user.streak.streakCurrent,
      achievementCount: user.achievements.filter((a) => a.unlockedAt).length,
    };
  });

  // Sort descending by lifetime tokens, break ties with streak
  board.sort((a, b) => {
    if (b.tokensLifetime !== a.tokensLifetime) {
      return b.tokensLifetime - a.tokensLifetime;
    }
    return b.streakCurrent - a.streakCurrent;
  });

  // Assign ranks (1-based, with ties sharing the same rank)
  for (let i = 0; i < board.length; i++) {
    if (
      i > 0 &&
      board[i].tokensLifetime === board[i - 1].tokensLifetime &&
      board[i].streakCurrent === board[i - 1].streakCurrent
    ) {
      board[i].rank = board[i - 1].rank;
    } else {
      board[i].rank = i + 1;
    }
  }

  return board;
}

/**
 * Evaluate a user's stats against the achievement database and return any
 * newly unlocked achievements (those not already in the `unlocked` set).
 */
export function checkAchievements(
  userId: string,
  stats: {
    streakCurrent: number;
    protocolCount: number;
    purchaseCount: number;
    communityPosts: number;
    genomicPanels: number;
  },
  unlocked: string[],
): Achievement[] {
  const newlyUnlocked: Achievement[] = [];
  const unlockedSet = new Set(unlocked);

  for (const achievement of ACHIEVEMENTS) {
    // Skip already unlocked
    if (unlockedSet.has(achievement.id)) continue;

    let qualifies = false;

    switch (achievement.id) {
      // Streak
      case 'streak_7_day':
        qualifies = stats.streakCurrent >= 7;
        break;
      case 'streak_30_day':
        qualifies = stats.streakCurrent >= 30;
        break;
      case 'streak_90_day':
        qualifies = stats.streakCurrent >= 90;
        break;

      // Protocol
      case 'protocol_first':
        qualifies = stats.protocolCount >= 1;
        break;
      case 'protocol_master':
        qualifies = stats.protocolCount >= 10;
        break;
      case 'protocol_full_week':
        qualifies = stats.streakCurrent >= 7 && stats.protocolCount >= 1;
        break;

      // Genomics
      case 'genomics_first_report':
        qualifies = stats.genomicPanels >= 1;
        break;
      case 'genomics_all_panels':
        qualifies = stats.genomicPanels >= 5;
        break;
      case 'genomics_pathway_pioneer':
        qualifies = stats.genomicPanels >= 3;
        break;

      // Community
      case 'community_first_post':
        qualifies = stats.communityPosts >= 1;
        break;
      case 'community_helpful_answer':
        qualifies = stats.communityPosts >= 10;
        break;
      case 'community_leader':
        qualifies = stats.communityPosts >= 50;
        break;

      // Shopping
      case 'shopping_first_purchase':
        qualifies = stats.purchaseCount >= 1;
        break;
      case 'shopping_loyal_customer':
        qualifies = stats.purchaseCount >= 10;
        break;
      case 'shopping_big_spender':
        qualifies = stats.purchaseCount >= 25;
        break;

      default:
        break;
    }

    if (qualifies) {
      newlyUnlocked.push({
        ...achievement,
        unlockedAt: new Date(),
      });
    }
  }

  return newlyUnlocked;
}

export * from './analytics';
