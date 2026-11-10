import type { BusinessCard, OrgNode } from './data';
import { incomingCards, confirmedCards, companies, contacts, networkConnections } from './data';

export interface LiveCard extends BusinessCard {
  source?: string; engine?: string; model?: string; language?: string;
  ocrRawText?: string; warnings?: string[]; error?: string;
  structured?: Record<string, unknown>; departmentPath?: string[];
  sourceFileName?: string; originalUrl?: string; visualizationUrl?: string;
  effectiveDate?: string | null; personLink?: string | null; companyLink?: string | null;
  personReasons?: string[]; companyReasons?: string[];
  evaluation?: {
    lineCount: number; hasGroundTruth: boolean;
    coverage: number | null; accuracy: number | null; lineRecall: number | null;
    models: Array<{ model: string; confidence: number; textCount: number; selected: boolean }>;
    groundTruthDetails?: Array<{ ok: boolean; line: string; score: number }>;
  };
}
const originals = structuredClone({ incomingCards, confirmedCards, companies, contacts, networkConnections });
let current: LiveCard[] = [];
let revision = 0;
const listeners = new Set<() => void>();
export const subscribeCards = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const cardRevision = () => revision;
export const isLiveCard = (id: string) => current.some(c => c.id === id);
export const getLiveCard = (id: string) => current.find(card => card.id === id);
const normalize = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const companyName = (s: string) => normalize(s.replace(/주식회사|\(주\)|㈜|株式会社|\bco\.?\s*,?\s*ltd\.?\b|\binc\.?\b|\bllc\b/gi, ''));
const freeMail = new Set(['gmail.com', 'naver.com', 'daum.net', 'hanmail.net', 'outlook.com', 'yahoo.com', 'hotmail.com', 'icloud.com']);
function domain(card: BusinessCard) {
  const web = card.extracted.website.value.trim();
  try { if (web) return new URL(/^https?:\/\//i.test(web) ? web : `https://${web}`).hostname.replace(/^www\./, '').toLowerCase(); }
  catch { /* Invalid URL is not identity evidence. */ }
  const host = card.extracted.email.value.split('@')[1]?.toLowerCase() || '';
  return freeMail.has(host) ? '' : host;
}

export type LinkKind = 'person' | 'company';
const digits = (s: string) => s.replace(/\D/g, '').replace(/^82(?:0)?(?=10\d{8}$)/, '0');
const same = (a: string, b: string) => !!a && a === b;
const seoulDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' });

export function matchEvidence(card: LiveCard, other: LiveCard, kind: LinkKind) {
  const a = card.extracted;
  const b = other.extracted;
  const reasons: string[] = [];
  if (kind === 'company') {
    const names = (item: LiveCard) => {
      const primary = companyName(item.extracted.company.value);
      const raw = item.structured?.company as { name?: string; aliases?: string[] } | undefined;
      const aliases = [raw?.name || '', ...(raw?.aliases || [])].map(companyName);
      return aliases.includes(primary) ? aliases.filter(Boolean) : [primary].filter(Boolean);
    };
    const name = names(card).some(n => names(other).includes(n));
    const hostA = domain(card);
    const hostB = domain(other);
    const host = same(hostA, hostB);
    const address = same(normalize(a.address.value), normalize(b.address.value));
    const postal = same(normalize(a.postalCode.value), normalize(b.postalCode.value));
    const branch = same(normalize(a.branch.value), normalize(b.branch.value));
    const officePhone = (item: LiveCard) => digits((item.structured?.site as { tel?: string } | undefined)?.tel || '');
    const phone = officePhone(card).length >= 7 && same(officePhone(card), officePhone(other));
    if (name) reasons.push('정규화한 회사명 또는 별칭 일치');
    if (host) reasons.push('홈페이지 또는 업무 이메일 도메인 일치');
    if (address) reasons.push('주소 일치');
    if (phone) reasons.push('사업소 대표 전화번호 일치');
    if (reasons.length && postal) reasons.push('우편번호 일치');
    if (reasons.length && branch) reasons.push('본사·지점 표기 일치');
    if (hostA && hostB && hostA !== hostB) {
      if (reasons.length) reasons.push('업무 도메인이 서로 다름');
      return { reasons, strong: false };
    }
    return { reasons, strong: (name && (host || address || (phone && postal))) || (host && address) };
  }
  const name = same(normalize(a.name.value), normalize(b.name.value));
  const romanized = same(normalize(a.nameEn.value), normalize(b.nameEn.value));
  const emailA = a.email.value.trim().toLowerCase();
  const email = same(emailA, b.email.value.trim().toLowerCase()) && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailA) &&
    !/^(?:info|contact|sales|admin|office|support|hello|help|hr|reception|team)\+?[^@]*@/i.test(emailA);
  const mobileA = digits(a.mobile.value);
  const mobile = mobileA.length >= 9 && same(mobileA, digits(b.mobile.value));
  if (name) reasons.push('이름 일치');
  if (romanized) reasons.push('영문 이름 일치');
  if (email) reasons.push('개인 이메일 일치');
  if (mobile) reasons.push('휴대전화 일치');
  if (reasons.length && same(companyName(a.company.value), companyName(b.company.value))) reasons.push('회사명 일치');
  if (reasons.length && same(normalize(a.department.value), normalize(b.department.value))) reasons.push('부서명 일치');
  return { reasons, strong: (name || romanized) && (email || mobile) };
}

export function cardDate(card: LiveCard) {
  return card.effectiveDate || seoulDate.format(new Date(card.uploadedAt));
}
function newestFirst(a: LiveCard, b: LiveCard) {
  return cardDate(b).localeCompare(cardDate(a)) || Number(!!b.effectiveDate) - Number(!!a.effectiveDate) ||
    b.uploadedAt.localeCompare(a.uploadedAt) || b.id.localeCompare(a.id);
}
export function personHistory(personId?: string) {
  return personId ? confirmedCards.filter(card => card.contactId === personId).sort(newestFirst) as LiveCard[] : [];
}

const trackedFields: Partial<Record<keyof BusinessCard['extracted'], string>> = {
  company: '회사명', branch: '본사·지점', department: '부서', team: '팀', position: '직책',
  phone: '전화번호', mobile: '휴대전화', email: '이메일', address: '주소', postalCode: '우편번호',
};
export function affiliationChanges(card: LiveCard, earlier?: LiveCard) {
  if (!earlier) return [];
  return Object.entries(trackedFields).flatMap(([key, label]) => {
    const field = key as keyof BusinessCard['extracted'];
    const from = earlier.extracted[field].value;
    const to = card.extracted[field].value;
    return from === to ? [] : [{ label, from, to }];
  });
}

export function sharedAffiliations(personId: string) {
  const history = personHistory(personId);
  const peers: { card: LiveCard; company: string; date: string }[] = [];
  const seen = new Set<string>();
  for (const [index, card] of history.entries()) {
    const start = cardDate(card);
    const end = index ? cardDate(history[index - 1]) : '9999-12-31';
    if (start >= end) continue;
    const candidates = new Set(confirmedCards.filter(other => other.contactId && other.contactId !== personId && other.companyId === card.companyId).map(other => other.contactId!));
    for (const id of candidates) {
      const peerHistory = personHistory(id);
      const overlap = peerHistory.find((other, peerIndex) => {
        const peerStart = cardDate(other);
        const peerEnd = peerIndex ? cardDate(peerHistory[peerIndex - 1]) : '9999-12-31';
        return other.companyId === card.companyId && peerStart < peerEnd && peerStart < end && start < peerEnd;
      });
      const key = JSON.stringify([id, card.companyId]);
      if (overlap && !seen.has(key)) {
        seen.add(key);
        peers.push({ card: overlap, company: card.extracted.company.value, date: [start, cardDate(overlap)].sort()[1] });
      }
    }
  }
  return peers;
}

export function currentAffiliations(asOf = '9999-12-31') {
  const latest = new Map<string, LiveCard>();
  for (const card of [...confirmedCards].sort(newestFirst)) {
    if (card.contactId && cardDate(card) <= asOf && !latest.has(card.contactId)) latest.set(card.contactId, card);
  }
  return [...latest.values()];
}

export function linkCandidates(card: LiveCard, kind: LinkKind) {
  return current.filter(other => other.status === 'reviewed' && other.id !== card.id)
    .map(other => {
      const evidence = matchEvidence(card, other, kind);
      const separated = (kind === 'person' ? other.personLink : other.companyLink) === 'separate';
      return { card: other, reasons: evidence.reasons, strong: evidence.strong && !separated };
    })
    .sort((a, b) => Number(b.strong) - Number(a.strong) || b.reasons.length - a.reasons.length || newestFirst(a.card, b.card));
}

export function needsLinkChoice(card: LiveCard, kind: LinkKind, options: ReviewOptions, candidates = linkCandidates(card, kind)) {
  if (kind === 'person' ? options.personLink : options.companyLink) return false;
  const groups = new Set(candidates.filter(item => item.strong).map(item => kind === 'person' ? item.card.contactId : item.card.companyId));
  return groups.size > 1 || (groups.size === 0 && candidates.some(item => item.reasons.length));
}

function assignLinks(cards: LiveCard[], kind: LinkKind) {
  const idKey = kind === 'company' ? 'companyId' : 'contactId';
  const linkKey = kind === 'company' ? 'companyLink' : 'personLink';
  const reasonsKey = kind === 'company' ? 'companyReasons' : 'personReasons';
  const byId = new Map(cards.map(card => [card.id, card]));
  const assigned: LiveCard[] = [];
  for (const card of cards) delete card[idKey];
  function assign(card: LiveCard, path: Set<string>) {
    if (card[idKey] || path.has(card.id)) return;
    const choice = card[linkKey];
    const reference = choice && choice !== 'separate' ? byId.get(choice) : undefined;
    let match = reference;
    let reasons = choice === 'separate' ? ['사용자가 별도 등록'] : ['자동 연결에 충분한 근거가 없어 별도 등록'];
    if (reference) {
      assign(reference, new Set([...path, card.id]));
      reasons = ['사용자가 연결을 확정', ...matchEvidence(card, reference, kind).reasons];
    } else if (!choice) {
      const candidates = assigned.filter(other => other[linkKey] !== 'separate').map(other => ({ other, ...matchEvidence(card, other, kind) })).filter(c => c.strong);
      const groups = new Set(candidates.map(c => c.other[idKey]));
      if (groups.size === 1) {
        match = candidates[0].other;
        reasons = candidates[0].reasons;
      } else if (groups.size > 1) reasons = ['일치하는 대상이 여러 개여서 별도 등록'];
    }
    card[idKey] = match?.[idKey] || `${kind === 'person' ? 'contact' : 'company'}-${card.id}`;
    card[reasonsKey] = reasons;
    assigned.push(card);
  }
  for (const card of cards) assign(card, new Set());
}
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(path, init); }
  catch { throw new Error('OCR 서버에 연결할 수 없습니다. 서버 실행 상태를 확인하세요.'); }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.detail === 'string' ? body.detail : `요청 실패 (${response.status}). 서버 실행 상태와 입력을 확인하세요.`);
  }
  return response.status === 204 ? undefined as T : response.json();
}
function replace<T>(target: T[], values: T[]) { target.splice(0, target.length, ...values); }
export function hydrateCards(cards: LiveCard[]) {
  current = cards;
  replace(incomingCards, [...cards.filter(c => c.status !== 'reviewed'), ...structuredClone(originals.incomingCards)]);
  replace(confirmedCards, [...cards.filter(c => c.status === 'reviewed'), ...structuredClone(originals.confirmedCards)]);
  replace(companies, structuredClone(originals.companies));
  replace(contacts, structuredClone(originals.contacts));
  replace(networkConnections, structuredClone(originals.networkConnections));
  const actual = cards.filter(c => c.status === 'reviewed')
    .sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt) || a.id.localeCompare(b.id));
  assignLinks(actual, 'company');
  assignLinks(actual, 'person');

  const byCompany = new Map<string, LiveCard[]>();
  const byPerson = new Map<string, LiveCard[]>();
  for (const card of actual) {
    const companyId = card.companyId!;
    const contactId = card.contactId!;
    if (!byCompany.has(companyId)) byCompany.set(companyId, []);
    if (!byPerson.has(contactId)) byPerson.set(contactId, []);
    byCompany.get(companyId)!.push(card);
    byPerson.get(contactId)!.push(card);
  }
  for (const [id, history] of byPerson) {
    const latest = history.sort(newestFirst)[0];
    const x = latest.extracted;
    const ownerIds = [...new Set(history.map(card => card.ownerId))];
    contacts.push({
      id, companyId: latest.companyId!, name: x.name.value, nameEn: x.nameEn.value,
      department: x.department.value, team: x.team.value, position: x.position.value,
      phone: x.phone.value, mobile: x.mobile.value, email: x.email.value,
      cardIds: history.map(card => card.id), ownerIds,
    });
    for (const employeeId of ownerIds) networkConnections.push({ employeeId, contactId: id });
  }
  for (const [id, history] of byCompany) {
    const latest = history.sort(newestFirst)[0];
    const x = latest.extracted;
    const people = contacts.filter(c => c.companyId === id);
    companies.push({
      id, name: x.company.value, nameEn: x.company.value, domain: domain(latest), address: x.address.value,
      industry: '', contactCount: people.length, cardCount: history.length,
      departmentCount: new Set(people.filter(c => c.department || c.team).map(c => JSON.stringify([c.department, c.team]))).size,
      connectedEmployeeCount: new Set(people.flatMap(c => c.ownerIds)).size,
    });
  }
  revision++; listeners.forEach(fn => fn());
}
export async function refreshCards() {
  const cards = await request<LiveCard[]>('/api/cards'); hydrateCards(cards); return cards;
}
export type ReviewOptions = Pick<LiveCard, 'effectiveDate' | 'personLink' | 'companyLink'>;
export async function saveReview(card: BusinessCard, extracted: BusinessCard['extracted'], action: 'draft' | 'confirm', options?: ReviewOptions) {
  if (!isLiveCard(card.id)) throw new Error('예시 명함입니다. 명함 등록에서 실제 이미지 또는 샘플 시연을 추가하세요.');
  await request(`/api/cards/${card.id}/review`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ extracted, action, ...options }) });
  await refreshCards();
}
export function companyTree(companyId: string, asOf?: string): OrgNode {
  const company = companies.find(c => c.id === companyId)!;
  const root: OrgNode = { id: company.id, type: 'company', name: company.name, children: [] };
  const placed = new Set<string>();
  for (const card of currentAffiliations(asOf).filter(c => c.companyId === companyId)) {
    const x = card.extracted;
    const original = (card as LiveCard).departmentPath || [];
    const matches = x.department.value === (original[0] || '') && x.team.value === original.slice(1).join(' / ');
    const departments = matches ? original : [x.department.value, ...x.team.value.split(' / ')].filter(Boolean);
    let parent = root;
    for (const [index, name] of [x.branch.value || '사업소 미확인', ...departments].entries()) {
      const id = `${parent.id}/${encodeURIComponent(name)}`;
      let node = parent.children!.find(n => n.id === id);
      if (!node) { node = { id, type: index === 0 ? 'head_office' : 'department', name, children: [] }; parent.children!.push(node); }
      parent = node;
    }
    const id = `${parent.id}/${card.contactId || card.id}`;
    if (!placed.has(id)) {
      parent.children!.push({ id, type: 'person', name: x.name.value, position: x.position.value, contactId: card.contactId }); placed.add(id);
    }
  }
  return root;
}
