import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ViaTokenBadge, ViaTokenBadgeSkeleton } from '../../src/components/shared/ViaTokenBadge';
import type { TokenLedgerEntry, TierLevel } from '../../src/components/shared/ViaTokenBadge';

const mockLedger: TokenLedgerEntry[] = [
  { id: '1', type: 'EARN', amount: 50, description: 'Daily check-in', createdAt: '2026-03-20' },
  { id: '2', type: 'REDEEM', amount: -100, description: 'Discount applied', createdAt: '2026-03-19' },
  { id: '3', type: 'BONUS', amount: 200, description: 'Welcome bonus', createdAt: '2026-03-18' },
];

describe('ViaTokenBadge', () => {
  it('renders balance and tier', async () => {
    const { getByText } = render(
      <ViaTokenBadge balance={1500} tier="GOLD" />,
    );
    expect(getByText('GOLD')).toBeTruthy();
    expect(getByText('ViaTokens')).toBeTruthy();
    // Counter animates, so wait for final value
    await waitFor(() => expect(getByText('1,500')).toBeTruthy());
  });

  it('renders correct tier icon for BRONZE', () => {
    const { getByText } = render(
      <ViaTokenBadge balance={100} tier="BRONZE" />,
    );
    expect(getByText('🥉')).toBeTruthy();
  });

  it('renders correct tier icon for PLATINUM', () => {
    const { getByText } = render(
      <ViaTokenBadge balance={5000} tier="PLATINUM" />,
    );
    expect(getByText('💎')).toBeTruthy();
  });

  it('shows skeleton when loading', () => {
    const { toJSON } = render(
      <ViaTokenBadge balance={0} tier="BRONZE" isLoading />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('opens history modal on press', async () => {
    const { getByLabelText, getByText } = render(
      <ViaTokenBadge balance={1500} tier="GOLD" ledger={mockLedger} />,
    );
    fireEvent.press(getByLabelText('1500 ViaTokens, GOLD tier. Tap to view history'));
    await waitFor(() => expect(getByText('Token History')).toBeTruthy());
    expect(getByText('Daily check-in')).toBeTruthy();
    expect(getByText('Discount applied')).toBeTruthy();
  });

  it('calls custom onPress instead of opening modal', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <ViaTokenBadge balance={500} tier="SILVER" onPress={onPress} />,
    );
    fireEvent.press(getByLabelText('500 ViaTokens, SILVER tier. Tap to view history'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows empty state in modal when no ledger', async () => {
    const { getByLabelText, getByText } = render(
      <ViaTokenBadge balance={0} tier="BRONZE" ledger={[]} />,
    );
    fireEvent.press(getByLabelText('0 ViaTokens, BRONZE tier. Tap to view history'));
    await waitFor(() => expect(getByText('No transactions yet')).toBeTruthy());
  });

  it('renders ViaTokenBadgeSkeleton without crashing', () => {
    const { toJSON } = render(<ViaTokenBadgeSkeleton />);
    expect(toJSON()).toBeTruthy();
  });
});
