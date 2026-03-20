import React from 'react';
import { render } from '@testing-library/react-native';
import { SNPVariantBadge, SNPVariantBadgeSkeleton } from '../../src/components/shared/SNPVariantBadge';

describe('SNPVariantBadge', () => {
  it('renders compact badge with gene:variant text', () => {
    const { getByText } = render(
      <SNPVariantBadge gene="MTHFR" variant="C677T" riskLevel="high" compact />,
    );
    expect(getByText('MTHFR:C677T')).toBeTruthy();
  });

  it('renders full badge with risk label', () => {
    const { getByText } = render(
      <SNPVariantBadge gene="COMT" variant="Val158Met" riskLevel="moderate" />,
    );
    expect(getByText('COMT:Val158Met')).toBeTruthy();
    expect(getByText('Heterozygous')).toBeTruthy();
  });

  it('shows Normal label for low risk', () => {
    const { getByText } = render(
      <SNPVariantBadge gene="VDR" variant="FokI" riskLevel="low" />,
    );
    expect(getByText('Normal')).toBeTruthy();
  });

  it('shows Homozygous label for high risk', () => {
    const { getByText } = render(
      <SNPVariantBadge gene="MTHFR" variant="C677T" riskLevel="high" />,
    );
    expect(getByText('Homozygous')).toBeTruthy();
  });

  it('has correct accessibility label in compact mode', () => {
    const { getByLabelText } = render(
      <SNPVariantBadge gene="MTHFR" variant="C677T" riskLevel="high" compact />,
    );
    expect(getByLabelText('MTHFR C677T Homozygous risk')).toBeTruthy();
  });

  it('has correct accessibility label in full mode', () => {
    const { getByLabelText } = render(
      <SNPVariantBadge gene="COMT" variant="Val158Met" riskLevel="moderate" />,
    );
    expect(getByLabelText('COMT variant Val158Met, risk level Heterozygous')).toBeTruthy();
  });

  it('renders skeleton without crashing', () => {
    const { toJSON } = render(<SNPVariantBadgeSkeleton />);
    expect(toJSON()).toBeTruthy();
  });
});
