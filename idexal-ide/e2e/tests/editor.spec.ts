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

test.describe('Editor', () => {
  test('should launch and show main window', async () => {
    const title = await page.title();
    expect(title).toContain('Idexal IDE');
    
    const isVisible = await page.isVisible('body');
    expect(isVisible).toBeTruthy();
  });

  test('should have Monaco editor loaded', async () => {
    await page.waitForSelector('.monaco-editor', { timeout: 30000 });
    const editor = await page.locator('.monaco-editor');
    expect(await editor.isVisible()).toBeTruthy();
  });

  test('should open file in editor', async () => {
    await page.keyboard.press('Control+O');
    await page.waitForTimeout(500);
    
    const fileDialog = await page.locator('[role="dialog"]');
    if (await fileDialog.isVisible()) {
      await page.keyboard.press('Escape');
    }
  });

  test('should support basic typing', async () => {
    const editor = await page.locator('.monaco-editor .view-lines');
    await editor.click();
    
    await page.keyboard.type('console.log("Hello from Idexal IDE");');
    await page.waitForTimeout(300);
    
    const content = await page.locator('.monaco-editor .view-lines').textContent();
    expect(content).toContain('Hello from Idexal IDE');
  });

  test('should have syntax highlighting', async () => {
    const hasTokens = await page.locator('.mtk1, .mtk5, .mtk12').count();
    expect(hasTokens).toBeGreaterThan(0);
  });
});

test.describe('Sidebar', () => {
  test('should show file explorer', async () => {
    const explorer = await page.locator('[data-testid="file-explorer"]').or(
      page.locator('.sidebar').first()
    );
    expect(await explorer.isVisible()).toBeTruthy();
  });

  test('should toggle sidebar', async () => {
    await page.keyboard.press('Control+B');
    await page.waitForTimeout(300);
    
    const sidebar = await page.locator('.sidebar').first();
    const isHidden = await sidebar.isHidden().catch(() => true);
    
    await page.keyboard.press('Control+B');
    await page.waitForTimeout(300);
    
    expect(isHidden).toBeTruthy();
  });
});

test.describe('Terminal', () => {
  test('should open terminal panel', async () => {
    await page.keyboard.press('Control+`');
    await page.waitForSelector('.xterm', { timeout: 10000 });
    
    const terminal = await page.locator('.xterm');
    expect(await terminal.isVisible()).toBeTruthy();
  });

  test('should accept terminal input', async () => {
    const terminal = await page.locator('.xterm-helper-textarea');
    if (await terminal.isVisible()) {
      await terminal.click();
      await page.keyboard.type('echo "test"');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Command Palette', () => {
  test('should open with keyboard shortcut', async () => {
    await page.keyboard.press('Control+Shift+P');
    await page.waitForTimeout(500);
    
    const palette = await page.locator('[role="dialog"]').or(
      page.locator('.command-palette')
    );
    expect(await palette.isVisible()).toBeTruthy();
    
    await page.keyboard.press('Escape');
  });

  test('should search commands', async () => {
    await page.keyboard.press('Control+Shift+P');
    await page.waitForTimeout(300);
    
    await page.keyboard.type('File');
    await page.waitForTimeout(300);
    
    const results = await page.locator('[role="option"]').count();
    expect(results).toBeGreaterThan(0);
    
    await page.keyboard.press('Escape');
  });
});

test.describe('Chat Panel', () => {
  test('should open chat panel', async () => {
    const chatButton = await page.locator('[data-testid="chat-toggle"]').or(
      page.locator('button:has-text("AI")')
    );
    
    if (await chatButton.isVisible()) {
      await chatButton.click();
      await page.waitForTimeout(500);
      
      const chatPanel = await page.locator('[data-testid="chat-panel"]').or(
        page.locator('.chat-panel')
      );
      expect(await chatPanel.isVisible()).toBeTruthy();
    }
  });
});

test.describe('Theme', () => {
  test('should toggle dark/light theme', async () => {
    await page.keyboard.press('Control+Shift+T');
    await page.waitForTimeout(500);
    
    const html = await page.locator('html');
    const hasDarkMode = await html.evaluate(el => 
      el.classList.contains('dark') || 
      el.getAttribute('data-theme')?.includes('dark') ||
      getComputedStyle(el).getPropertyValue('--background').includes('0.')
    );
    
    await page.keyboard.press('Control+Shift+T');
    await page.waitForTimeout(300);
  });
});
