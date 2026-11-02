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
}

export interface BusinessCard {
  id: string;
  imageUrl: string;
  ownerId: string;
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
export const employees: Employee[] = [
  { id: 'e1', name: '김민수', nameEn: 'Kim Minsu', position: '영업팀장', department: '영업팀', email: 'minsu.kim@cardsync.io', avatarColor: '#2563EB' },
  { id: 'e2', name: '이지영', nameEn: 'Lee Jiyoung', position: '사업개발 매니저', department: '사업개발팀', email: 'jiyoung.lee@cardsync.io', avatarColor: '#7C3AED' },
  { id: 'e3', name: '박성호', nameEn: 'Park Sungho', position: '영업 대리', department: '영업팀', email: 'sungho.park@cardsync.io', avatarColor: '#059669' },
  { id: 'e4', name: '최예린', nameEn: 'Choi Yerin', position: '마케팅 매니저', department: '마케팅팀', email: 'yerin.choi@cardsync.io', avatarColor: '#D97706' },
  { id: 'e5', name: '정현우', nameEn: 'Jung Hyunwoo', position: '기술영업 과장', department: '기술영업팀', email: 'hyunwoo.jung@cardsync.io', avatarColor: '#0891B2' },
];

// ─── Client Companies ────────────────────────────────────────────────
export const companies: Company[] = [
  { id: 'c1', name: '삼성전자', nameEn: 'Samsung Electronics', domain: 'samsung.com', industry: '전자/반도체', address: '경기도 수원시 영통구 삼성로 129', contactCount: 8, cardCount: 12, departmentCount: 4, connectedEmployeeCount: 3 },
  { id: 'c2', name: 'LG CNS', nameEn: 'LG CNS', domain: 'lgcns.com', industry: 'IT 서비스', address: '서울시 강서구 마곡중앙10로 30', contactCount: 5, cardCount: 7, departmentCount: 3, connectedEmployeeCount: 2 },
  { id: 'c3', name: 'SK텔레콤', nameEn: 'SK Telecom', domain: 'sktelecom.com', industry: '통신', address: '서울시 중구 을지로 65', contactCount: 6, cardCount: 9, departmentCount: 3, connectedEmployeeCount: 4 },
  { id: 'c4', name: '카카오', nameEn: 'Kakao Corp', domain: 'kakao.com', industry: 'IT/플랫폼', address: '제주시 첨단로 242', contactCount: 4, cardCount: 5, departmentCount: 2, connectedEmployeeCount: 2 },
  { id: 'c5', name: '네이버', nameEn: 'Naver Corp', domain: 'naver.com', industry: 'IT/플랫폼', address: '경기도 성남시 분당구 정자일로 95', contactCount: 3, cardCount: 4, departmentCount: 2, connectedEmployeeCount: 2 },
  { id: 'c6', name: '현대자동차', nameEn: 'Hyundai Motor', domain: 'hyundai.com', industry: '자동차', address: '서울시 서초구 헌릉로 12', contactCount: 5, cardCount: 6, departmentCount: 3, connectedEmployeeCount: 3 },
  { id: 'c7', name: 'ThinkTree Inc.', nameEn: 'ThinkTree Inc.', domain: 'thinktree.io', industry: 'SaaS', address: '서울시 강남구 테헤란로 427', contactCount: 2, cardCount: 2, departmentCount: 1, connectedEmployeeCount: 1, duplicateCandidateOf: 'THINKTREE', similarity: 94 },
];

// ─── Contacts ────────────────────────────────────────────────────────
export const contacts: Contact[] = [
  { id: 'ct1', companyId: 'c1', name: '이준호', nameEn: 'Lee Junho', department: '디지털미디어&커뮤니케이션즈 사업부', team: 'TV/디스플레이팀', position: '상무', phone: '031-200-1234', mobile: '010-9876-5432', email: 'junho.lee@samsung.com', cardIds: ['bc1'], ownerIds: ['e1', 'e3'], nodeId: 'n1' },
  { id: 'ct2', companyId: 'c1', name: '박서연', nameEn: 'Park Seoyeon', department: '디지털미디어&커뮤니케이션즈 사업부', team: 'TV/디스플레이팀', position: '책임연구원', phone: '031-200-5678', mobile: '010-1234-5678', email: 'seoyeon.park@samsung.com', cardIds: ['bc2'], ownerIds: ['e1'], nodeId: 'n2' },
  { id: 'ct3', companyId: 'c1', name: '최민석', nameEn: 'Choi Minseok', department: '반도체 사업부', team: 'DRAM팀', position: '부사장', phone: '031-200-9999', mobile: '010-5555-1234', email: 'minseok.choi@samsung.com', cardIds: ['bc3'], ownerIds: ['e2'], nodeId: 'n5' },
  { id: 'ct4', companyId: 'c2', name: '정유진', nameEn: 'Jung Yujin', department: 'DX플랫폼 사업부', team: '클라우드 네이티브팀', position: '매니저', phone: '02-3777-1111', mobile: '010-2222-3333', email: 'yujin.jung@lgcns.com', cardIds: ['bc4'], ownerIds: ['e2', 'e4'], nodeId: 'n8' },
  { id: 'ct5', companyId: 'c2', name: '한승우', nameEn: 'Han Seungwoo', department: 'DX플랫폼 사업부', team: '클라우드 네이티브팀', position: '선임개발자', phone: '02-3777-2222', mobile: '010-3333-4444', email: 'seungwoo.han@lgcns.com', cardIds: ['bc5'], ownerIds: ['e2'], nodeId: 'n9' },
  { id: 'ct6', companyId: 'c3', name: '오현민', nameEn: 'Oh Hyunmin', department: '엔터프라이즈 사업 본부', team: 'B2B영업팀', position: '수석매니저', phone: '02-6100-2000', mobile: '010-7777-8888', email: 'hyunmin.oh@sktelecom.com', cardIds: ['bc6'], ownerIds: ['e1', 'e5'], nodeId: 'n12' },
  { id: 'ct7', companyId: 'c3', name: '장미래', nameEn: 'Jang Mirae', department: '클라우드&ICT인프라 본부', team: '', position: '본부장', phone: '02-6100-3000', mobile: '010-9999-0000', email: 'mirae.jang@sktelecom.com', cardIds: ['bc7'], ownerIds: ['e3', 'e5'], nodeId: 'n13' },
  { id: 'ct8', companyId: 'c4', name: '김태민', nameEn: 'Kim Taemin', department: '카카오엔터프라이즈', team: 'AI플랫폼팀', position: '리드엔지니어', phone: '064-795-1000', mobile: '010-4444-5555', email: 'taemin.kim@kakao.com', cardIds: ['bc8'], ownerIds: ['e2', 'e4'], nodeId: 'n15' },
];

// ─── Business Cards (confirmed) ─────────────────────────────────────
export const confirmedCards: BusinessCard[] = [
  {
    id: 'bc1', imageUrl: '', ownerId: 'e1', companyId: 'c1', contactId: 'ct1', status: 'reviewed',
    uploadedAt: '2025-09-20T09:15:00', reviewedAt: '2025-09-20T10:30:00', confidence: 96,
    extracted: {
      fax: { value: '', confidence: 'low' }, postalCode: { value: '', confidence: 'low' }, address2: { value: '', confidence: 'low' },
      company: { value: '삼성전자', confidence: 'high' }, name: { value: '이준호', confidence: 'high' },
      nameEn: { value: 'Lee Junho', confidence: 'high' }, branch: { value: '수원 본사', confidence: 'high' },
      department: { value: '디지털미디어&커뮤니케이션즈 사업부', confidence: 'high' },
      team: { value: 'TV/디스플레이팀', confidence: 'medium' }, position: { value: '상무', confidence: 'high' },
      phone: { value: '031-200-1234', confidence: 'high' }, mobile: { value: '010-9876-5432', confidence: 'high' },
      email: { value: 'junho.lee@samsung.com', confidence: 'high' },
      address: { value: '경기도 수원시 영통구 삼성로 129', confidence: 'medium' },
      website: { value: 'www.samsung.com', confidence: 'high' }
    }
  },
  {
    id: 'bc2', imageUrl: '', ownerId: 'e1', companyId: 'c1', contactId: 'ct2', status: 'reviewed',
    uploadedAt: '2025-09-18T14:20:00', reviewedAt: '2025-09-18T15:00:00', confidence: 91,
    extracted: {
      fax: { value: '', confidence: 'low' }, postalCode: { value: '', confidence: 'low' }, address2: { value: '', confidence: 'low' },
      company: { value: '삼성전자', confidence: 'high' }, name: { value: '박서연', confidence: 'high' },
      nameEn: { value: 'Park Seoyeon', confidence: 'high' }, branch: { value: '수원 본사', confidence: 'high' },
      department: { value: '디지털미디어&커뮤니케이션즈 사업부', confidence: 'high' },
      team: { value: 'TV/디스플레이팀', confidence: 'high' }, position: { value: '책임연구원', confidence: 'high' },
      phone: { value: '031-200-5678', confidence: 'high' }, mobile: { value: '010-1234-5678', confidence: 'high' },
      email: { value: 'seoyeon.park@samsung.com', confidence: 'high' },
      address: { value: '경기도 수원시 영통구', confidence: 'low' },
      website: { value: 'www.samsung.com', confidence: 'high' }
    }
  },
  {
    id: 'bc4', imageUrl: '', ownerId: 'e2', companyId: 'c2', contactId: 'ct4', status: 'reviewed',
    uploadedAt: '2025-09-15T11:00:00', reviewedAt: '2025-09-15T11:45:00', confidence: 88,
    extracted: {
      fax: { value: '', confidence: 'low' }, postalCode: { value: '', confidence: 'low' }, address2: { value: '', confidence: 'low' },
      company: { value: 'LG CNS', confidence: 'high' }, name: { value: '정유진', confidence: 'high' },
      nameEn: { value: 'Jung Yujin', confidence: 'medium' }, branch: { value: '마곡 본사', confidence: 'high' },
      department: { value: 'DX플랫폼 사업부', confidence: 'high' },
      team: { value: '클라우드 네이티브팀', confidence: 'medium' }, position: { value: '매니저', confidence: 'high' },
      phone: { value: '02-3777-1111', confidence: 'high' }, mobile: { value: '010-2222-3333', confidence: 'high' },
      email: { value: 'yujin.jung@lgcns.com', confidence: 'high' },
      address: { value: '서울시 강서구 마곡중앙10로 30', confidence: 'high' },
      website: { value: 'www.lgcns.com', confidence: 'high' }
    }
  },
  {
    id: 'bc6', imageUrl: '', ownerId: 'e1', companyId: 'c3', contactId: 'ct6', status: 'reviewed',
    uploadedAt: '2025-09-10T16:30:00', reviewedAt: '2025-09-10T17:00:00', confidence: 93,
    extracted: {
      fax: { value: '', confidence: 'low' }, postalCode: { value: '', confidence: 'low' }, address2: { value: '', confidence: 'low' },
      company: { value: 'SK텔레콤', confidence: 'high' }, name: { value: '오현민', confidence: 'high' },
      nameEn: { value: 'Oh Hyunmin', confidence: 'high' }, branch: { value: '을지로 본사', confidence: 'high' },
      department: { value: '엔터프라이즈 사업 본부', confidence: 'high' },
      team: { value: 'B2B영업팀', confidence: 'high' }, position: { value: '수석매니저', confidence: 'high' },
      phone: { value: '02-6100-2000', confidence: 'high' }, mobile: { value: '010-7777-8888', confidence: 'high' },
      email: { value: 'hyunmin.oh@sktelecom.com', confidence: 'high' },
      address: { value: '서울시 중구 을지로 65', confidence: 'high' },
      website: { value: 'www.sktelecom.com', confidence: 'high' }
    }
  },
];

// ─── Incoming Cards (pending review) ────────────────────────────────
export const incomingCards: BusinessCard[] = [
  {
    id: 'inc1', imageUrl: '', ownerId: 'e3', status: 'ready_for_review',
    uploadedAt: '2025-09-29T08:42:00', confidence: 72,
    extracted: {
      fax: { value: '', confidence: 'low' }, postalCode: { value: '', confidence: 'low' }, address2: { value: '', confidence: 'low' },
      company: { value: '현대자동차', confidence: 'high' }, name: { value: '김영진', confidence: 'high' },
      nameEn: { value: 'Kim Youngjin', confidence: 'medium' }, branch: { value: '서초 본사', confidence: 'medium' },
      department: { value: '미래모빌리티사업부', confidence: 'medium' },
      team: { value: 'EV플랫폼팀', confidence: 'low' }, position: { value: '팀장', confidence: 'high' },
      phone: { value: '02-3464-2000', confidence: 'high' }, mobile: { value: '010-1234-5678', confidence: 'high' },
      email: { value: 'youngjin.kim@hyundai.com', confidence: 'medium' },
      address: { value: '서울시 서초구 헌릉로 12', confidence: 'high' },
      website: { value: 'www.hyundai.com', confidence: 'high' }
    }
  },
  {
    id: 'inc2', imageUrl: '', ownerId: 'e4', status: 'ready_for_review',
    uploadedAt: '2025-09-29T09:15:00', confidence: 58,
    extracted: {
      fax: { value: '', confidence: 'low' }, postalCode: { value: '', confidence: 'low' }, address2: { value: '', confidence: 'low' },
      company: { value: '네이버 클라우드', confidence: 'medium' }, name: { value: '손지훈', confidence: 'high' },
      nameEn: { value: 'Son Jihoon', confidence: 'low' }, branch: { value: '', confidence: 'low' },
      department: { value: 'Cloud Platform 본부', confidence: 'medium' },
      team: { value: '', confidence: 'low' }, position: { value: '사업개발 이사', confidence: 'medium' },
      phone: { value: '031-784-1000', confidence: 'high' }, mobile: { value: '010-6543-2100', confidence: 'high' },
      email: { value: 'jihoon.son@ncloud.com', confidence: 'low' },
      address: { value: '경기도 성남시 분당구', confidence: 'medium' },
      website: { value: 'www.ncloud.com', confidence: 'medium' }
    }
  },
  {
    id: 'inc3', imageUrl: '', ownerId: 'e5', status: 'ai_structuring',
    uploadedAt: '2025-09-29T09:58:00', confidence: 0,
    extracted: {
      fax: { value: '', confidence: 'low' }, postalCode: { value: '', confidence: 'low' }, address2: { value: '', confidence: 'low' },
      company: { value: '', confidence: 'low' }, name: { value: '', confidence: 'low' },
      nameEn: { value: '', confidence: 'low' }, branch: { value: '', confidence: 'low' },
      department: { value: '', confidence: 'low' }, team: { value: '', confidence: 'low' },
      position: { value: '', confidence: 'low' }, phone: { value: '', confidence: 'low' },
      mobile: { value: '', confidence: 'low' }, email: { value: '', confidence: 'low' },
      address: { value: '', confidence: 'low' }, website: { value: '', confidence: 'low' }
    }
  },
  {
    id: 'inc4', imageUrl: '', ownerId: 'e1', status: 'ready_for_review',
    uploadedAt: '2025-09-28T17:30:00', confidence: 89,
    extracted: {
      fax: { value: '', confidence: 'low' }, postalCode: { value: '', confidence: 'low' }, address2: { value: '', confidence: 'low' },
      company: { value: 'POSCO홀딩스', confidence: 'high' }, name: { value: '유재혁', confidence: 'high' },
      nameEn: { value: 'Yoo Jaehyeok', confidence: 'high' }, branch: { value: '', confidence: 'low' },
      department: { value: '전략기획실', confidence: 'high' },
      team: { value: 'M&A팀', confidence: 'high' }, position: { value: '상무보', confidence: 'medium' },
      phone: { value: '054-220-0114', confidence: 'high' }, mobile: { value: '010-8765-4321', confidence: 'high' },
      email: { value: 'jaehyeok.yoo@posco.com', confidence: 'high' },
      address: { value: '경북 포항시 남구 동해안로 6261', confidence: 'medium' },
      website: { value: 'www.posco.com', confidence: 'high' }
    }
  },
  {
    id: 'inc5', imageUrl: '', ownerId: 'e2', status: 'failed',
    uploadedAt: '2025-09-28T14:20:00', confidence: 0,
    extracted: {
      fax: { value: '', confidence: 'low' }, postalCode: { value: '', confidence: 'low' }, address2: { value: '', confidence: 'low' },
      company: { value: '', confidence: 'low' }, name: { value: '', confidence: 'low' },
      nameEn: { value: '', confidence: 'low' }, branch: { value: '', confidence: 'low' },
      department: { value: '', confidence: 'low' }, team: { value: '', confidence: 'low' },
      position: { value: '', confidence: 'low' }, phone: { value: '', confidence: 'low' },
      mobile: { value: '', confidence: 'low' }, email: { value: '', confidence: 'low' },
      address: { value: '', confidence: 'low' }, website: { value: '', confidence: 'low' }
    }
  },
];

// ─── Samsung Org Chart ───────────────────────────────────────────────
export const samsungOrgChart: OrgNode = {
  id: 'n_root', type: 'company', name: '삼성전자', nameEn: 'Samsung Electronics', count: 8,
  children: [
    {
      id: 'n_seoul', type: 'head_office', name: '수원 본사', nameEn: 'Suwon HQ', count: 5,
      children: [
        {
          id: 'n_div1', type: 'division', name: '디지털미디어&커뮤니케이션즈 사업부', nameEn: 'DM&C Division', count: 3,
          children: [
            {
              id: 'n_dept1', type: 'department', name: 'TV/디스플레이 개발팀', count: 2,
              children: [
                { id: 'n1', type: 'person', name: '이준호', position: '상무', contactId: 'ct1' },
                { id: 'n2', type: 'person', name: '박서연', position: '책임연구원', contactId: 'ct2' },
              ]
            },
            {
              id: 'n_dept2', type: 'department', name: '모바일 개발팀', count: 1,
              children: [
                { id: 'n3', type: 'person', name: '김태연', position: '선임연구원', contactId: undefined }
              ]
            }
          ]
        },
        {
          id: 'n_div2', type: 'division', name: '반도체 사업부', nameEn: 'Semiconductor Division', count: 3,
          children: [
            {
              id: 'n_dept3', type: 'department', name: 'DRAM 개발팀', count: 2,
              children: [
                { id: 'n5', type: 'person', name: '최민석', position: '부사장', contactId: 'ct3' },
                { id: 'n6', type: 'person', name: '강동원', position: '수석연구원', contactId: undefined }
              ]
            }
          ]
        }
      ]
    }
  ]
};

// ─── Business Network connections ────────────────────────────────────
export const networkConnections: Array<{ employeeId: string; contactId: string }> = [
  { employeeId: 'e1', contactId: 'ct1' },
  { employeeId: 'e3', contactId: 'ct1' },
  { employeeId: 'e1', contactId: 'ct2' },
  { employeeId: 'e2', contactId: 'ct3' },
  { employeeId: 'e2', contactId: 'ct4' },
  { employeeId: 'e4', contactId: 'ct4' },
  { employeeId: 'e2', contactId: 'ct5' },
  { employeeId: 'e1', contactId: 'ct6' },
  { employeeId: 'e5', contactId: 'ct6' },
  { employeeId: 'e3', contactId: 'ct7' },
  { employeeId: 'e5', contactId: 'ct7' },
  { employeeId: 'e2', contactId: 'ct8' },
  { employeeId: 'e4', contactId: 'ct8' },
];

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
