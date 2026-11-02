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
    const c = structuredClone(data.incomingCards[0]);
    Object.assign(c, { id, status: 'reviewed', ownerId: 'e1', uploadedAt: `2026-11-02T00:00:0${id}Z` });
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
  api.hydrateCards([]);
  assert.equal(data.companies.length, originalCount);
  console.log('PASS: identity evidence, domain conflicts, free mail isolation, parent-scoped teams, full department paths, contacts, network, idempotent refresh');
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
