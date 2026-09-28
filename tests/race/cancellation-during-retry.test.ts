import { describe, expect, it } from 'vitest';
import { Deferred } from '../utilities/Deferred';

describe('cancellation during retry', () => {
  it('allows an in-flight operation to be deterministically released', async () => {
    const deferred = new Deferred<string>();
    const controller = new AbortController();
    const result = deferred.promise.then(() => controller.signal.aborted);
    controller.abort();
    deferred.resolve('released');
    await expect(result).resolves.toBe(true);
  });
});
