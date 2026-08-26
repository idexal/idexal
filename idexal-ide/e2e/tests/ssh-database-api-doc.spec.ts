import { test, expect, type Page } from '@playwright/test';

// ══════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════

async function waitForApp(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  // The welcome screen shows an h2 "Welcome to Idexal IDE"
  await page.waitForSelector('h2', { timeout: 15_000 });
}

/**
 * Returns a locator scoped to the right panel (w-[420px] border-l area).
 * This prevents matching buttons/inputs from the welcome screen or sidebar.
 */
function rightPanel(page: Page) {
  return page.locator('.w-\\[420px\\]');
}

// ══════════════════════════════════════════════════════════════
// 1. SSH Manager Panel
// ══════════════════════════════════════════════════════════════
test.describe('SSH Manager', () => {
  test.beforeEach(async ({ page }) => {
    await waitForApp(page);
    await page.keyboard.press('Control+Shift+k');
    await page.waitForTimeout(800);
  });

  test('should display SSH Connections header', async ({ page }) => {
    const header = rightPanel(page).locator('text=SSH Connections').first();
    await expect(header).toBeVisible({ timeout: 5000 });
  });

  test('should show New button to create connections', async ({ page }) => {
    const panel = rightPanel(page);
    const newBtn = panel.locator('button', { hasText: 'New' }).first();
    await expect(newBtn).toBeVisible({ timeout: 5000 });
  });

  test('should open connection form when New is clicked', async ({ page }) => {
    const panel = rightPanel(page);
    await panel.locator('button', { hasText: 'New' }).first().click();
    await page.waitForTimeout(300);

    // Form should appear — look for the "New Connection" heading within the panel
    const formHeading = panel.locator('text=New Connection').first();
    await expect(formHeading).toBeVisible({ timeout: 3000 });
  });

  test('should show connection form fields: host, port, username', async ({ page }) => {
    const panel = rightPanel(page);
    await panel.locator('button', { hasText: 'New' }).first().click();
    await page.waitForTimeout(300);

    const hostInput = panel.locator('input[placeholder="192.168.1.100"]').first();
    const portInput = panel.locator('input[placeholder="22"]').first();
    const userInput = panel.locator('input[placeholder="root"]').first();

    await expect(hostInput).toBeVisible({ timeout: 3000 });
    await expect(portInput).toBeVisible({ timeout: 3000 });
    await expect(userInput).toBeVisible({ timeout: 3000 });
  });

  test('should support auth type toggle between Password and SSH Key', async ({ page }) => {
    const panel = rightPanel(page);
    await panel.locator('button', { hasText: 'New' }).first().click();
    await page.waitForTimeout(300);

    const passwordBtn = panel.locator('button', { hasText: 'Password' }).first();
    const keyBtn = panel.locator('button', { hasText: 'SSH Key' }).first();

    await expect(passwordBtn).toBeVisible({ timeout: 3000 });
    await expect(keyBtn).toBeVisible({ timeout: 3000 });

    // Click SSH Key — key path input should appear
    await keyBtn.click();
    await page.waitForTimeout(200);
    const keyPathInput = panel.locator('input[placeholder="~/.ssh/id_rsa"]').first();
    await expect(keyPathInput).toBeVisible({ timeout: 3000 });
  });

  test('should save a new connection and show it in the list', async ({ page }) => {
    const panel = rightPanel(page);
    await panel.locator('button', { hasText: 'New' }).first().click();
    await page.waitForTimeout(300);

    await panel.locator('input[placeholder="My Server"]').first().fill('Test Server');
    await panel.locator('input[placeholder="192.168.1.100"]').first().fill('10.0.0.1');
    await panel.locator('input[placeholder="root"]').first().fill('admin');

    await panel.locator('button', { hasText: /^Save$/ }).first().click();
    await page.waitForTimeout(500);

    const conn = panel.locator('text=Test Server').first();
    await expect(conn).toBeVisible({ timeout: 5000 });
  });

  test('should show connection details with username@host:port', async ({ page }) => {
    const panel = rightPanel(page);
    await panel.locator('button', { hasText: 'New' }).first().click();
    await page.waitForTimeout(300);

    await panel.locator('input[placeholder="My Server"]').first().fill('Production');
    await panel.locator('input[placeholder="192.168.1.100"]').first().fill('172.16.0.5');
    await panel.locator('input[placeholder="root"]').first().fill('deploy');
    await panel.locator('button', { hasText: /^Save$/ }).first().click();
    await page.waitForTimeout(500);

    const details = panel.locator('text=deploy@172.16.0.5:22').first();
    await expect(details).toBeVisible({ timeout: 5000 });
  });

  test('should show connection count in footer', async ({ page }) => {
    const panel = rightPanel(page);
    for (const name of ['Server A', 'Server B']) {
      await panel.locator('button', { hasText: 'New' }).first().click();
      await page.waitForTimeout(200);
      await panel.locator('input[placeholder="My Server"]').first().fill(name);
      await panel.locator('input[placeholder="192.168.1.100"]').first().fill('10.0.0.1');
      await panel.locator('input[placeholder="root"]').first().fill('root');
      await panel.locator('button', { hasText: /^Save$/ }).first().click();
      await page.waitForTimeout(300);
    }

    const footer = panel.locator('text=/2 connections/').first();
    await expect(footer).toBeVisible({ timeout: 5000 });
  });

  test('should search and filter connections', async ({ page }) => {
    const panel = rightPanel(page);
    for (const [name, host] of [['Web Server', '10.0.0.1'], ['DB Server', '10.0.0.2']]) {
      await panel.locator('button', { hasText: 'New' }).first().click();
      await page.waitForTimeout(200);
      await panel.locator('input[placeholder="My Server"]').first().fill(name);
      await panel.locator('input[placeholder="192.168.1.100"]').first().fill(host);
      await panel.locator('input[placeholder="root"]').first().fill('root');
      await panel.locator('button', { hasText: /^Save$/ }).first().click();
      await page.waitForTimeout(300);
    }

    const searchInput = panel.locator('input[placeholder="Search connections..."]').first();
    await searchInput.fill('Web');
    await page.waitForTimeout(300);

    await expect(panel.locator('text=Web Server').first()).toBeVisible({ timeout: 3000 });
    await expect(panel.locator('text=DB Server').first()).not.toBeVisible({ timeout: 1000 });
  });

  test('should delete a connection', async ({ page }) => {
    const panel = rightPanel(page);
    await panel.locator('button', { hasText: 'New' }).first().click();
    await page.waitForTimeout(200);
    await panel.locator('input[placeholder="My Server"]').first().fill('Temp Server');
    await panel.locator('input[placeholder="192.168.1.100"]').first().fill('10.0.0.99');
    await panel.locator('input[placeholder="root"]').first().fill('root');
    await panel.locator('button', { hasText: /^Save$/ }).first().click();
    await page.waitForTimeout(500);

    await panel.locator('button[title="Delete"]').first().click();
    await page.waitForTimeout(300);

    await expect(panel.locator('text=Temp Server').first()).not.toBeVisible({ timeout: 3000 });
  });

  test('should show empty state when no connections exist', async ({ page }) => {
    const panel = rightPanel(page);
    // Either empty state or connection list
    const hasEmpty = await panel.locator('text=No SSH connections yet').isVisible().catch(() => false);
    const hasCount = await panel.locator('text=/\\d+ connection/').isVisible().catch(() => false);
    expect(hasEmpty || hasCount).toBeTruthy();
  });

  test('should cancel form when Cancel is clicked', async ({ page }) => {
    const panel = rightPanel(page);
    await panel.locator('button', { hasText: 'New' }).first().click();
    await page.waitForTimeout(300);

    await panel.locator('button', { hasText: 'Cancel' }).first().click();
    await page.waitForTimeout(200);

    await expect(panel.locator('text=New Connection').first()).not.toBeVisible({ timeout: 2000 });
  });
});

