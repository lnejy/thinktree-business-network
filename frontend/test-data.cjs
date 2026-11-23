const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thinktree-data-'));
try {
  for (const name of ['data', 'cardApi']) {
    const source = fs.readFileSync(path.join(__dirname, 'src', `${name}.ts`), 'utf8');
    const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText.replaceAll('require("./data")', 'require("./data.cjs")');
    fs.writeFileSync(path.join(dir, `${name}.cjs`), js);
  }
  const data = require(path.join(dir, 'data.cjs'));
  const api = require(path.join(dir, 'cardApi.cjs'));
  const originalCount = data.companies.length;
  function card(id, department, company = '테스트 회사', domain = 'example.test') {
    const keys = ['company', 'name', 'nameEn', 'branch', 'department', 'team', 'position',
      'phone', 'mobile', 'email', 'address', 'website', 'fax', 'postalCode', 'address2'];
    const c = { extracted: Object.fromEntries(keys.map(key => [key, { value: '', confidence: 'high' }])) };
    Object.assign(c, { id, status: 'reviewed', ownerId: 'e1', uploadedAt: `2026-11-02T00:00:${id.padStart(2, '0')}Z` });
    for (const field of Object.values(c.extracted)) field.value = '';
    const fields = { company, name: `담당자${id}`, email: `person${id}@${domain}`, branch: '서울 본사', department, team: '개발 1팀' };
    for (const [key, value] of Object.entries(fields)) c.extracted[key].value = value;
    return c;
  }
  const a = card('1', '영업부');
  const b = card('2', '기획부');
  api.hydrateCards([a, b]);
  assert.equal(data.companies.length, originalCount + 1);
  assert.equal(a.companyId, b.companyId);
  let tree = api.companyTree(a.companyId);
  const branch = tree.children[0];
  assert.equal(branch.children.length, 2);
  assert.notEqual(branch.children[0].children[0].id, branch.children[1].children[0].id);
  assert.equal(data.contacts.filter(c => c.companyId === a.companyId).length, 2);
  api.hydrateCards([a, b]);
  assert.equal(data.companies.length, originalCount + 1, 'polling must not duplicate companies');
  assert.equal(data.networkConnections.filter(n => n.contactId === a.contactId).length, 1);
  const c = card('3', '영업부', '별도 회사', 'example.test');
  api.hydrateCards([a, b, c]);
  assert.notEqual(a.companyId, c.companyId, 'domain alone is insufficient');
  const d = card('4', '영업부', '테스트 회사', 'different.test');
  api.hydrateCards([a, d]);
  assert.notEqual(a.companyId, d.companyId, 'conflicting domains must not merge');
  const e = card('5', '영업부', '테스트 회사', 'gmail.com');
  const f = card('6', '영업부', '별도 회사', 'gmail.com');
  api.hydrateCards([e, f]);
  assert.notEqual(e.companyId, f.companyId, 'free email domain must not merge companies');
  a.departmentPath = ['영업부', '지역본부', '개발 1팀'];
  a.extracted.team.value = '지역본부 / 개발 1팀';
  api.hydrateCards([a]);
  tree = api.companyTree(a.companyId);
  assert.equal(tree.children[0].children[0].children[0].name, '지역본부');
  const old = card('7', '개발팀', 'A 연구소', 'a.test');
  const recent = card('8', '연구팀', 'B 연구소', 'b.test');
  const peer = card('9', '개발팀', 'A 연구소', 'a.test');
  const namesake = card('10', '개발팀', 'A 연구소', 'a.test');
  old.extracted.name.value = recent.extracted.name.value = namesake.extracted.name.value = '김가람';
  old.extracted.mobile.value = '010-1234-5678';
  recent.extracted.mobile.value = '+82 10 1234 5678';
  old.effectiveDate = '2024-01-01';
  recent.effectiveDate = '2026-01-01';
  peer.effectiveDate = '2025-01-01';
  namesake.effectiveDate = '2025-01-01';
  api.hydrateCards([recent, old, peer, namesake]);
  assert.equal(recent.contactId, old.contactId, 'mobile and name survive a transfer');
  assert.notEqual(old.contactId, namesake.contactId, 'namesakes need additional evidence');
  assert.equal(api.personHistory(old.contactId)[0].id, recent.id);
  assert.equal(api.currentAffiliations('2025-12-31').find(item => item.contactId === old.contactId).id, old.id);
  assert.equal(api.currentAffiliations('2026-01-01').find(item => item.contactId === old.contactId).id, recent.id);
  assert.ok(api.sharedAffiliations(old.contactId).some(item => item.card.id === peer.id && item.date === '2025-01-01'));
  assert.ok(api.affiliationChanges(recent, old).some(change => change.label === '회사명'));
  const alias = card('11', '개발팀', 'A 연구소 주식회사', 'a.test');
  const sharedMailbox = structuredClone(old);
  sharedMailbox.extracted.mobile.value = '';
  sharedMailbox.extracted.email.value = 'sales@a.test';
  const sharedMailboxPeer = structuredClone(sharedMailbox);
  const truthPairs = [
    [old, recent, 'person', true], [old, namesake, 'person', false],
    [sharedMailbox, sharedMailboxPeer, 'person', false], [old, alias, 'company', true],
    [a, b, 'company', true], [a, c, 'company', false], [a, d, 'company', false],
    [e, f, 'company', false], [old, peer, 'company', true], [old, recent, 'company', false],
  ];
  const matches = truthPairs.filter(([left, right, kind, expected]) => api.matchEvidence(left, right, kind).strong === expected).length;
  assert.equal(matches, truthPairs.length, 'automatic linking must match labeled scenarios');
  console.log(`Labeled identity scenarios: ${matches}/${truthPairs.length} automatic-link decisions correct`);
  old.personLink = 'separate';
  api.hydrateCards([recent, old, peer, namesake]);
  assert.notEqual(recent.contactId, old.contactId, 'separated reference does not attract automatic links');
  const shared = card('12', '영업부');
  shared.ownerIds = ['e1', 'e3'];
  const pending = card('13', '검토부');
  pending.status = 'ready_for_review';
  api.hydrateCards([shared, pending]);
  assert.deepEqual(data.incomingCards.map(item => item.id), [pending.id]);
  assert.deepEqual(data.confirmedCards.map(item => item.id), [shared.id]);
  assert.equal(data.companies.length, 1);
  assert.equal(data.companies[0].cardCount, 1);
  assert.equal(data.companies[0].contactCount, 1);
  assert.equal(data.companies[0].connectedEmployeeCount, 2);
  assert.deepEqual(data.contacts[0].ownerIds, ['e1', 'e3']);
  assert.equal(data.networkConnections.length, 2);
  assert.equal(api.companyTree(shared.companyId).children[0].children[0].children[0].children[0].name, shared.extracted.name.value);
  pending.status = 'reviewed';
  api.hydrateCards([shared, pending]);
  assert.equal(data.incomingCards.length, 0);
  assert.equal(data.confirmedCards.length, 2);
  assert.equal(data.companies[0].cardCount, 2);
  assert.equal(data.contacts.length, 2);
  assert.equal(api.companyTree(shared.companyId).children[0].children.length, 2);
  api.hydrateCards([pending]);
  assert.equal(data.contacts.length, 1, 'removed records disappear from all derived views');
  assert.equal(data.networkConnections.length, 1);
  api.hydrateCards([]);
  assert.equal(data.companies.length, originalCount);
  console.log('PASS: identity evidence, domain conflicts, free mail isolation, parent-scoped teams, full department paths, contacts, network, idempotent refresh');
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
