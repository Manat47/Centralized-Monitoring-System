import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const webRoot = join(root, 'apps', 'web-dashboard');
const require = createRequire(join(webRoot, 'package.json'));
const { chromium } = require('playwright');
const baseUrl = (process.env.E2E_BASE_URL ?? 'http://localhost:3010').replace(/\/$/, '');
const reportPath = resolve(process.env.E2E_REPORT_PATH ?? join(root, 'reports', 'E2E_BUG_HUNT_REPORT.md'));
const evidenceDir = resolve(process.env.E2E_EVIDENCE_DIR ?? join(root, 'reports', 'e2e-bug-hunter-evidence'));

const checks = [];
const issues = [];
const pendingResponses = [];
let activeRoute = '/login';
let authenticated = false;
let activePage = null;
let alertsScan = null;

function redact(value) {
  return String(value ?? '')
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+/gi, 'Bearer [REDACTED]')
    .replace(/(["']?(?:password|secret|api[_-]?key|access[_-]?token|refresh[_-]?token)["']?\s*[:=]\s*)["']?[^\s,}"']+/gi, '$1[REDACTED]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .slice(0, 1000);
}

function safeUrl(input) {
  try {
    const url = new URL(input);
    const keys = [...url.searchParams.keys()];
    return `${url.origin}${url.pathname}${keys.length ? `?${keys.map((key) => `${key}=[REDACTED]`).join('&')}` : ''}`;
  } catch {
    return redact(input);
  }
}

function addIssue(severity, kind, summary, evidence = '', route = activeRoute) {
  const key = `${route}|${kind}|${summary}|${evidence}`;
  if (issues.some((item) => item.key === key)) return;
  issues.push({ key, severity, kind, route, summary, evidence: redact(evidence) });
}

function record(name, status, detail = '', route = activeRoute) {
  checks.push({ route, name, status, detail: redact(detail) });
}

async function step(name, action, severity = 'Major') {
  try {
    const result = await action();
    if (result?.skip) record(name, 'SKIP', result.skip);
    else record(name, 'PASS', result?.detail ?? '');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const detail = `${message}; current URL: ${activePage ? safeUrl(activePage.url()) : 'unknown'}`;
    const filename = `${activeRoute}-${name}`.replace(/[^a-z0-9-]+/gi, '-').slice(0, 100);
    await activePage?.screenshot({ path: join(evidenceDir, `${filename}-failed.png`), fullPage: true }).catch(() => undefined);
    record(name, 'FAIL', detail);
    addIssue(severity, 'Interaction', `${name} failed`, detail);
  }
}

function loadCredentials(contents) {
  const local = {};
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*(E2E_ADMIN_EMAIL|E2E_ADMIN_PASSWORD)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    local[match[1]] = value;
  }
  return {
    email: process.env.E2E_ADMIN_EMAIL ?? local.E2E_ADMIN_EMAIL,
    password: process.env.E2E_ADMIN_PASSWORD ?? local.E2E_ADMIN_PASSWORD,
  };
}

