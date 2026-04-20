// Prompt #100 — notification channel routing tests.

import { describe, it, expect } from 'vitest';
import {
  channelsFor,
  notificationSlaHours,
  requiresSMS,
} from '@/lib/map/notifications';

describe('channelsFor', () => {
  it('yellow is in_app only', () => {
    expect([...channelsFor('yellow')]).toEqual(['in_app']);
  });
  it('orange adds email', () => {
    expect([...channelsFor('orange')]).toEqual(['in_app', 'email']);
  });
  it('red + black add SMS', () => {
    expect([...channelsFor('red')]).toEqual(['in_app', 'email', 'sms']);
    expect([...channelsFor('black')]).toEqual(['in_app', 'email', 'sms']);
  });
});

describe('notificationSlaHours', () => {
  it('follows Prompt #100 §4.4 SLA values', () => {
    expect(notificationSlaHours('yellow')).toBe(168);
    expect(notificationSlaHours('orange')).toBe(24);
    expect(notificationSlaHours('red')).toBe(4);
    expect(notificationSlaHours('black')).toBe(1);
  });
});

describe('requiresSMS', () => {
  it('only red + black require SMS', () => {
    expect(requiresSMS('yellow')).toBe(false);
    expect(requiresSMS('orange')).toBe(false);
    expect(requiresSMS('red')).toBe(true);
    expect(requiresSMS('black')).toBe(true);
  });
});
