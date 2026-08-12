import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../../components/ErrorBoundary';

const BombComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Explosion in child component');
  }
  return <div>Healthy Child Component</div>;
};

describe('ErrorBoundary', () => {
  it('renders children normally when there is no error', () => {
    render(
      <ErrorBoundary name="test-boundary">
        <BombComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Healthy Child Component')).toBeInTheDocument();
  });

  it('catches render errors and renders fallback without throwing unhandled exceptions', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = vi.fn();

    render(
      <ErrorBoundary
        name="test-boundary"
        fallback={<div>Fallback Safe UI</div>}
        onError={onError}
      >
        <BombComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Fallback Safe UI')).toBeInTheDocument();
    expect(screen.queryByText('Healthy Child Component')).not.toBeInTheDocument();
    expect(onError).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
