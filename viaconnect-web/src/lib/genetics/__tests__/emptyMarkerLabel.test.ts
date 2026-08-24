import { describe, expect, it } from 'vitest';
import {
  NOT_ANALYZED_LABEL,
  emptyMarkerCountLabel,
  isEmptyMarkerCount,
} from '../emptyMarkerLabel';

describe('emptyMarkerCountLabel', () => {
  it('renders empty as Not analyzed, never 0', () => {
    expect(emptyMarkerCountLabel(0)).toBe(NOT_ANALYZED_LABEL);
    expect(emptyMarkerCountLabel(null)).toBe(NOT_ANALYZED_LABEL);
    expect(emptyMarkerCountLabel(undefined)).toBe(NOT_ANALYZED_LABEL);
    expect(emptyMarkerCountLabel(0)).not.toBe('0');
  });

  it('keeps a real observed count numeric', () => {
    expect(emptyMarkerCountLabel(3)).toBe('3');
    expect(isEmptyMarkerCount(3)).toBe(false);
    expect(isEmptyMarkerCount(0)).toBe(true);
  });

  it('does not rename the Unanalyzed or Demo chips from PR 32 / Brief 16', () => {
    expect(NOT_ANALYZED_LABEL).toBe('Not analyzed');
    expect(NOT_ANALYZED_LABEL).not.toBe('Unanalyzed');
    expect(NOT_ANALYZED_LABEL).not.toBe('Demo');
    expect(emptyMarkerCountLabel(0)).not.toBe('Unanalyzed');
    expect(emptyMarkerCountLabel(0)).not.toBe('0');
  });
});
