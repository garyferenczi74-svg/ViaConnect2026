import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GeneCard, GeneCardSkeleton } from '../../src/components/shared/GeneCard';

const baseProps = {
  geneName: 'MTHFR',
  variant: 'C677T',
  rsid: 'rs1801133',
  riskLevel: 'high' as const,
  category: 'Methylation',
};

describe('GeneCard', () => {
  it('renders gene name and rsid', () => {
    const { getByText } = render(<GeneCard {...baseProps} />);
    expect(getByText('MTHFR')).toBeTruthy();
    expect(getByText('rs1801133')).toBeTruthy();
  });

  it('renders category badge', () => {
    const { getByText } = render(<GeneCard {...baseProps} />);
    expect(getByText('Methylation')).toBeTruthy();
  });

  it('renders product recommendation when provided', () => {
    const { getByText } = render(
      <GeneCard
        {...baseProps}
        productName="MTHFR+"
        productSku="MTHFR-PLUS"
      />,
    );
    expect(getByText('MTHFR+')).toBeTruthy();
    expect(getByText('Recommended')).toBeTruthy();
  });

  it('does not render product section when no product', () => {
    const { queryByText } = render(<GeneCard {...baseProps} />);
    expect(queryByText('Recommended')).toBeNull();
  });

  it('calls onPress when card is pressed', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <GeneCard {...baseProps} onPress={onPress} />,
    );
    fireEvent.press(getByLabelText('MTHFR gene card, high risk'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('calls onProductPress with sku when product is pressed', () => {
    const onProductPress = jest.fn();
    const { getByLabelText } = render(
      <GeneCard
        {...baseProps}
        productName="MTHFR+"
        productSku="MTHFR-PLUS"
        onProductPress={onProductPress}
      />,
    );
    fireEvent.press(getByLabelText('Recommended product: MTHFR+'));
    expect(onProductPress).toHaveBeenCalledWith('MTHFR-PLUS');
  });

  it('has correct accessibility label', () => {
    const { getByLabelText } = render(<GeneCard {...baseProps} />);
    expect(getByLabelText('MTHFR gene card, high risk')).toBeTruthy();
  });

  it('renders skeleton without crashing', () => {
    const { toJSON } = render(<GeneCardSkeleton />);
    expect(toJSON()).toBeTruthy();
  });
});
