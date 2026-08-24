import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { MorningCard } from '../../src/components/consumer/MorningCard';
import type { MorningProtocolItem } from '../../src/lib/morning-card/model';

jest.mock('lucide-react', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const icon = () => ReactLocal.createElement(View, null);
  return new Proxy(
    {},
    {
      get: () => icon,
    },
  );
});

const items: MorningProtocolItem[] = [
  { slotId: '1', name: 'MTHFR+', dose: null, timeOfDay: 'morning', taken: true },
  { slotId: '2', name: 'NAD+', dose: null, timeOfDay: 'afternoon', taken: false },
];

describe('Expo MorningCard', () => {
  it('renders Bio Optimization Score and not Vitality', () => {
    const { getByLabelText, queryByText } = render(
      <MorningCard score={72} protocolItems={items} />,
    );
    expect(getByLabelText('Bio Optimization Score 72')).toBeTruthy();
    expect(queryByText('Vitality')).toBeNull();
    expect(queryByText('Vitality Score')).toBeNull();
  });

  it('shows the first incomplete protocol action', () => {
    const { getByLabelText } = render(
      <MorningCard score={72} protocolItems={items} />,
    );
    expect(getByLabelText('Take NAD+')).toBeTruthy();
  });

  it('opens pending contributors on chip tap', () => {
    const { getByLabelText, getByText } = render(
      <MorningCard score={null} protocolItems={items} />,
    );
    fireEvent.press(getByLabelText('Recovery, sources pending'));
    expect(getByText('Recovery contributors')).toBeTruthy();
    expect(getByText('Whoop')).toBeTruthy();
    expect(getByText('Sources pending until wearable sync is confirmed.')).toBeTruthy();
  });

  it('uses an honest pending score placeholder', () => {
    const { getByLabelText } = render(
      <MorningCard score={null} protocolItems={[]} />,
    );
    expect(getByLabelText('Bio Optimization Score not yet computed')).toBeTruthy();
  });
});
