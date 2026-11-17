// Run with: node test-flow.cjs (local API and UI must be running).
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { baseUrl, login, teamAccess } = require('./test-login.cjs');

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
    await login(page);
    const fixtureResponse = await page.request.post(`${baseUrl}/api/samples/sample1`);
    assert.equal(fixtureResponse.status(), 201);
    const fixture = await fixtureResponse.json();
    await page.getByRole('button', { name: /^Incoming Cards/ }).first().click();
    const fixtureRow = page.getByRole('listitem').filter({ has: page.getByRole('button', { name: `명함 상세: ${fixture.extracted.name.value}`, exact: true }) });
    await fixtureRow.first().getByRole('button', { name: '검토', exact: true }).click();
    await page.getByRole('main').getByRole('heading', { name: '명함 검토', exact: true }).waitFor();
    await page.getByLabel('전체 항목 보기').check();
    await page.screenshot({ path: 'test-results/review-desktop.png', fullPage: true });
    await page.getByRole('button', { name: '명함 확정 저장' }).click();
    await page.getByRole('alert').filter({ hasText: '회사명과 이름' }).waitFor();
    await page.getByLabel(/^회사명/).fill(companyName);
    await page.getByLabel(/^이름/).fill(`Sample ${runId}`);
    await page.getByLabel('홈페이지', { exact: true }).fill(website);
    await page.getByLabel('주소', { exact: true }).fill('');
    await page.getByLabel('본사·지점').fill('서울 본사');
    await page.getByLabel('부서', { exact: true }).fill('영업부');
    await page.getByLabel('팀', { exact: true }).fill('개발 1팀');
    await page.getByRole('button', { name: '임시 저장' }).click();
    const row = page.getByRole('listitem').filter({ hasText: companyName });
    await row.getByRole('button', { name: '검토', exact: true }).click();
    await page.getByLabel('전체 항목 보기').check();
    assert.equal(await page.getByLabel('본사·지점').inputValue(), '서울 본사');
    await page.getByRole('button', { name: '명함 확정 저장' }).click();
    await page.getByRole('main').getByRole('heading', { name: 'Card Detail', exact: true }).waitFor();
    await page.getByRole('combobox', { name: '명함을 함께 받은 팀원' }).selectOption('e2');
    await page.getByRole('button', { name: '추가', exact: true }).click();
    await page.getByRole('main').getByText('고범창', { exact: true }).waitFor();
    const teammate = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await login(teammate, 'beomchang');
    await teammate.getByRole('button', { name: 'My Cards', exact: true }).click();
    await teammate.getByRole('main').getByText(companyName, { exact: true }).filter({ visible: true }).first().waitFor();
    await teammate.getByRole('button', { name: 'Business Network', exact: true }).click();
    for (const { name } of teamAccess().accounts) {
      await teammate.locator('.network-node-employee').filter({ hasText: name }).waitFor();
    }
    await teammate.locator('.network-node-contact').filter({ hasText: companyName }).click();
    await teammate.getByText('고범창', { exact: true }).last().waitFor();
    await teammate.getByRole('button', { name: '계정 메뉴', exact: true }).click();
    await teammate.getByRole('button', { name: '로그아웃', exact: true }).click();
    await teammate.getByRole('heading', { name: 'ThinkTree 로그인' }).waitFor();
    assert.equal((await teammate.request.get(`${baseUrl}/api/cards`)).status(), 401);
    await teammate.getByRole('button', { name: '처음이신가요? 회원가입' }).click();
    await teammate.getByLabel('이름', { exact: true }).fill('테스트 팀원');
    await teammate.getByLabel('아이디', { exact: true }).fill(`team-test-${runId}`);
    await teammate.getByLabel(/^비밀번호/).fill(`test-password-${runId}`);
    await teammate.getByLabel('회사 초대 코드').fill(teamAccess().inviteCode);
    await teammate.getByRole('button', { name: '계정 만들기' }).click();
    await teammate.getByText('테스트 팀원', { exact: true }).waitFor();
    await teammate.close();
    await page.getByRole('button', { name: 'View org chart', exact: false }).click();
    await page.getByRole('button', { name: 'Organization Chart', exact: true }).click();
    await page.getByText('서울 본사', { exact: true }).waitFor();
    await page.getByText('개발 1팀', { exact: true }).waitFor();
    await page.screenshot({ path: 'test-results/organization-desktop.png', fullPage: true });
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.getByPlaceholder('Search companies, contacts, employees, cards…').fill(companyName);
    await page.getByText(companyName, { exact: true }).first().waitFor();
    await page.reload();
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.getByPlaceholder('Search companies, contacts, employees, cards…').fill(companyName);
    await page.getByText(companyName, { exact: true }).first().waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Add Card', exact: true }).click();
    await page.getByRole('heading', { name: '명함 등록', exact: true }).waitFor();
    await page.screenshot({ path: 'test-results/upload-mobile.png', fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await page.setViewportSize({ width: 1440, height: 1000 });
    assert.equal(await page.getByText('인식 설정 및 샘플', { exact: true }).count(), 0);
    const picture = fs.readFileSync(require('node:path').join(__dirname, '../backend/demo/sample2.png'));
    const files = [`batch-${runId}-1.png`, `batch-${runId}-2.png`];
    await page.getByLabel('명함 이미지 파일', { exact: true }).setInputFiles(
      files.map(name => ({ name, mimeType: 'image/png', buffer: picture })));
    for (const [index, file] of files.entries()) {
      await page.getByRole('button', { name: new RegExp(`${file}.*확인 필요`) }).waitFor({ timeout: 180000 });
      await page.getByRole('button', { name: new RegExp(file) }).click();
      await page.getByLabel(/^회사명/).fill(companyName);
      await page.getByLabel(/^이름/).fill(`Batch ${runId} ${index + 1}`);
      await page.getByLabel('전체 항목 보기').check();
      assert.ok((await page.getByLabel('이메일', { exact: true }).inputValue()).includes('@'));
      await page.getByLabel('홈페이지', { exact: true }).fill(website);
    }
    await page.screenshot({ path: 'test-results/live-ocr-desktop.png', fullPage: true });
    await page.getByRole('button', { name: '저장 가능한 명함 2장 저장', exact: true }).click();
    await page.getByText('2장 등록 · 2장 저장 완료', { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: sample, validation, draft, confirm, tree, search, reload, mobile, multi-file automatic OCR and inline batch save, zero browser errors');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
