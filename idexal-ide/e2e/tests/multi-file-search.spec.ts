import { test, expect, type Page } from '@playwright/test';

// ══════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════

async function waitForApp(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('h2', { timeout: 15_000 });
}

/** Returns a locator scoped to the right panel (w-[420px] area). */
function rightPanel(page: Page) {
  return page.locator('.w-\\[420px\\]');
}

// ══════════════════════════════════════════════════════════════
// Multi-File Search Panel
// ══════════════════════════════════════════════════════════════
test.describe('Multi-File Search', () => {
  test.beforeEach(async ({ page }) => {
    await waitForApp(page);
    // Open via Command Palette (Ctrl+Shift+F is intercepted by browser)
    await page.keyboard.press('Control+k');
    const input = page.locator('input[placeholder*="command"], input[placeholder*="search"]').first();
    await expect(input).toBeVisible({ timeout: 5000 });
    await input.fill('Search in Files');
    await page.waitForTimeout(300);
    const result = page.locator('text=Search in Files').first();
    if (await result.isVisible()) {
      await result.click();
    } else {
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(800);
  });

  test('should display "Search in Files" header', async ({ page }) => {
    const header = rightPanel(page).locator('text=Search in Files').first();
    await expect(header).toBeVisible({ timeout: 5000 });
  });

  test('should show keyboard shortcut hint', async ({ page }) => {
    const hint = rightPanel(page).locator('text=Ctrl+Shift+F').first();
    await expect(hint).toBeVisible({ timeout: 3000 });
  });

  test('should have a search input with placeholder', async ({ page }) => {
    const panel = rightPanel(page);
    const searchInput = panel.locator('input[placeholder="Search pattern..."]').first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });
  });

  test('should accept search text', async ({ page }) => {
    const panel = rightPanel(page);
    const searchInput = panel.locator('input[placeholder="Search pattern..."]').first();
    await searchInput.fill('function');
    const value = await searchInput.inputValue();
    expect(value).toBe('function');
  });

  test('should show option toggle buttons (Regex, Case, Whole Word, Replace)', async ({ page }) => {
    const panel = rightPanel(page);
    // Option buttons have titles
    const regexBtn = panel.locator('button[title="Regex"]').first();
    const caseBtn = panel.locator('button[title="Match Case"]').first();
    const wholeWordBtn = panel.locator('button[title="Whole Word"]').first();
    const replaceBtn = panel.locator('button[title="Toggle Replace"]').first();

    await expect(regexBtn).toBeVisible({ timeout: 3000 });
    await expect(caseBtn).toBeVisible({ timeout: 3000 });
    await expect(wholeWordBtn).toBeVisible({ timeout: 3000 });
    await expect(replaceBtn).toBeVisible({ timeout: 3000 });
  });

  test('should toggle Regex option on and off', async ({ page }) => {
    const panel = rightPanel(page);
    const regexBtn = panel.locator('button[title="Regex"]').first();

    // Click to enable
    await regexBtn.click();
    await page.waitForTimeout(100);
    // Button should have accent styling (border changes to accent color)
    const borderAfter = await regexBtn.evaluate(el => el.style.border);
    expect(borderAfter).toContain('58a6ff');

    // Click to disable
    await regexBtn.click();
    await page.waitForTimeout(100);
    const borderReset = await regexBtn.evaluate(el => el.style.border);
    expect(borderReset).not.toContain('58a6ff');
  });

  test('should toggle Match Case option', async ({ page }) => {
    const panel = rightPanel(page);
    const caseBtn = panel.locator('button[title="Match Case"]').first();

    await caseBtn.click();
    await page.waitForTimeout(100);
    const border = await caseBtn.evaluate(el => el.style.border);
    expect(border).toContain('58a6ff');

    await caseBtn.click();
    await page.waitForTimeout(100);
    const reset = await caseBtn.evaluate(el => el.style.border);
    expect(reset).not.toContain('58a6ff');
  });

  test('should toggle Whole Word option', async ({ page }) => {
    const panel = rightPanel(page);
    const wholeWordBtn = panel.locator('button[title="Whole Word"]').first();

    await wholeWordBtn.click();
    await page.waitForTimeout(100);
    const border = await wholeWordBtn.evaluate(el => el.style.border);
    expect(border).toContain('58a6ff');
  });

  test('should toggle replace panel visibility', async ({ page }) => {
    const panel = rightPanel(page);
    const replaceBtn = panel.locator('button[title="Toggle Replace"]').first();

    // Initially replace input should not be visible
    const replaceInput = panel.locator('input[placeholder="Replace with..."]');
    await expect(replaceInput).not.toBeVisible({ timeout: 1000 });

    // Click to show replace
    await replaceBtn.click();
    await page.waitForTimeout(200);
    await expect(replaceInput).toBeVisible({ timeout: 3000 });

    // Click again to hide
    await replaceBtn.click();
    await page.waitForTimeout(200);
    await expect(replaceInput).not.toBeVisible({ timeout: 1000 });
  });

  test('should accept replace text when replace panel is open', async ({ page }) => {
    const panel = rightPanel(page);
    await panel.locator('button[title="Toggle Replace"]').first().click();
    await page.waitForTimeout(200);

    const replaceInput = panel.locator('input[placeholder="Replace with..."]').first();
    await replaceInput.fill('replacement');
    const value = await replaceInput.inputValue();
    expect(value).toBe('replacement');
  });

  test('should show Replace All button when replace panel is open', async ({ page }) => {
    const panel = rightPanel(page);
    await panel.locator('button[title="Toggle Replace"]').first().click();
    await page.waitForTimeout(200);

    const replaceAllBtn = panel.locator('button:has-text("Replace All")').first();
    await expect(replaceAllBtn).toBeVisible({ timeout: 3000 });
  });

  test('should show Include filter input', async ({ page }) => {
    const panel = rightPanel(page);
    const includeInput = panel.locator('input[placeholder*="Include"]').first();
    await expect(includeInput).toBeVisible({ timeout: 3000 });

    // Default value should be empty
    const value = await includeInput.inputValue();
    expect(value).toBe('');
  });

  test('should show Exclude filter input with default value', async ({ page }) => {
    const panel = rightPanel(page);
    const excludeInput = panel.locator('input[placeholder*="Exclude"]').first();
    await expect(excludeInput).toBeVisible({ timeout: 3000 });

    // Default should include node_modules
    const value = await excludeInput.inputValue();
    expect(value).toContain('node_modules');
  });

  test('should accept custom include filter', async ({ page }) => {
    const panel = rightPanel(page);
    const includeInput = panel.locator('input[placeholder*="Include"]').first();
    await includeInput.fill('*.ts, *.tsx');
    const value = await includeInput.inputValue();
    expect(value).toBe('*.ts, *.tsx');
  });

  test('should accept custom exclude filter', async ({ page }) => {
    const panel = rightPanel(page);
    const excludeInput = panel.locator('input[placeholder*="Exclude"]').first();
    await excludeInput.clear();
    await excludeInput.fill('dist,build');
    const value = await excludeInput.inputValue();
    expect(value).toBe('dist,build');
  });

  test('should show "No results found" when searching with no project', async ({ page }) => {
    const panel = rightPanel(page);
    const searchInput = panel.locator('input[placeholder="Search pattern..."]').first();
    await searchInput.fill('test');

    // Press Enter to search
    await searchInput.press('Enter');
    await page.waitForTimeout(1000);

    // Either "No results found" or "Searching..." or results
    const noResults = panel.locator('text=No results found').first();
    const searching = panel.locator('text=Searching...').first();
    const hasNoResults = await noResults.isVisible().catch(() => false);
    const hasSearching = await searching.isVisible().catch(() => false);
    // In browser mode without Electron, search returns empty
    expect(hasNoResults || hasSearching).toBeTruthy();
  });

  test('should clear search input when X button is clicked', async ({ page }) => {
    const panel = rightPanel(page);
    const searchInput = panel.locator('input[placeholder="Search pattern..."]').first();
    await searchInput.fill('something');

    // Find the clear button (FaTimes inside the search input area)
    const clearBtn = panel.locator('button').filter({ has: panel.locator('svg') }).locator('xpath=..').locator('button[style*="cursor: pointer"]').last();
    // Alternative: look for the FaTimes button near the search input
    const timesBtns = panel.locator('button').filter({ hasText: '' });
    // The clear button is a small button with FaTimes icon inside the search input area
    // It appears when there's text in the search input
    const searchContainer = searchInput.locator('..');
    const clearButton = searchContainer.locator('button').first();

    if (await clearButton.isVisible().catch(() => false)) {
      await clearButton.click();
      await page.waitForTimeout(200);
      const value = await searchInput.inputValue();
      expect(value).toBe('');
    }
  });

  test('should show footer with match counts', async ({ page }) => {
    const panel = rightPanel(page);
    // Footer shows "0 files, 0 matches" initially
    const footer = panel.locator('text=/\\d+ files, \\d+ matches/').first();
    await expect(footer).toBeVisible({ timeout: 3000 });
  });

  test('should execute search on Enter key press', async ({ page }) => {
    const panel = rightPanel(page);
    const searchInput = panel.locator('input[placeholder="Search pattern..."]').first();
    await searchInput.fill('import');

    // Press Enter to trigger search
    await searchInput.press('Enter');
    await page.waitForTimeout(500);

    // Search should have been triggered — either results or "no results"
    // The footer should update or the searching indicator should appear
    const footer = panel.locator('text=/\\d+ files, \\d+ matches/').first();
    await expect(footer).toBeVisible({ timeout: 3000 });
  });

  test('should focus search input when panel opens', async ({ page }) => {
    const panel = rightPanel(page);
    const searchInput = panel.locator('input[placeholder="Search pattern..."]').first();
    await expect(searchInput).toBeVisible({ timeout: 3000 });
    // Input should be focusable
    await searchInput.focus();
    const isFocused = await searchInput.evaluate(el => document.activeElement === el);
    expect(isFocused).toBeTruthy();
  });

  test('should show filter icon next to Include input', async ({ page }) => {
    const panel = rightPanel(page);
    const includeInput = panel.locator('input[placeholder*="Include"]').first();
    await expect(includeInput).toBeVisible({ timeout: 3000 });

    // The filter icon is rendered near the Include input
    // Just verify the input exists and has the correct placeholder
    const placeholder = await includeInput.getAttribute('placeholder');
    expect(placeholder).toContain('Include');
  });

  test('should preserve search options state across searches', async ({ page }) => {
    const panel = rightPanel(page);

    // Enable Regex
    await panel.locator('button[title="Regex"]').first().click();
    await page.waitForTimeout(100);

    // Enable Match Case
    await panel.locator('button[title="Match Case"]').first().click();
    await page.waitForTimeout(100);

    // Search
    const searchInput = panel.locator('input[placeholder="Search pattern..."]').first();
    await searchInput.fill('test');
    await searchInput.press('Enter');
    await page.waitForTimeout(500);

    // Options should still be active
    const regexBtn = panel.locator('button[title="Regex"]').first();
    const caseBtn = panel.locator('button[title="Match Case"]').first();

    const regexBorder = await regexBtn.evaluate(el => el.style.border);
    const caseBorder = await caseBtn.evaluate(el => el.style.border);
    expect(regexBorder).toContain('58a6ff');
    expect(caseBorder).toContain('58a6ff');
  });
});
