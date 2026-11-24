// Product flows use browser-only fixtures so the team's saved cards stay intact.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { login, baseUrl } = require('./test-login.cjs');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(12000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await login(page);
    const actual = await (await page.request.get(`${baseUrl}/api/cards`)).json();
    const template = actual.find(card => card.status === 'reviewed');
    assert.ok(template, 'A saved card is required to construct the test fixtures');
    function fixture(id, company, date, name = '검증 담당자') {
      const card = structuredClone(template);
      Object.assign(card, { id, ownerId: 'e1', ownerIds: ['e1', 'e2'], status: 'reviewed',
        effectiveDate: date, uploadedAt: `${date}T00:00:00Z`, reviewedAt: `${date}T01:00:00Z`,
        personLink: null, companyLink: null, warnings: [] });
      for (const field of Object.values(card.extracted)) field.value = '';
      const values = { name, company, email: `${name === '검증 담당자' ? 'person' : 'other'}@example.test`,
        mobile: name === '검증 담당자' ? '01012345678' : '01022223333',
        department: '연구부', position: '책임', website: company === '검증 A회사' ? 'https://a.example.test' : 'https://b.example.test' };
      for (const [key, value] of Object.entries(values)) card.extracted[key].value = value;
      return card;
    }
    const old = fixture('product-old', '검증 A회사', '2025-01-01');
    const latest = fixture('product-latest', '검증 B회사', '2026-01-01');
    latest.ownerIds = ['e1', 'e3'];
    const colleague = fixture('product-colleague', '검증 A회사', '2026-01-01', '검증 동료');
    colleague.ownerId = 'e2'; colleague.ownerIds = ['e2'];
    const pending = fixture('product-pending', '검증 B회사', '2026-11-24');
    pending.status = 'ready_for_review';
    pending.extracted.position.value = '수석';
    pending.extracted.phone.value = '02-1234-5678 / 02-2222-3333';
    let fixtures = [old, latest, colleague, pending];
    let ownershipRequest;
    await page.route('**/api/cards', route => route.fulfill({ json: fixtures }));
    await page.route('**/api/cards/*/ownership', async route => {
      ownershipRequest = route.request().postDataJSON();
      const card = fixtures.find(item => route.request().url().includes(`/${item.id}/ownership`));
      Object.assign(card, { ownerId: ownershipRequest.ownerId, ownerIds: ownershipRequest.ownerIds });
      await route.fulfill({ json: card });
    });
    await page.reload();
    await page.getByRole('button', { name: '내 검토 대기 1', exact: true }).waitFor();
    await page.getByRole('button', { name: '내 검토 대기 1', exact: true }).click();
    assert.equal(await page.getByLabel('수신 명함 받은 사람').inputValue(), 'e1');
    await page.getByText('전화번호가 여러 개이거나 설명이 포함되어 있습니다', { exact: true }).waitFor();
    await page.getByRole('button', { name: '검토', exact: true }).click();
    await page.getByLabel('전체 항목 보기').check();
    await page.getByLabel('전화번호', { exact: true }).fill('02-1234-5678');
    const links = page.locator('details').filter({ has: page.locator('summary').filter({ hasText: /소속 날짜 및 연결 설정|기존 명함과 연결 확인/ }) }).first();
    if (await links.getAttribute('open') === null) await links.locator('summary').first().click();
    await page.getByRole('heading', { name: '기존 명함과 비교', exact: true }).waitFor();
    await page.getByRole('button', { name: '같은 사람 · 이력에 추가', exact: true }).click();
    assert.equal(await page.getByLabel('인물 연결', { exact: true }).inputValue(), latest.id);
    await page.getByRole('button', { name: '동명이인 · 별도 인물', exact: true }).click();
    assert.equal(await page.getByLabel('인물 연결', { exact: true }).inputValue(), 'separate');

    await page.getByRole('button', { name: 'Business Network', exact: true }).first().click();
    assert.equal(await page.locator('.network-company').count(), 2);
    await page.getByRole('button', { name: '함께 아는 사람', exact: true }).click();
    assert.equal(await page.locator('.network-company').count(), 1);
    await page.getByRole('button', { name: '필터 초기화', exact: true }).click();
    await page.getByLabel('네트워크 검색').fill('검증 담당자');
    await page.locator('.network-node-contact:visible').first().click();
    await page.getByRole('complementary', { name: '인물 상세' }).waitFor();
    await page.getByRole('button', { name: '인물 상세 닫기', exact: true }).click();
    await page.getByRole('button', { name: '필터 초기화', exact: true }).click();
    const group = page.locator('.network-company').filter({ has: page.locator('summary').filter({ hasText: '검증 A회사' }) });
    await group.locator('summary').click();
    await group.getByRole('button', { name: '회사 상세 보기', exact: true }).click();
    await page.getByRole('heading', { name: '현재 소속 · 1명', exact: true }).waitFor();
    await page.getByRole('heading', { name: '과거 소속 · 1명', exact: true }).waitFor();
    await page.getByRole('heading', { name: '우리 팀 연결 담당자', exact: true }).waitFor();
    await page.getByRole('button', { name: '이 회사의 네트워크 보기', exact: true }).click();
    assert.equal(await page.locator('.network-company').count(), 1);

    await page.getByRole('button', { name: '필터 초기화', exact: true }).click();
    await page.getByLabel('네트워크 검색').fill('검증 담당자');
    await page.locator('.network-node-contact:visible').first().click();
    await page.getByRole('button', { name: '명함 상세 보기', exact: true }).click();
    await page.getByRole('button', { name: '담당자·공동 수신자 관리', exact: true }).click();
    await page.getByLabel('주 담당자', { exact: true }).selectOption('e3');
    await page.getByRole('checkbox', { name: '원재연', exact: true }).uncheck();
    await page.getByRole('button', { name: '담당자 저장', exact: true }).click();
    await page.getByRole('button', { name: '담당자·공동 수신자 관리', exact: true }).waitFor();
    assert.equal(ownershipRequest.ownerId, 'e3');
    assert.deepEqual(ownershipRequest.ownerIds, ['e3']);
    assert.deepEqual(ownershipRequest.expectedOwnerIds, ['e1', 'e3']);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Business Network', exact: true }).click();
    await page.getByLabel('네트워크 검색').fill('검증 담당자');
    await page.locator('.network-node-contact:visible').first().click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    console.log('PASS product flows: dashboard, review reasons, comparison and namesakes, grouped network, company history, ownership and mobile.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
