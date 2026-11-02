import type { BusinessCard, OrgNode } from './data';
import { incomingCards, confirmedCards, companies, contacts, networkConnections } from './data';

export interface LiveCard extends BusinessCard {
  source?: string; engine?: string; model?: string; language?: string;
  ocrRawText?: string; warnings?: string[]; error?: string;
  structured?: Record<string, unknown>; departmentPath?: string[];
}
const originals = structuredClone({ incomingCards, confirmedCards, companies, contacts, networkConnections });
let current: LiveCard[] = [];
let revision = 0;
const listeners = new Set<() => void>();
export const subscribeCards = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const cardRevision = () => revision;
export const isLiveCard = (id: string) => current.some(c => c.id === id);
const normalize = (s: string) => s.toLowerCase().replace(/주식회사|\(주\)|㈜|[\s.,()]/g, '');
const freeMail = new Set(['gmail.com', 'naver.com', 'daum.net', 'hanmail.net', 'outlook.com', 'yahoo.com', 'hotmail.com', 'icloud.com']);
function domain(card: BusinessCard) {
  const web = card.extracted.website.value.trim();
  try { if (web) return new URL(/^https?:\/\//i.test(web) ? web : `https://${web}`).hostname.replace(/^www\./, '').toLowerCase(); }
  catch { /* Invalid URL is not identity evidence. */ }
  const host = card.extracted.email.value.split('@')[1]?.toLowerCase() || '';
  return freeMail.has(host) ? '' : host;
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
  const actual = cards.filter(c => c.status === 'reviewed').sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt));
  for (const card of actual) {
    const x = card.extracted;
    const host = domain(card);
    const name = normalize(x.company.value);
    const rawCompany = card.structured?.company as { name?: string; aliases?: string[] } | undefined;
    const rawAliases = (rawCompany?.aliases || []).map(normalize);
    const aliases = [normalize(rawCompany?.name || ''), ...rawAliases].includes(name) ? rawAliases : [];
    // A company name/alias is required; conflicting domains prevent a merge.
    let company = companies.find(c => [name, ...aliases].some(n => n && [normalize(c.name), normalize(c.nameEn)].includes(n)) &&
      (!host || !c.domain || host === c.domain) &&
      (host || c.domain || !x.address.value || !c.address || normalize(c.address) === normalize(x.address.value)));
    if (!company) {
      company = { id: `company-${card.id}`, name: x.company.value, nameEn: x.company.value,
        domain: host, address: x.address.value, industry: '', contactCount: 0, cardCount: 0,
        departmentCount: 0, connectedEmployeeCount: 0 };
      companies.push(company);
    }
    card.companyId = company.id;
    let contact = contacts.find(c => c.companyId === company!.id && c.name === x.name.value &&
      ((x.email.value && c.email.toLowerCase() === x.email.value.toLowerCase()) ||
      (x.mobile.value && c.mobile.replace(/\D/g, '') === x.mobile.value.replace(/\D/g, ''))));
    if (!contact) {
      contact = { id: `contact-${card.id}`, companyId: company.id, name: x.name.value,
        nameEn: x.nameEn.value, department: x.department.value, team: x.team.value,
        position: x.position.value, phone: x.phone.value, mobile: x.mobile.value,
        email: x.email.value, cardIds: [], ownerIds: [] };
      contacts.push(contact);
    }
    if (!contact.cardIds.includes(card.id)) contact.cardIds.push(card.id);
    if (!contact.ownerIds.includes(card.ownerId)) contact.ownerIds.push(card.ownerId);
    card.contactId = contact.id;
    if (!networkConnections.some(n => n.employeeId === card.ownerId && n.contactId === contact!.id)) networkConnections.push({ employeeId: card.ownerId, contactId: contact.id });
  }
  for (const company of companies) {
    if (!actual.some(c => c.companyId === company.id)) continue;
    const people = contacts.filter(c => c.companyId === company.id);
    company.contactCount = people.length;
    company.cardCount = confirmedCards.filter(c => c.companyId === company.id).length;
    company.departmentCount = new Set(people.map(c => `${c.department}/${c.team}`)).size;
    company.connectedEmployeeCount = new Set(people.flatMap(c => c.ownerIds)).size;
  }
  revision++; listeners.forEach(fn => fn());
}
export async function refreshCards() {
  const cards = await request<LiveCard[]>('/api/cards'); hydrateCards(cards); return cards;
}
export async function saveReview(card: BusinessCard, extracted: BusinessCard['extracted'], action: 'draft' | 'confirm') {
  if (!isLiveCard(card.id)) throw new Error('예시 명함입니다. 명함 등록에서 실제 이미지 또는 샘플 시연을 추가하세요.');
  await request(`/api/cards/${card.id}/review`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ extracted, action }) });
  await refreshCards();
}
export function companyTree(companyId: string): OrgNode {
  const company = companies.find(c => c.id === companyId)!;
  const root: OrgNode = { id: company.id, type: 'company', name: company.name, children: [] };
  const placed = new Set<string>();
  for (const card of confirmedCards.filter(c => c.companyId === companyId)) {
    const x = card.extracted;
    const original = (card as LiveCard).departmentPath || [];
    const matches = x.department.value === (original[0] || '') && x.team.value === original.slice(1).join(' / ');
    const departments = matches ? original : [x.department.value, ...x.team.value.split(' / ')].filter(Boolean);
    let parent = root;
    for (const [index, name] of [x.branch.value || '사업소 미확인', ...departments].entries()) {
      const id = `${parent.id}/${name}`;
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