function markdownCell(value) {
  return redact(value).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

async function main() {
  const envContents = await readFile(join(webRoot, '.env.local'), 'utf8').catch(() => '');
  const credentials = loadCredentials(envContents);
  if (!credentials.email || !credentials.password) {
    throw new Error('Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD in the environment or apps/web-dashboard/.env.local');
  }

  await mkdir(evidenceDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.E2E_LOCAL_CORS_BYPASS === '1' ? { args: ['--disable-web-security'] } : {}),
    ...(process.env.E2E_BROWSER_EXECUTABLE
      ? { executablePath: process.env.E2E_BROWSER_EXECUTABLE }
      : { channel: process.env.E2E_BROWSER_CHANNEL ?? 'msedge' }),
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  activePage = page;
  page.setDefaultTimeout(10000);

  page.on('console', (message) => {
    if (message.type() !== 'error' && message.type() !== 'warning') return;
    const text = redact(message.text());
    if (!authenticated && /401\s*\(Unauthorized\)/i.test(text)) return;
    const hydration = /hydration|did not match|server rendered html/i.test(text);
    addIssue(hydration ? 'Minor' : message.type() === 'error' ? 'Major' : 'Minor',
      `Console ${message.type()}`, hydration ? 'React hydration warning' : text.slice(0, 160), text);
  });
  page.on('pageerror', (error) => {
    addIssue('Critical', 'Uncaught exception', error.message, error.stack ?? error.message);
  });
  page.on('response', (response) => {
    const request = response.request();
    if (response.status() < 400 || !['xhr', 'fetch'].includes(request.resourceType())) return;
    const route = activeRoute;
    const expectedLoginProbe = !authenticated && response.status() === 401;
    const task = response.text().catch(() => '<body unavailable>').then((body) => {
      const url = safeUrl(response.url());
      const detail = `${request.method()} ${url} → ${response.status()}; body: ${redact(body)}`;
      if (expectedLoginProbe) {
        record('Pre-login session probe', 'EXPECTED', detail, route);
      } else {
        addIssue('Major', 'API response', `${request.method()} ${url} returned ${response.status()}`, detail, route);
      }
    });
    pendingResponses.push(task);
  });
  page.on('requestfailed', (request) => {
    if (!['xhr', 'fetch'].includes(request.resourceType())) return;
    const failure = request.failure()?.errorText ?? 'unknown network failure';
    if (/ERR_ABORTED/i.test(failure)) return;
    addIssue('Major', 'Network failure', `${request.method()} ${safeUrl(request.url())}`, failure);
  });

  async function visit(route, heading) {
    activeRoute = route;
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    if (new URL(page.url()).pathname === '/login') throw new Error(`Session redirected ${route} to /login`);
    await page.getByRole('heading', { name: heading }).first().waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);
    const text = await page.locator('body').innerText();
    if (/This page couldn't load|Application error:/i.test(text) || text.trim().length < 20) {
      addIssue('Critical', 'Page crash', `${route} showed an error boundary or blank screen`, text.slice(0, 300));
    }
    const filename = route.replace(/^\//, '').replace(/[^a-z0-9-]+/gi, '-') || 'root';
    await page.screenshot({ path: join(evidenceDir, `${filename}.png`), fullPage: true });
    record('Route renders', 'PASS', heading, route);
  }

  try {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.getByLabel('Work email').fill(credentials.email);
    await page.getByLabel('Password', { exact: true }).fill(credentials.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL((url) => url.pathname !== '/login', { timeout: 20000 });
    authenticated = true;
    record('Admin login', 'PASS', `Signed in at ${safeUrl(page.url())}`, '/login');

    await visit('/dashboard', /Dashboard/i);
    await step('Summary cards and host matrix render', async () => {
      await page.getByText('Monitored Servers (Hosts)', { exact: true }).waitFor();
      await page.getByText('Monitored Applications (Synthetic)', { exact: true }).waitFor();
      await page.getByText('Active Firing Alerts', { exact: true }).waitFor();
      await page.getByRole('heading', { name: /Top Issues|Infrastructure Status/ }).waitFor();
      return { detail: 'Server, application, and firing alert cards with host matrix visible' };
    }, 'Critical');
    await step('Needs Attention Inspect opens host drawer', async () => {
      const button = page.getByRole('button', { name: /^Inspect$/ }).first();
      if (!await button.count()) return { skip: 'No asset-backed firing alert in Top 5' };
      await button.click();
      await page.getByRole('dialog').waitFor({ state: 'visible' });
      await page.getByRole('tab', { name: /Telemetry|Health Checks/ }).first().waitFor();
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      return { detail: 'Drawer opened with telemetry tabs and closed with Esc' };
    });
    await step('Not Monitored summary card deep link', async () => {
      const link = page.getByRole('link', { name: 'View Not Monitored assets' });
      await link.click();
      await page.waitForURL((url) => url.pathname === '/infrastructure' && url.searchParams.get('overall') === 'NOT_MONITORED');
      await page.getByText('Dashboard status: NOT_MONITORED').waitFor();
      return { detail: 'Summary card navigated to filtered Infrastructure' };
    });

    await visit('/infrastructure', 'Hosts & Assets');
    await step('Asset table loads', async () => {
      await page.getByRole('table').waitFor();
      await page.getByText(/assets$/).first().waitFor();
      return { detail: `${await page.getByRole('table').getByRole('row').count() - 1} visible table rows` };
    });
    await step('First host Inspect opens and Esc closes drawer', async () => {
      const row = page.getByRole('table').getByRole('row').filter({ has: page.getByRole('button', { name: 'Inspect' }) }).first();
      if (!await row.count()) return { skip: 'No asset row available' };
      await row.getByRole('button', { name: 'Inspect' }).click();
      await page.waitForURL(/inspectHost=/, { timeout: 10000 });
      await page.getByRole('dialog').waitFor({ state: 'visible' });
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      return { detail: 'Drawer opened and closed' };
    });
    await visit('/infrastructure?overall=NOT_MONITORED', 'Hosts & Assets');
    await step('Not Monitored deep link and drawer', async () => {
      await page.getByText('Dashboard status: NOT_MONITORED').waitFor();
      await page.getByText('Loading infrastructure...').waitFor({ state: 'hidden', timeout: 30000 });
      const rows = page.getByRole('table').getByRole('row').filter({ has: page.getByRole('button', { name: 'Inspect' }) });
      const count = await rows.count();
      if (!count) return { skip: 'No Not Monitored asset in current data' };
      const failures = [];
      for (let index = 0; index < count; index += 1) {
        const row = rows.nth(index);
        const name = (await row.getByRole('cell').first().innerText()).split('\n')[0];
        await row.getByRole('button', { name: 'Inspect' }).click();
        await page.waitForURL(/inspectHost=/, { timeout: 3000 }).catch(() => undefined);
        if (!await page.getByRole('dialog').isVisible()) {
          failures.push(`${name}: no drawer; URL ${safeUrl(page.url())}`);
          continue;
        }
        await page.keyboard.press('Escape');
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
      }
      if (failures.length) throw new Error(failures.join('; '));
      return { detail: `Opened and closed ${count} Not Monitored host drawers` };
    });
    await step('Not Monitored row click opens drawer', async () => {
      const row = page.getByRole('table').getByRole('row').filter({ has: page.getByRole('button', { name: 'Inspect' }) }).first();
      if (!await row.count()) return { skip: 'No filtered host row available' };
      await row.getByRole('cell').first().click();
      await page.waitForURL(/inspectHost=/, { timeout: 3000 }).catch(() => undefined);
      if (!await page.getByRole('dialog').isVisible()) throw new Error(`Row click did not open drawer; URL ${safeUrl(page.url())}`);
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      return { detail: 'Clicking filtered host row opened drawer' };
    });
    await step('Clear Not Monitored filter', async () => {
      await page.getByRole('button', { name: 'Clear', exact: true }).click();
      await page.waitForURL((url) => !url.searchParams.has('overall'), { timeout: 3000 });
      return { detail: 'Filter removed from URL' };
    });

    await visit('/metric-rules', 'Metric Rules');
    await step('Multi-tier table renders', async () => {
      const table = page.getByRole('table');
      if (!await table.count()) return { skip: 'No rules table in current empty state' };
      await table.getByRole('columnheader', { name: 'Condition' }).waitFor();
      const conditions = await table.getByRole('cell').filter({ hasText: /Warn:|Crit:/ }).count();
      return { detail: `${conditions} rows display tier conditions` };
    });
    await step('Create metric rule modal and Asset selector', async () => {
      await page.getByRole('button', { name: 'Create rule' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('heading', { name: 'Create metric rule' }).waitFor();
      const assetTrigger = dialog.getByRole('combobox').first();
      await assetTrigger.click();
      const options = page.getByRole('option');
      if (!await options.count()) {
        await page.keyboard.press('Escape');
        await page.keyboard.press('Escape');
        return { skip: 'Modal opens but no eligible monitored server is available' };
      }
      await options.first().click();
      await dialog.getByText('Warning tier').waitFor();
      await dialog.getByText('Critical tier').waitFor();
      await page.keyboard.press('Escape');
      return { detail: 'Asset selected; dual threshold inputs visible; form not submitted' };
    });

    await visit('/explorer', 'Log & Event Explorer');
    await step('Explorer search and Clear', async () => {
      const project = page.getByLabel('Project', { exact: true });
      if (!await project.inputValue()) {
        const values = await project.locator('option').evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
        if (!values.length) return { skip: 'No log project available' };
        await project.selectOption(values[0]);
      }
      const input = page.getByLabel('Search records');
      await input.fill('severity:ERROR');
      await page.getByRole('button', { name: 'Search', exact: true }).click();
      await page.getByRole('button', { name: 'Clear search' }).click();
      if (await input.inputValue() !== '') throw new Error('Search input did not clear');
      return { detail: 'Search submitted and cleared' };
    });
    await step('Explorer left facet toggles column', async () => {
      const facets = page.getByRole('complementary', { name: 'Available fields' });
      if (!await facets.count()) return { skip: 'No field facets panel in current project state' };
      const checkbox = facets.getByRole('checkbox', { name: /^Show .* column$/ }).first();
      if (!await checkbox.count()) return { skip: 'No selectable field in current data' };
      const before = await checkbox.isChecked();
      const name = await checkbox.getAttribute('aria-label');
      await checkbox.setChecked(!before);
      if (await checkbox.isChecked() === before) throw new Error('Facet checkbox did not change');
      await page.reload({ waitUntil: 'domcontentloaded' });
      const restored = page.getByRole('complementary', { name: 'Available fields' }).getByRole('checkbox', { name: name ?? undefined });
      await restored.waitFor();
      if (await restored.isChecked() === before) throw new Error('Facet selection did not persist after reload');
      await restored.setChecked(before);
      return { detail: 'Facet selection persisted after reload and was restored' };
    });

    await visit('/explorer/finding-rules', 'Log finding alerts');
    await step('Finding rules list and create modal', async () => {
      await page.getByRole('button', { name: 'Refresh', exact: true }).click();
      const create = page.getByRole('button', { name: 'Create rule', exact: true }).first();
      if (!await create.count()) return { skip: 'Create action hidden for current role' };
      await create.click();
      await page.getByRole('dialog').waitFor({ state: 'visible' });
      await page.keyboard.press('Escape');
      return { detail: 'Refresh and create modal respond; no rule created' };
    });

    await visit('/explorer/rules', /rules|findings/i);
    await step('Project findings refresh', async () => {
      await page.waitForURL(/projectId=/, { timeout: 20000 }).catch(() => undefined);
      const refresh = page.getByRole('button', { name: /Refresh Findings/i });
      if (!await refresh.count()) return { skip: 'Refresh Findings not available in current project state' };
      await refresh.click();
      return { detail: 'Refresh Findings button responded' };
    });

    await visit('/alerts', /Alerts/i);
    await step('Alerts table, full scan, and pagination', async () => {
      const table = page.getByRole('table');
      await table.waitFor();
      await table.getByRole('columnheader', { name: 'Status' }).waitFor();
      const next = page.getByRole('button', { name: 'Next', exact: true });
      const pagination = page.getByText(/^Page \d+ of \d+$/);
      const initial = await pagination.innerText();
      const totalPages = Number(initial.match(/of (\d+)/)?.[1] ?? 1);
      if (totalPages > 100) throw new Error(`Alert list has ${totalPages} pages; safety cap is 100`);
      const rows = [];
      for (let number = 1; number <= totalPages; number += 1) {
        await page.getByText(new RegExp(`^Page ${number} of \\d+$`)).waitFor();
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => undefined);
        const current = await table.locator('tbody tr').evaluateAll((elements) =>
          elements.map((row) => ({
            cells: [...row.querySelectorAll('td')].map((cell) => cell.innerText.trim()),
            href: row.querySelector('a[href^="/alerts/"]')?.getAttribute('href') ?? null,
          })).filter((row) => row.cells.length >= 7));
        for (const { cells, href } of current) {
          rows.push({ id: href?.split('/').at(-1) ?? null, severity: cells[0], asset: cells[1], signal: cells[2], actual: cells[3], status: cells[5], triggered: cells[6] });
        }
        if (number < totalPages) {
          await next.click();
        }
      }
      const statusCounts = Object.groupBy(rows, (row) => row.status);
      const duplicateTriggered = Object.entries(Object.groupBy(
        rows.filter((row) => /triggered/i.test(row.status)),
        (row) => `${row.asset} | ${row.signal} | ${row.actual}`,
      )).filter(([, entries]) => entries.length > 1)
        .map(([key, entries]) => ({ key, count: entries.length }))
        .sort((left, right) => right.count - left.count)
        .slice(0, 10);
      const missingContext = rows.filter((row) => /triggered/i.test(row.status) &&
        (!row.asset || !row.signal || !row.actual || row.actual === '—'));
      alertsScan = {
        pages: totalPages,
        rows: rows.length,
        uniqueIds: new Set(rows.map((row) => row.id).filter(Boolean)).size,
        statusCounts: Object.fromEntries(Object.entries(statusCounts).map(([status, entries]) => [status, entries.length])),
        duplicateTriggered,
        missingContext: missingContext.length,
      };
      await writeFile(join(evidenceDir, 'alerts-scan.json'), JSON.stringify(rows, null, 2), 'utf8');
      if (missingContext.length) {
        addIssue('Major', 'Data completeness', `${missingContext.length} triggered alerts have missing asset, signal, or actual result`, JSON.stringify(missingContext.slice(0, 3)));
      }
      if (totalPages > 1) {
        await page.getByRole('button', { name: 'Previous', exact: true }).click();
        await page.getByText(new RegExp(`^Page ${totalPages - 1} of \\d+$`)).waitFor();
      }
      return { detail: `Read ${rows.length} alerts across ${totalPages} pages; Previous navigation worked` };
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    addIssue('Critical', 'Crawl interrupted', 'Authentication or route navigation prevented the audit', detail);
    record('Crawl', 'FAIL', detail);
  } finally {
    await Promise.allSettled(pendingResponses);
    await browser.close();
  }

  const timestamp = new Date().toISOString();
  const grouped = Object.groupBy(issues, (item) => item.severity);
  const lines = [
    '# Bug & Stability Audit Report',
    '',
    `- Run: ${timestamp}`,
    `- Target: ${safeUrl(baseUrl)}`,
    `- Authenticated: ${authenticated ? 'yes' : 'no'}`,
    `- Checks: ${checks.filter((item) => item.status === 'PASS').length} passed, ${checks.filter((item) => item.status === 'FAIL').length} failed, ${checks.filter((item) => item.status === 'SKIP').length} skipped, ${checks.filter((item) => item.status === 'EXPECTED').length} expected auth probe`,
    '- Scope: read-only browser interactions; no create, acknowledge, delete, or migration action submitted.',
    ...(process.env.E2E_LOCAL_CORS_BYPASS === '1' ? ['- Test browser bypassed CORS because the local Gateway allows only port 3010; API requests and responses still reached the real Gateway.'] : []),
    '- Run again: `node scripts/e2e-bug-hunter.mjs` (credentials from environment or ignored `apps/web-dashboard/.env.local`).',
    '',
    '## สรุป',
    '',
    `- ${grouped.Critical?.length ? `พบ ${grouped.Critical.length} Critical` : 'ไม่พบ Page Crash หรือ Uncaught Exception'}; ${issues.some((item) => item.kind === 'API response') ? 'พบ API 4xx/5xx หลังล็อกอินตามตารางด้านล่าง' : 'ไม่พบ API 4xx/5xx หลังล็อกอิน'}.`,
    `- พบ ${(grouped.Major ?? []).length} Major และ ${(grouped.Minor ?? []).length} Minor จากการทดสอบจริง; ขั้นที่ FAIL แสดงในตาราง Coverage.`,
    '',
  ];
  for (const severity of ['Critical', 'Major', 'Minor']) {
    lines.push(`## ${severity}`, '');
    const entries = grouped[severity] ?? [];
    if (!entries.length) lines.push('No findings observed in this run.', '');
    else {
      lines.push('| URL / screen | Type | Finding | Evidence |', '|---|---|---|---|');
      for (const item of entries) lines.push(`| ${markdownCell(item.route)} | ${markdownCell(item.kind)} | ${markdownCell(item.summary)} | ${markdownCell(item.evidence)} |`);
      lines.push('');
    }
  }
  lines.push('## Coverage', '', '| Screen | Check | Result | Detail |', '|---|---|---|---|');
  for (const item of checks) lines.push(`| ${markdownCell(item.route)} | ${markdownCell(item.name)} | ${item.status} | ${markdownCell(item.detail)} |`);
  if (alertsScan) {
    lines.push('', '## Alert list scan', '', `Read ${alertsScan.rows} rows across ${alertsScan.pages} pages (${alertsScan.uniqueIds} distinct alert IDs). The full local snapshot is in \`e2e-bug-hunter-evidence/alerts-scan.json\`. Live pagination can shift as new alerts arrive.`, '');
    lines.push('| Status | Rows |', '|---|---:|');
    for (const [status, count] of Object.entries(alertsScan.statusCounts)) lines.push(`| ${markdownCell(status)} | ${count} |`);
    lines.push('', `Triggered rows missing asset, signal, or actual result: ${alertsScan.missingContext}.`);
    if (alertsScan.duplicateTriggered.length) {
      lines.push('', 'Repeated active alert labels for manual review (multiple targets or rules may legitimately share a label):', '', '| Asset / signal / actual | Rows |', '|---|---:|');
      for (const item of alertsScan.duplicateTriggered) lines.push(`| ${markdownCell(item.key)} | ${item.count} |`);
    }
    lines.push('');
  }
  lines.push('', `Screenshots: \`${evidenceDir}\``, '', 'Interpretation: skipped steps lacked matching data or controls; they are not counted as passed. API response bodies are truncated and sensitive values masked.', '');
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, lines.join('\n'), 'utf8');
  console.log(`Audit complete: ${checks.length} checks, ${issues.length} findings. Report: ${reportPath}`);
}

main().catch((error) => {
  console.error(`Bug hunter could not start: ${redact(error instanceof Error ? error.message : String(error))}`);
  process.exitCode = 1;
});
