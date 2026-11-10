// Run with: node test-flow.cjs (local API and UI must be running).
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  fs.mkdirSync('test-results', { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    const runId = Date.now();
    const companyName = `ThinkTree UI Test ${runId}`;
    const website = `https://test-${runId}.example.test`;
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://localhost:8443');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByRole('button', { name: 'Add Card', exact: true }).click();
    await page.getByText('인식 설정 및 샘플', { exact: true }).click();
    await page.getByRole('button', { name: '샘플 1 검토', exact: true }).click();
    await page.getByLabel('Company', { exact: false }).waitFor();
    await page.screenshot({ path: 'test-results/review-desktop.png', fullPage: true });
    await page.getByRole('button', { name: 'Confirm & Save' }).click();
    await page.getByRole('alert').filter({ hasText: '회사명과 이름' }).waitFor();
    await page.getByLabel('Company', { exact: false }).fill(companyName);
    await page.getByLabel('Name (Original)', { exact: false }).fill(`Sample ${runId}`);
    await page.getByLabel('Website', { exact: true }).fill(website);
    await page.getByLabel('Address', { exact: true }).fill('');
    await page.getByLabel('Branch / Office').fill('서울 본사');
    await page.getByLabel('Department', { exact: true }).fill('영업부');
    await page.getByLabel('Team', { exact: true }).fill('개발 1팀');
    await page.getByRole('button', { name: 'Save as Draft' }).click();
    const row = page.getByRole('row').filter({ hasText: companyName });
    await row.getByRole('button', { name: 'Review' }).click();
    assert.equal(await page.getByLabel('Branch / Office').inputValue(), '서울 본사');
    await page.getByRole('button', { name: 'Confirm & Save' }).click();
    await page.getByRole('main').getByRole('heading', { name: 'Card Detail', exact: true }).waitFor();
    await page.getByRole('button', { name: 'View org chart', exact: false }).click();
    await page.getByRole('button', { name: 'Organization Chart', exact: true }).click();
    await page.getByText('서울 본사', { exact: true }).waitFor();
    await page.getByText('개발 1팀', { exact: true }).waitFor();
    await page.screenshot({ path: 'test-results/organization-desktop.png', fullPage: true });
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.getByPlaceholder('Search companies, contacts, employees, cards…').fill(companyName);
    await page.getByText(companyName, { exact: true }).first().waitFor();
    await page.reload();
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.getByPlaceholder('Search companies, contacts, employees, cards…').fill(companyName);
    await page.getByText(companyName, { exact: true }).first().waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Add Card', exact: true }).click();
    await page.getByRole('heading', { name: '명함 등록', exact: true }).waitFor();
    await page.screenshot({ path: 'test-results/upload-mobile.png', fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByText('인식 설정 및 샘플', { exact: true }).click();
    await page.getByLabel('명함 언어').selectOption('ko');
    const picture = fs.readFileSync(require('node:path').join(__dirname, '../backend/demo/sample2.png'));
    await page.getByLabel('명함 이미지 파일', { exact: true }).setInputFiles(
      ['batch-1.png', 'batch-2.png'].map(name => ({ name, mimeType: 'image/png', buffer: picture })));
    for (const [index, file] of ['batch-1.png', 'batch-2.png'].entries()) {
      await page.getByRole('button', { name: new RegExp(`${file}.*확인 필요`) }).waitFor({ timeout: 180000 });
      await page.getByRole('button', { name: new RegExp(file) }).click();
      await page.getByLabel(/^회사명/).fill(companyName);
      await page.getByLabel(/^이름/).fill(`Batch ${runId} ${index + 1}`);
      await page.getByLabel('전체 항목 보기').check();
      assert.ok((await page.getByLabel('이메일', { exact: true }).inputValue()).includes('@'));
      await page.getByLabel('홈페이지', { exact: true }).fill(website);
    }
    await page.screenshot({ path: 'test-results/live-ocr-desktop.png', fullPage: true });
    await page.getByRole('button', { name: '확인한 명함 2장 저장', exact: true }).click();
    await page.getByText('2장 등록 · 2장 저장 완료', { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: sample, validation, draft, confirm, tree, search, reload, mobile, multi-file automatic OCR and inline batch save, zero browser errors');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
