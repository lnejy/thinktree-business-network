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
    await page.getByRole('main').getByRole('heading', { name: '수신 명함', exact: true }).waitFor();
    for (const card of saved) {
      const item = page.getByRole('button', { name: `명함 상세: ${card.sourceFileName}`, exact: true });
      await item.scrollIntoViewIfNeeded();
      await item.locator('img').evaluate(image => image.decode());
    }
    assert.equal(await page.getByText('전체 OCR 보고서', { exact: false }).count(), 0);
    await page.getByRole('main').evaluate(main => main.scrollTo(0, 0));
    const results = path.join(__dirname, 'test-results');
    fs.mkdirSync(results, { recursive: true });
    await page.screenshot({ path: path.join(results, 'saved-ocr-list.png'), fullPage: true });
    await page.getByRole('button', { name: `명함 상세: ${saved[0].sourceFileName}`, exact: true }).click();
    await page.getByRole('button', { name: '명함 원본 확대', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: '명함 원본 사진 확대', exact: true });
    await dialog.waitFor();
    await page.waitForFunction(() => { const image = document.querySelector('dialog[open] img'); return image && image.complete && image.naturalWidth > 0; });
    assert.equal(await dialog.locator('img').getAttribute('src'), saved[0].originalUrl);
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    await page.screenshot({ path: path.join(results, 'saved-ocr-detail.png'), fullPage: true });
    await page.getByRole('button', { name: '명함 검토', exact: true }).click();
    await page.getByRole('button', { name: '명함 원본 확대', exact: true }).waitFor();
    await page.getByRole('heading', { name: '명함 정보 확인', exact: true }).waitFor();
    assert.equal(await page.getByText(/모델별 결과|문자 정확도|최초 구조화 JSON/).count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: 20 saved cards, real thumbnails, click-through detail, original zoom and Escape, review, and no diagnostic content in the UI.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
