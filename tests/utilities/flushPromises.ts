export async function flushPromises(): Promise<void> {
  await new Promise<void>((resolve) => queueMicrotask(resolve));
}
