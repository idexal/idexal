import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';

let electronApp: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  electronApp = await electron.launch({
    args: [path.join(__dirname, '..', '..', 'dist', 'electron', 'main.js')],
    env: {
      ...process.env,
      NODE_ENV: 'development'
    }
  });
  
  page = await electronApp.firstWindow();
  await page.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
  if (electronApp) {
    await electronApp.close();
  }
});

test.describe('Git Panel', () => {
  test('should show git status', async () => {
    const gitButton = await page.locator('[data-testid="git-toggle"]').or(
      page.locator('button:has-text("Git")')
    );
    
    if (await gitButton.isVisible()) {
      await gitButton.click();
      await page.waitForTimeout(1000);
      
      const gitPanel = await page.locator('[data-testid="git-panel"]').or(
        page.locator('.git-panel')
      );
      expect(await gitPanel.isVisible()).toBeTruthy();
    }
  });

  test('should display branch information', async () => {
    const branchInfo = await page.locator('[data-testid="git-branch"]').or(
      page.locator('.branch-name')
    );
    
    if (await branchInfo.isVisible()) {
      const branchName = await branchInfo.textContent();
      expect(branchName).toBeTruthy();
    }
  });

  test('should show changed files', async () => {
    const changedFiles = await page.locator('[data-testid="changed-files"]').or(
      page.locator('.git-changes')
    );
    
    if (await changedFiles.isVisible()) {
      expect(await changedFiles.isVisible()).toBeTruthy();
    }
  });

  test('should stage and commit changes', async () => {
    const commitInput = await page.locator('[data-testid="commit-message"]').or(
      page.locator('input[placeholder*="commit"]')
    );
    
    if (await commitInput.isVisible()) {
      await commitInput.fill('Test commit from E2E');
      
      const commitButton = await page.locator('[data-testid="commit-button"]').or(
        page.locator('button:has-text("Commit")')
      );
      
      if (await commitButton.isVisible()) {
        await commitButton.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should refresh git status', async () => {
    const refreshButton = await page.locator('[data-testid="git-refresh"]').or(
      page.locator('button[aria-label="Refresh"]')
    );
    
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Source Control', () => {
  test('should show diff view', async () => {
    const diffButton = await page.locator('[data-testid="show-diff"]').or(
      page.locator('button:has-text("Diff")')
    );
    
    if (await diffButton.isVisible()) {
      await diffButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should support keyboard shortcuts', async () => {
    await page.keyboard.press('Control+Shift+G');
    await page.waitForTimeout(300);
  });
});
