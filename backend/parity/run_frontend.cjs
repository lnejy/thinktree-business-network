// 사용: node run_frontend.cjs <cards.json> <out.json>   (frontend 폴더에서 실행: src/data.ts, src/cardApi.ts 와 typescript 필요)
const ts = require('typescript'), fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const root = process.env.FRONTEND_DIR || process.cwd();
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'parity-'));
for (const name of ['data', 'cardApi']) {
  const js = ts.transpileModule(fs.readFileSync(path.join(root, 'src', `${name}.ts`), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText.replaceAll('require("./data")', 'require("./data.cjs")');
  fs.writeFileSync(path.join(dir, `${name}.cjs`), js);
}
const data = require(path.join(dir, 'data.cjs')), api = require(path.join(dir, 'cardApi.cjs'));
const cards = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
api.hydrateCards(cards);
const out = { cards: {}, trees: {}, history: {}, shared: {}, current: {}, asOfs: ['2024-06-30', '2025-06-30', '2026-01-01', '9999-12-31'] };
for (const c of cards) if (c.status === 'reviewed') out.cards[c.id] = { companyId: c.companyId, contactId: c.contactId, companyReasons: c.companyReasons, personReasons: c.personReasons };
const companyIds = [...new Set(Object.values(out.cards).map(c => c.companyId))];
const personIds = [...new Set(Object.values(out.cards).map(c => c.contactId))];
for (const id of companyIds) for (const asOf of out.asOfs) out.trees[`${id}|${asOf}`] = api.companyTree(id, asOf);
for (const id of personIds) {
  const h = api.personHistory(id);
  out.history[id] = h.map((c, i) => ({ id: c.id, changes: api.affiliationChanges(c, h[i + 1]).map(x => x.label) }));
  out.shared[id] = api.sharedAffiliations(id).map(s => [s.card.id, s.company, s.date]).sort();
}
for (const asOf of out.asOfs) out.current[asOf] = api.currentAffiliations(asOf).filter(c => out.cards[c.id]).map(c => [c.contactId, c.id]).sort();
out.companies = data.companies.filter(c => companyIds.includes(c.id)).map(c => ({ id: c.id, contactCount: c.contactCount, cardCount: c.cardCount, departmentCount: c.departmentCount, connectedEmployeeCount: c.connectedEmployeeCount }));
fs.writeFileSync(process.argv[3], JSON.stringify(out));
fs.rmSync(dir, { recursive: true, force: true });
