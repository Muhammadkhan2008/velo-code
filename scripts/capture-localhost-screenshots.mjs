import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const OUTPUT_DIR = path.resolve('screenshots ide');

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

function pickBrowserPath() {
  for (const candidate of CHROME_PATHS) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error('No Chrome/Edge executable found for screenshot automation.');
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function safeClick(locator) {
  if ((await locator.count()) > 0) {
    await locator.first().click();
    return true;
  }
  return false;
}

async function screenshot(page, fileName) {
  const target = path.join(OUTPUT_DIR, fileName);
  await page.screenshot({ path: target, fullPage: true });
  console.log(`saved ${fileName}`);
}

async function ensureProjectOpen(page, projectName) {
  if (projectName) {
    const byName = page.getByText(projectName, { exact: true });
    if ((await byName.count()) > 0) {
      await byName.first().click();
    }
  }

  const filterInput = page.locator('input[placeholder="Filter files..."]');
  if ((await filterInput.count()) === 0) {
    const projectCards = page.locator('div.cursor-pointer:has-text("Last edited:")');
    if ((await projectCards.count()) > 0) {
      await projectCards.first().click();
    }
  }

  await page.locator('input[placeholder="Filter files..."]').first().waitFor({ timeout: 15000 });
}

async function runDesktopFlow(browser, project) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  await screenshot(page, '01-home-hero.png');

  await ensureProjectOpen(page, project?.name);
  await page.waitForTimeout(700);
  await screenshot(page, '02-workspace-file-explorer.png');

  if (project?.id) {
    const filesRes = await page.request.get(`${BASE_URL}/api/projects/${project.id}/files`);
    if (filesRes.ok()) {
      const files = await filesRes.json();
      if (Array.isArray(files) && files.length > 1) {
        const secondPath = files[1]?.path;
        if (secondPath) {
          const fileLabel = page.getByText(new RegExp(`^${escapeRegex(secondPath)}$`));
          if ((await fileLabel.count()) > 0) {
            await fileLabel.first().click();
            await page.waitForTimeout(500);
          }
        }
      }
    }
  }
  await screenshot(page, '03-editor-multi-tab.png');

  await page.locator('button[title="Command Palette"]').first().click();
  await page.locator('input[placeholder="Type a command or file name..."]').first().waitFor({ timeout: 10000 });
  await screenshot(page, '04-command-palette.png');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  await page.getByRole('button', { name: 'Run', exact: true }).first().click();
  await page.getByText('Run Active File', { exact: true }).waitFor({ timeout: 10000 });
  await screenshot(page, '05-run-browser-runners.png');
  await page.mouse.click(20, 20);
  await page.waitForTimeout(300);

  const runButton = page.locator('header button').filter({ hasText: /RUN|PREVIEW|EDIT/ });
  if ((await runButton.count()) > 0) {
    await runButton.last().click();
    await page.waitForTimeout(1600);
  }
  await screenshot(page, '06-run-server-runtime.png');

  const shellTab = page.getByRole('button', { name: 'Shell', exact: true });
  if ((await shellTab.count()) > 0) {
    await shellTab.first().click();
    await page.waitForTimeout(500);
  }
  await screenshot(page, '07-terminal-panel.png');

  const aiButton = page.locator('button[title="AI Assistant"]');
  if ((await aiButton.count()) > 0) {
    await aiButton.first().click();
    await page.getByText('AI Assistant', { exact: true }).first().waitFor({ timeout: 10000 });
  }
  await screenshot(page, '08-ai-assistant-agent.png');

  const aiClose = page.locator('div.absolute.inset-y-0.right-0 button');
  if ((await aiClose.count()) > 1) {
    await aiClose.nth(1).click();
    await page.waitForTimeout(300);
  }

  await page.locator('button[title="Extensions"]').first().click();
  await page.getByText('Extensions', { exact: true }).first().waitFor({ timeout: 10000 });
  await screenshot(page, '09-extension-marketplace.png');
  await page.mouse.click(10, 10);
  await page.waitForTimeout(400);

  await context.close();
}

async function runMobileFlow(browser, project) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);

  if (project?.name) {
    const byName = page.getByText(project.name, { exact: true });
    if ((await byName.count()) > 0) {
      await byName.first().click();
    }
  }

  const filterInput = page.locator('input[placeholder="Filter files..."]');
  if ((await filterInput.count()) === 0) {
    const projectCards = page.locator('div.cursor-pointer:has-text("Last edited:")');
    if ((await projectCards.count()) > 0) {
      await projectCards.first().click();
    }
  }

  const headerButtons = page.locator('header .h-12 button');
  await headerButtons.first().waitFor({ timeout: 15000 });

  await headerButtons.first().click();
  await page.waitForTimeout(500);
  await screenshot(page, '10-mobile-navigation.png');

  await page.mouse.click(380, 80);
  await page.waitForTimeout(400);

  await safeClick(page.getByText('Set', { exact: true }));
  await page.getByText('Settings', { exact: true }).first().waitFor({ timeout: 10000 });
  await screenshot(page, '11-settings-panel.png');
  await page.mouse.click(8, 8);
  await page.waitForTimeout(500);

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.getByText('Welcome to VElo Code', { exact: true }).first().waitFor({ timeout: 10000 });
  await screenshot(page, '12-welcome-screen-pwa.png');

  await context.close();
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const executablePath = pickBrowserPath();
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ['--disable-gpu'],
  });

  try {
    const bootstrapContext = await browser.newContext();
    const bootstrapPage = await bootstrapContext.newPage();
    const projectsRes = await bootstrapPage.request.get(`${BASE_URL}/api/projects`);
    const projects = projectsRes.ok() ? await projectsRes.json() : [];
    await bootstrapContext.close();

    const project = Array.isArray(projects) && projects.length > 0 ? projects[0] : null;
    await runDesktopFlow(browser, project);
    await runMobileFlow(browser, project);
  } finally {
    await browser.close();
  }

  const files = fs.readdirSync(OUTPUT_DIR).filter(name => name.endsWith('.png')).sort();
  for (const name of files) {
    console.log(name);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
