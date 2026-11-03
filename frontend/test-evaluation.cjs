const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const saved = (await (await page.request.get('http://127.0.0.1:8000/api/cards')).json()).filter(c => c.source === 'evaluation');
    assert.equal(saved.length, 20);
    await page.goto('http://localhost:8443');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByRole('button', { name: /^Incoming Cards/ }).first().click();
    await page.getByLabel('명함 자료 구분').selectOption('evaluation');
    await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 20);
    await page.waitForFunction(() => [...document.querySelectorAll('tbody img')].every(image => image.complete && image.naturalWidth > 0));
    const results = path.join(__dirname, 'test-results');
    fs.mkdirSync(results, { recursive: true });
    await page.screenshot({ path: path.join(results, 'saved-ocr-list.png'), fullPage: true });
    await page.getByRole('button', { name: `명함 상세: ${saved[0].sourceFileName}`, exact: true }).click();
    await page.getByRole('heading', { name: 'OCR 인식·테스트 결과', exact: true }).waitFor();
    await page.getByRole('heading', { name: 'OCR 테스트 지표', exact: true }).waitFor();
    await page.getByRole('button', { name: '명함 원본 확대', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: '명함 원본 사진 확대', exact: true });
    await dialog.waitFor();
    await page.waitForFunction(() => { const image = document.querySelector('dialog[open] img'); return image && image.complete && image.naturalWidth > 0; });
    assert.equal(await dialog.locator('img').getAttribute('src'), saved[0].originalUrl);
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    await page.getByText('OCR 인식 영역 이미지 보기', { exact: true }).click();
    await page.getByAltText('OCR 인식 영역 표시', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(results, 'saved-ocr-detail.png'), fullPage: true });
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('heading', { name: 'OCR 테스트 지표', exact: true }).waitFor();
    await page.getByRole('button', { name: '명함 원본 확대', exact: true }).waitFor();
    const report = await page.request.get('http://localhost:8443/api/evaluation/report');
    assert.equal(report.status(), 200);
    assert.ok(report.headers()['content-type'].includes('text/html'));
    assert.deepEqual(errors, []);
    console.log('PASS: 20 saved cards, real thumbnails, click-through detail, original zoom and Escape, OCR text and metrics, visualization, review and full report.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
