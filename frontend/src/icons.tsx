import React from 'react';

interface IconProps { size?: number; className?: string; style?: React.CSSProperties; }

const I = ({ size = 16, className = '', style, d }: IconProps & { d: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <path d={d} />
  </svg>
);

const Il = ({ size = 16, className = '', style, children }: IconProps & { children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    {children}
  </svg>
);

export const IconDashboard = (p: IconProps) => <Il {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></Il>;
export const IconCard = (p: IconProps) => <Il {...p}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></Il>;
export const IconPlus = (p: IconProps) => <I {...p} d="M12 5v14M5 12h14"/>;
export const IconBuilding = (p: IconProps) => <Il {...p}><rect x="4" y="2" width="16" height="20"/><path d="M9 22V12h6v10"/><path d="M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01"/></Il>;
export const IconSitemap = (p: IconProps) => <Il {...p}><rect x="10" y="2" width="4" height="4"/><rect x="1" y="16" width="4" height="4"/><rect x="10" y="16" width="4" height="4"/><rect x="19" y="16" width="4" height="4"/><path d="M3 18v-4a2 2 0 012-2h14a2 2 0 012 2v4"/><line x1="12" y1="6" x2="12" y2="12"/></Il>;
export const IconNetwork = (p: IconProps) => <Il {...p}><circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7v4m-5.27 6.27L9 13m4.27 4.27L15 13"/><line x1="5" y1="17" x2="19" y2="17"/></Il>;
export const IconSearch = (p: IconProps) => <Il {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></Il>;
export const IconSettings = (p: IconProps) => <Il {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></Il>;
export const IconAdmin = (p: IconProps) => <Il {...p}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></Il>;
export const IconInbox = (p: IconProps) => <Il {...p}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></Il>;
export const IconBell = (p: IconProps) => <Il {...p}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></Il>;
export const IconChevronRight = (p: IconProps) => <I {...p} d="m9 18 6-6-6-6"/>;
export const IconChevronDown = (p: IconProps) => <I {...p} d="m6 9 6 6 6-6"/>;
export const IconX = (p: IconProps) => <I {...p} d="M18 6 6 18M6 6l12 12"/>;
export const IconCheck = (p: IconProps) => <I {...p} d="M20 6 9 17l-5-5"/>;
export const IconEdit = (p: IconProps) => <Il {...p}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></Il>;
export const IconCamera = (p: IconProps) => <Il {...p}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></Il>;
export const IconUpload = (p: IconProps) => <Il {...p}><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></Il>;
export const IconScan = (p: IconProps) => <Il {...p}><polyline points="23 7 23 1 17 1"/><polyline points="1 7 1 1 7 1"/><polyline points="23 17 23 23 17 23"/><polyline points="1 17 1 23 7 23"/></Il>;
export const IconZap = (p: IconProps) => <I {...p} d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>;
export const IconPhone = (p: IconProps) => <Il {...p}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></Il>;
export const IconMail = (p: IconProps) => <Il {...p}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></Il>;
export const IconMapPin = (p: IconProps) => <Il {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></Il>;
export const IconGlobe = (p: IconProps) => <Il {...p}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></Il>;
export const IconUser = (p: IconProps) => <Il {...p}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></Il>;
export const IconFilter = (p: IconProps) => <I {...p} d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>;
export const IconGrid = (p: IconProps) => <Il {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></Il>;
export const IconList = (p: IconProps) => <Il {...p}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></Il>;
export const IconAlertTriangle = (p: IconProps) => <Il {...p}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></Il>;
export const IconRefresh = (p: IconProps) => <Il {...p}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></Il>;
export const IconMerge = (p: IconProps) => <Il {...p}><circle cx="18" cy="6" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="12" cy="18" r="3"/><path d="M18 9v2.34a4 4 0 01-1.76 3.33L12 17M6 9v2.34a4 4 0 001.76 3.33L12 17"/></Il>;
export const IconArrowRight = (p: IconProps) => <I {...p} d="M5 12h14M12 5l7 7-7 7"/>;
export const IconDownload = (p: IconProps) => <Il {...p}><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.29"/></Il>;
export const IconLogOut = (p: IconProps) => <Il {...p}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></Il>;
export const IconSparkle = (p: IconProps) => <Il {...p}><path d="M12 3l1.88 5.76a1 1 0 00.95.69h6.07l-4.9 3.56a1 1 0 00-.37 1.12L17.5 20l-4.9-3.56a1 1 0 00-1.18 0L6.5 20l1.87-5.87a1 1 0 00-.37-1.12L3.1 9.45h6.07a1 1 0 00.95-.69L12 3z"/></Il>;
export const IconEye = (p: IconProps) => <Il {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></Il>;
export const IconLayers = (p: IconProps) => <Il {...p}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></Il>;
