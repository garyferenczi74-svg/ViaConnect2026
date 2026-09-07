import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MeasurementsGrid } from '../MeasurementsGrid';
import { emptyMeasurements } from '@/lib/body-tracker/circumference';
import { LOG_MEASUREMENTS_CTA, MEASUREMENTS_EMPTY_COPY } from '@/lib/body-tracker/composition/circWriteContract';

describe('MeasurementsGrid empty-state CTA', () => {
  it('shows Log measurements when every card is null and keeps Not yet logged', () => {
    const html = renderToStaticMarkup(
      React.createElement(MeasurementsGrid, {
        data: emptyMeasurements(),
        previous: null,
        unit: 'cm',
        onLogMeasurements: () => undefined,
      }),
    );
    expect(html).toContain('measurements-empty-cta');
    expect(html).toContain(LOG_MEASUREMENTS_CTA);
    expect(html).toContain(MEASUREMENTS_EMPTY_COPY);
    expect(html).toContain('Not yet logged');
    expect(html).toContain('stroke-width="1.5"');
    expect(html).toContain('min-h-[44px]');
    expect(html).toContain('grid-cols-1');
    expect(html).toContain('sm:grid-cols-2');
  });

  it('omits the CTA when a finite girth is present', () => {
    const data = emptyMeasurements();
    data.waist = 80;
    const html = renderToStaticMarkup(
      React.createElement(MeasurementsGrid, {
        data,
        previous: null,
        unit: 'cm',
        onLogMeasurements: () => undefined,
      }),
    );
    expect(html).not.toContain('measurements-empty-cta');
    expect(html).toContain('80.0');
  });
});
