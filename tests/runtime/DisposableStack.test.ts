import { describe, expect, it, vi } from 'vitest';
import { DisposableStack } from '../../runtime/DisposableStack';

describe('DisposableStack', () => {
  it('disposes in reverse order and is idempotent', async () => {
    const stack = new DisposableStack();
    const order: number[] = [];
    stack.use(() => {
      order.push(1);
    });
    stack.use(() => {
      order.push(2);
    });

    await stack.dispose();
    await stack.dispose();

    expect(order).toEqual([2, 1]);
    expect(stack.isDisposed).toBe(true);
  });

  it('continues cleanup after a failure', async () => {
    const stack = new DisposableStack();
    const cleanup = vi.fn();
    stack.use(() => {
      throw new Error('cleanup failed');
    });
    stack.use(cleanup);

    await stack.dispose();
    expect(cleanup).toHaveBeenCalledOnce();
  });
});
