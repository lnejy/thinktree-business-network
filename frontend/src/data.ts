export type UserRole = 'user' | 'admin';
export type CardStatus = 'uploading' | 'ocr_processing' | 'ai_structuring' | 'ready_for_review' | 'reviewed' | 'failed';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface Employee {
  id: string;
  name: string;
  nameEn: string;
  position: string;
  department: string;
  email: string;
  avatarColor: string;
  company: string;
}

export interface BusinessCard {
  id: string;
  imageUrl: string;
  ownerId: string;
  ownerIds?: string[];
  companyId?: string;
  contactId?: string;
  status: CardStatus;
  uploadedAt: string;
  reviewedAt?: string;
  confidence: number;
  extracted: {
    fax: { value: string; confidence: ConfidenceLevel };
    postalCode: { value: string; confidence: ConfidenceLevel };
    address2: { value: string; confidence: ConfidenceLevel };
    company: { value: string; confidence: ConfidenceLevel };
    name: { value: string; confidence: ConfidenceLevel };
    nameEn: { value: string; confidence: ConfidenceLevel };
    branch: { value: string; confidence: ConfidenceLevel };
    department: { value: string; confidence: ConfidenceLevel };
    team: { value: string; confidence: ConfidenceLevel };
    position: { value: string; confidence: ConfidenceLevel };
    phone: { value: string; confidence: ConfidenceLevel };
    mobile: { value: string; confidence: ConfidenceLevel };
    email: { value: string; confidence: ConfidenceLevel };
    address: { value: string; confidence: ConfidenceLevel };
    website: { value: string; confidence: ConfidenceLevel };
  };
}

export interface Contact {
  id: string;
  companyId: string;
  name: string;
  nameEn: string;
  department: string;
  team?: string;
  position: string;
  phone: string;
  mobile: string;
  email: string;
  cardIds: string[];
  ownerIds: string[];
  nodeId?: string;
}

export interface Company {
  id: string;
  name: string;
  nameEn: string;
  domain: string;
  industry: string;
  address: string;
  contactCount: number;
  cardCount: number;
  departmentCount: number;
  connectedEmployeeCount: number;
  logo?: string;
  duplicateCandidateOf?: string;
  similarity?: number;
}

export interface OrgNode {
  id: string;
  type: 'company' | 'head_office' | 'division' | 'department' | 'team' | 'person';
  name: string;
  nameEn?: string;
  position?: string;
  count?: number;
  contactId?: string;
  children?: OrgNode[];
}

// ─── Our Company Employees ──────────────────────────────────────────
export const employees: Employee[] = [];
export const cardOwners = (card: BusinessCard) => card.ownerIds?.length ? card.ownerIds : [card.ownerId];

// ─── Client Companies ────────────────────────────────────────────────
export const companies: Company[] = [];

// ─── Contacts ────────────────────────────────────────────────────────
export const contacts: Contact[] = [];

// ─── Business Cards (confirmed) ─────────────────────────────────────
export const confirmedCards: BusinessCard[] = [];

// ─── Incoming Cards (pending review) ────────────────────────────────
export const incomingCards: BusinessCard[] = [];

// ─── Business Network connections ────────────────────────────────────
export const networkConnections: Array<{ employeeId: string; contactId: string }> = [];

export const formatDate = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
};

export const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const getEmployee = (id: string) => employees.find(e => e.id === id);
export const getContact = (id: string) => contacts.find(c => c.id === id);
export const getCompany = (id: string) => companies.find(c => c.id === id);
