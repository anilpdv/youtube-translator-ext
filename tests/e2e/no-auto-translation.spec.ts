
import { test, expect } from '@playwright/test';

test('does not automatically translate', async ({ page }) => {
  await page.goto('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

  // Wait for a few seconds to see if a translation is automatically triggered.
  await page.waitForTimeout(5000);

  // Assert that no translation has occurred. This will depend on the implementation,
  // but we can check that no subtitle overlay has been added to the page.
  const subtitleOverlay = await page.$('#yt-ai-subtitle-container');
  expect(subtitleOverlay).toBeNull();
});
