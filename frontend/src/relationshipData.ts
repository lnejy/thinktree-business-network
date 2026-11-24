import { contacts } from './data';
import { affiliationChanges, cardDate, personHistory } from './cardApi';

export function recentRelationshipChanges(companyId?: string) {
  return contacts.flatMap(person => {
    const [latest, previous] = personHistory(person.id);
    if (!latest || !previous || (companyId && latest.companyId !== companyId && previous.companyId !== companyId)) return [];
    const changes = affiliationChanges(latest, previous).filter(change => ['회사명', '본사·지점', '부서', '팀', '직책'].includes(change.label));
    return changes.length ? [{ person, latest, previous, changes }] : [];
  }).sort((a, b) => cardDate(b.latest).localeCompare(cardDate(a.latest)) || b.latest.uploadedAt.localeCompare(a.latest.uploadedAt));
}
