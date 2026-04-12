// Gordan → Hannah delivery format (Prompt #62h).
// Gordan generates content; Hannah delivers it through avatar or cards.

export type DeliveryType = 'avatar' | 'card' | 'both';

export type AvatarAnimation =
  | 'speaking'
  | 'celebrating'
  | 'warning'
  | 'nudging';

export interface AvatarConfig {
  animation: AvatarAnimation;
  voiceText: string;
  duration: number;
}

export type CardPosition = 'dashboard' | 'nutrition_page' | 'notification';

export interface CardConfig {
  component: string;
  props: Record<string, unknown>;
  position: CardPosition;
}

export interface DeliveryAction {
  label: string;
  href: string;
}

export interface HannahDelivery {
  agentSource: 'gordan';
  deliveryType: DeliveryType;
  avatarConfig?: AvatarConfig;
  cardConfig?: CardConfig;
  content: {
    title: string;
    message: string;
    actions?: DeliveryAction[];
  };
}

export function createMealFeedbackDelivery(
  message: string,
  actions?: DeliveryAction[],
): HannahDelivery {
  return {
    agentSource: 'gordan',
    deliveryType: 'both',
    avatarConfig: {
      animation: 'speaking',
      voiceText: message,
      duration: Math.ceil(message.length / 15),
    },
    cardConfig: {
      component: 'MealInsightCard',
      props: {},
      position: 'nutrition_page',
    },
    content: {
      title: 'Meal Feedback from Gordan',
      message,
      actions,
    },
  };
}

export function createNudgeDelivery(message: string): HannahDelivery {
  return {
    agentSource: 'gordan',
    deliveryType: 'card',
    cardConfig: {
      component: 'EngagementNudge',
      props: { nudge: { iconName: 'Apple', message, pointsReward: '+10 pts for meal logging', priority: 55 } },
      position: 'dashboard',
    },
    content: {
      title: 'Nutrition Nudge',
      message,
    },
  };
}

export function createCelebrationDelivery(
  message: string,
  points: number,
): HannahDelivery {
  return {
    agentSource: 'gordan',
    deliveryType: 'both',
    avatarConfig: {
      animation: 'celebrating',
      voiceText: message,
      duration: 6,
    },
    cardConfig: {
      component: 'HelixRewardToast',
      props: { title: message, basePoints: points, tierMultiplier: 1 },
      position: 'notification',
    },
    content: {
      title: 'Nutrition Achievement',
      message,
    },
  };
}