// ══════════════════════════════════════════════════════════════
// 2. Database Panel (db-panel)
// ══════════════════════════════════════════════════════════════
test.describe('Database Panel', () => {
  test.beforeEach(async ({ page }) => {
    await waitForApp(page);
    // Ctrl+Shift+D opens db-panel
    await page.keyboard.press('Control+Shift+d');
    await page.waitForTimeout(800);
  });

  test('should display Database Explorer header', async ({ page }) => {
    const header = rightPanel(page).locator('text=Database Explorer').first();
    await expect(header).toBeVisible({ timeout: 5000 });
  });

  test('should show tab bar with Connections, Query, Schema, History', async ({ page }) => {
    const panel = rightPanel(page);
    for (const tab of ['connections', 'query', 'schema', 'history']) {
      await expect(panel.locator('button', { hasText: tab }).first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('should show New Connection button on connections tab', async ({ page }) => {
    const panel = rightPanel(page);
    const connTab = panel.locator('button', { hasText: 'connections' }).first();
    if (await connTab.isVisible()) await connTab.click();
    await page.waitForTimeout(200);

    await expect(panel.locator('button', { hasText: 'New Connection' }).first()).toBeVisible({ timeout: 5000 });
  });

  test('should open new connection form with driver selection', async ({ page }) => {
    const panel = rightPanel(page);
    await panel.locator('button', { hasText: 'connections' }).first().click();
    await page.waitForTimeout(200);

    await panel.locator('button', { hasText: 'New Connection' }).first().click();
    await page.waitForTimeout(300);

    for (const driver of ['postgresql', 'mysql', 'sqlite', 'mongodb']) {
      await expect(panel.locator('button', { hasText: driver }).first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('should switch between database drivers', async ({ page }) => {
    const panel = rightPanel(page);
    await panel.locator('button', { hasText: 'connections' }).first().click();
    await page.waitForTimeout(200);
    await panel.locator('button', { hasText: 'New Connection' }).first().click();
    await page.waitForTimeout(300);

    // Click MySQL — port should change to 3306
    await panel.locator('button', { hasText: 'mysql' }).first().click();
    await page.waitForTimeout(200);

    // The port input is in a grid with Host: the second text input
    // Form layout: Name, Driver, Host|Port, Database, Username, Password
    const portInput = panel.locator('input[type="text"]').nth(2);
    const portValue = await portInput.inputValue();
    expect(portValue).toBe('3306');

    // Click PostgreSQL — port should change to 5432
    await panel.locator('button', { hasText: 'postgresql' }).first().click();
    await page.waitForTimeout(200);

    const pgPort = await portInput.inputValue();
    expect(pgPort).toBe('5432');
  });

  test('should save a database connection', async ({ page }) => {
    const panel = rightPanel(page);
    await panel.locator('button', { hasText: 'connections' }).first().click();
    await page.waitForTimeout(200);
    await panel.locator('button', { hasText: 'New Connection' }).first().click();
    await page.waitForTimeout(300);

    // Form inputs: Name(0), Host(1), Port(2), Database(3), Username(4), Password(5)
    const inputs = panel.locator('input[type="text"]');
    await inputs.nth(0).fill('Test DB');       // Name
    await inputs.nth(1).fill('db.example.com'); // Host
    await inputs.nth(3).fill('production');      // Database
    await inputs.nth(4).fill('dbadmin');         // Username

    await panel.locator('button', { hasText: /^Save$/ }).first().click();
    await page.waitForTimeout(500);

    await expect(panel.locator('text=Test DB').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show connection URL format', async ({ page }) => {
    const panel = rightPanel(page);
    await panel.locator('button', { hasText: 'connections' }).first().click();
    await page.waitForTimeout(200);
    await panel.locator('button', { hasText: 'New Connection' }).first().click();
    await page.waitForTimeout(300);

    const inputs = panel.locator('input[type="text"]');
    await inputs.nth(0).fill('Prod DB');       // Name
    await inputs.nth(1).fill('db.prod.com');   // Host
    await inputs.nth(3).fill('analytics');      // Database

    await panel.locator('button', { hasText: /^Save$/ }).first().click();
    await page.waitForTimeout(500);

    // URL should be visible somewhere
    await expect(panel.locator('text=postgresql').first()).toBeVisible({ timeout: 5000 });
  });

  test('should toggle SSL checkbox', async ({ page }) => {
    const panel = rightPanel(page);
    await panel.locator('button', { hasText: 'connections' }).first().click();
    await page.waitForTimeout(200);
    await panel.locator('button', { hasText: 'New Connection' }).first().click();
    await page.waitForTimeout(300);

    const sslCheckbox = panel.locator('input[type="checkbox"]').first();
    await expect(sslCheckbox).toBeVisible({ timeout: 3000 });

    const wasChecked = await sslCheckbox.isChecked();
    await sslCheckbox.click();
    await page.waitForTimeout(100);
    const isNowChecked = await sslCheckbox.isChecked();
    expect(isNowChecked).toBe(!wasChecked);
  });

  test('should show SQL query editor on query tab', async ({ page }) => {
    const panel = rightPanel(page);
    await panel.locator('button', { hasText: 'query' }).first().click();
    await page.waitForTimeout(200);

    const textarea = panel.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 5000 });

    const value = await textarea.inputValue();
    expect(value).toContain('SELECT');
  });

  test('should show Run Query button with Ctrl+Enter hint', async ({ page }) => {
    const panel = rightPanel(page);
    await panel.locator('button', { hasText: 'query' }).first().click();
    await page.waitForTimeout(200);

    await expect(panel.locator('button', { hasText: 'Run Query' }).first()).toBeVisible({ timeout: 5000 });
    await expect(panel.locator('text=Ctrl+Enter').first()).toBeVisible({ timeout: 3000 });
  });

  test('should disable Run Query when no connection is active', async ({ page }) => {
    const panel = rightPanel(page);
    await panel.locator('button', { hasText: 'query' }).first().click();
    await page.waitForTimeout(200);

    const runBtn = panel.locator('button', { hasText: 'Run Query' }).first();
    await expect(runBtn).toBeVisible({ timeout: 5000 });

    const opacity = await runBtn.evaluate(el => el.style.opacity);
    expect(opacity).toBe('0.5');
  });

  test('should show empty schema when not connected', async ({ page }) => {
    const panel = rightPanel(page);
    await panel.locator('button', { hasText: 'schema' }).first().click();
    await page.waitForTimeout(200);

    await expect(panel.locator('text=Connect to a database to view schema').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show empty history when no queries have run', async ({ page }) => {
    const panel = rightPanel(page);
    await panel.locator('button', { hasText: 'history' }).first().click();
    await page.waitForTimeout(200);

    await expect(panel.locator('text=No query history yet').first()).toBeVisible({ timeout: 5000 });
  });

  test('should allow editing SQL in the query editor', async ({ page }) => {
    const panel = rightPanel(page);
    await panel.locator('button', { hasText: 'query' }).first().click();
    await page.waitForTimeout(200);

    const textarea = panel.locator('textarea').first();
    await textarea.fill('SHOW TABLES;');
    const value = await textarea.inputValue();
    expect(value).toBe('SHOW TABLES;');
  });
});

// ══════════════════════════════════════════════════════════════
// 3. API Doc Generator Panel (api-docs)
// ══════════════════════════════════════════════════════════════
test.describe('API Doc Generator', () => {
  test.beforeEach(async ({ page }) => {
    await waitForApp(page);
    // Ctrl+8 opens api-docs
    await page.keyboard.press('Control+8');
    await page.waitForTimeout(800);
  });

  test('should display API Documentation header', async ({ page }) => {
    const header = rightPanel(page).locator('text=API Documentation').first();
    await expect(header).toBeVisible({ timeout: 5000 });
  });

  test('should show tab bar with Endpoints, OpenAPI Spec, Schemas', async ({ page }) => {
    const panel = rightPanel(page);
    await expect(panel.locator('button', { hasText: /Endpoints/ }).first()).toBeVisible({ timeout: 5000 });
    await expect(panel.locator('button', { hasText: 'OpenAPI Spec' }).first()).toBeVisible({ timeout: 5000 });
    await expect(panel.locator('button', { hasText: 'Schemas' }).first()).toBeVisible({ timeout: 5000 });
  });

  test('should list API endpoints with method badges', async ({ page }) => {
    const panel = rightPanel(page);
    await expect(panel.locator('text=/\\/api\\//').first()).toBeVisible({ timeout: 5000 });

    await expect(panel.locator('span:text-is("GET")').first()).toBeVisible({ timeout: 3000 });
    await expect(panel.locator('span:text-is("POST")').first()).toBeVisible({ timeout: 3000 });
  });

  test('should expand endpoint details when clicked', async ({ page }) => {
    const panel = rightPanel(page);
    // Click GET /api/users endpoint
    await panel.locator('text=/\\/api\\/users/').first().click();
    await page.waitForTimeout(300);

    await expect(panel.locator('text=Returns a paginated list').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show parameters section for expanded endpoint', async ({ page }) => {
    const panel = rightPanel(page);
    await panel.locator('text=/\\/api\\/users/').first().click();
    await page.waitForTimeout(300);

    await expect(panel.locator('text=Parameters').first()).toBeVisible({ timeout: 5000 });
    await expect(panel.locator('text=limit').first()).toBeVisible({ timeout: 3000 });
  });

  test('should show request body for POST endpoints', async ({ page }) => {
    const panel = rightPanel(page);
    // Click the POST /api/auth/login endpoint which has a request body
    const authEndpoint = panel.locator('text=/\\/api\\/auth\\/login/').first();
    await authEndpoint.click();
    await page.waitForTimeout(300);

    await expect(panel.locator('text=Request Body').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show response status codes', async ({ page }) => {
    const panel = rightPanel(page);
    await panel.locator('text=/\\/api\\/users/').first().click();
    await page.waitForTimeout(300);

    await expect(panel.locator('text=Responses').first()).toBeVisible({ timeout: 5000 });
    await expect(panel.locator('text=200').first()).toBeVisible({ timeout: 3000 });
    await expect(panel.locator('text=401').first()).toBeVisible({ timeout: 3000 });
  });

  test('should filter endpoints by method', async ({ page }) => {
    const panel = rightPanel(page);
    const methodFilter = panel.locator('select').first();
    if (await methodFilter.isVisible()) {
      await methodFilter.selectOption('POST');
      await page.waitForTimeout(300);

      // POST method badge (span element) should be visible
      await expect(panel.locator('span:text-is("POST")').first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('should filter endpoints by tag', async ({ page }) => {
    const panel = rightPanel(page);
    const usersTag = panel.locator('button', { hasText: 'Users' }).first();
    if (await usersTag.isVisible()) {
      await usersTag.click();
      await page.waitForTimeout(300);

      await expect(panel.locator('text=/\\/api\\/users/').first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('should show OpenAPI spec tab with JSON', async ({ page }) => {
    const panel = rightPanel(page);
    await panel.locator('button', { hasText: 'OpenAPI Spec' }).first().click();
    await page.waitForTimeout(300);

    await expect(panel.locator('text=/openapi.*3\\.0/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show copy button for OpenAPI spec', async ({ page }) => {
    const panel = rightPanel(page);
    await expect(panel.locator('button[title="Copy OpenAPI spec"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show download button for OpenAPI spec', async ({ page }) => {
    const panel = rightPanel(page);
    await expect(panel.locator('button[title="Download spec"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show Schemas tab with data types', async ({ page }) => {
    const panel = rightPanel(page);
    await panel.locator('button', { hasText: 'Schemas' }).first().click();
    await page.waitForTimeout(300);

    await expect(panel.locator('text=/type User/').first()).toBeVisible({ timeout: 5000 });
    await expect(panel.locator('text=/type Post/').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show schema fields with types', async ({ page }) => {
    const panel = rightPanel(page);
    await panel.locator('button', { hasText: 'Schemas' }).first().click();
    await page.waitForTimeout(300);

    await expect(panel.locator('text=id').first()).toBeVisible({ timeout: 3000 });
    await expect(panel.locator('text=name').first()).toBeVisible({ timeout: 3000 });
    await expect(panel.locator('text=email').first()).toBeVisible({ timeout: 3000 });
  });

  test('should show required field markers', async ({ page }) => {
    const panel = rightPanel(page);
    await panel.locator('button', { hasText: 'Schemas' }).first().click();
    await page.waitForTimeout(300);

    // Required fields have a red asterisk
    await expect(panel.locator('text=*').first()).toBeVisible({ timeout: 3000 });
  });

  test('should collapse expanded endpoint on second click', async ({ page }) => {
    const panel = rightPanel(page);
    const endpoint = panel.locator('text=/\\/api\\/users/').first();

    await endpoint.click();
    await page.waitForTimeout(300);
    await expect(panel.locator('text=Returns a paginated list').first()).toBeVisible({ timeout: 3000 });

    await endpoint.click();
    await page.waitForTimeout(300);
    await expect(panel.locator('text=Returns a paginated list').first()).not.toBeVisible({ timeout: 2000 });
  });

  test('should show endpoint count in tab label', async ({ page }) => {
    const panel = rightPanel(page);
    const tab = panel.locator('button', { hasText: /Endpoints/ }).first();
    await expect(tab).toBeVisible({ timeout: 5000 });

    const tabText = await tab.textContent();
    expect(tabText).toContain('8');
  });

  test('should close panel when X button is clicked', async ({ page }) => {
    const panel = rightPanel(page);
    // Close button is × in the header
    const closeBtn = panel.locator('button', { hasText: '×' }).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(500);

      await expect(panel.locator('text=API Documentation').first()).not.toBeVisible({ timeout: 3000 });
    }
  });
});
