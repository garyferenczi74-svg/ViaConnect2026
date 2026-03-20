import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  Skeleton,
  CardSkeleton,
  ScreenSkeleton,
  ErrorState,
  NetworkError,
  EmptyState,
  InlineLoader,
} from '../../src/components/ui/LoadingStates';

describe('Skeleton', () => {
  it('renders with default classes', () => {
    const { toJSON } = render(<Skeleton />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders with custom width/height', () => {
    const { toJSON } = render(<Skeleton width="w-32" height="h-8" />);
    expect(toJSON()).toBeTruthy();
  });
});

describe('CardSkeleton', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<CardSkeleton />);
    expect(toJSON()).toBeTruthy();
  });
});

describe('ScreenSkeleton', () => {
  it('renders header and content skeletons', () => {
    const { toJSON } = render(<ScreenSkeleton />);
    const tree = toJSON();
    expect(tree).toBeTruthy();
  });
});

describe('ErrorState', () => {
  it('renders default title and message', () => {
    const { getByText } = render(<ErrorState />);
    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText(/couldn't load this content/)).toBeTruthy();
  });

  it('renders custom title and message', () => {
    const { getByText } = render(
      <ErrorState title="Oops" message="Custom error" />,
    );
    expect(getByText('Oops')).toBeTruthy();
    expect(getByText('Custom error')).toBeTruthy();
  });

  it('shows retry button when onRetry is provided', () => {
    const onRetry = jest.fn();
    const { getByText } = render(<ErrorState onRetry={onRetry} />);
    const btn = getByText('Try Again');
    expect(btn).toBeTruthy();
    fireEvent.press(btn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('hides retry button when no onRetry', () => {
    const { queryByText } = render(<ErrorState />);
    expect(queryByText('Try Again')).toBeNull();
  });

  it('uses custom retry label', () => {
    const { getByText } = render(
      <ErrorState onRetry={jest.fn()} retryLabel="Reload" />,
    );
    expect(getByText('Reload')).toBeTruthy();
  });
});

describe('NetworkError', () => {
  it('renders no connection message', () => {
    const { getByText } = render(<NetworkError />);
    expect(getByText('No Connection')).toBeTruthy();
  });

  it('passes onRetry to ErrorState', () => {
    const onRetry = jest.fn();
    const { getByText } = render(<NetworkError onRetry={onRetry} />);
    fireEvent.press(getByText('Retry'));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('EmptyState', () => {
  it('renders icon, title, and message', () => {
    const { getByText } = render(
      <EmptyState icon="🔍" title="No results" message="Try different search" />,
    );
    expect(getByText('🔍')).toBeTruthy();
    expect(getByText('No results')).toBeTruthy();
    expect(getByText('Try different search')).toBeTruthy();
  });

  it('renders action button when provided', () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <EmptyState title="Empty" actionLabel="Add Item" onAction={onAction} />,
    );
    fireEvent.press(getByText('Add Item'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('hides action button when no handler', () => {
    const { queryByText } = render(
      <EmptyState title="Empty" actionLabel="Add Item" />,
    );
    expect(queryByText('Add Item')).toBeNull();
  });
});

describe('InlineLoader', () => {
  it('renders default message', () => {
    const { getByText } = render(<InlineLoader />);
    expect(getByText('Loading...')).toBeTruthy();
  });

  it('renders custom message', () => {
    const { getByText } = render(<InlineLoader message="Fetching data..." />);
    expect(getByText('Fetching data...')).toBeTruthy();
  });
});
