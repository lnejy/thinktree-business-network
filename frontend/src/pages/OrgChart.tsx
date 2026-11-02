import React, { useState } from 'react';
import { PageName, Badge, Btn } from '../Layout';
import { companies } from '../data';

interface Props {
  navigate: (page: PageName, params?: Record<string, string>) => void;
}

export default function OrgChart({ navigate }: Props) {
  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>Organization Charts</h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>Select a company to view its organization chart</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {companies.map(company => (
          <button
            key={company.id}
            onClick={() => navigate('company-detail', { companyId: company.id })}
            className="bg-white rounded-xl border p-5 text-left transition-all hover:shadow-md group"
            style={{ borderColor: '#E2E8F0' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                {company.nameEn[0]}
              </div>
              <div>
                <div className="font-semibold text-sm" style={{ color: '#0F172A' }}>{company.name}</div>
                <div className="text-xs" style={{ color: '#94A3B8' }}>{company.nameEn}</div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs" style={{ color: '#94A3B8' }}>
              <span style={{ fontFamily: 'DM Mono, monospace' }}>{company.contactCount} contacts</span>
              <span className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#2563EB' }}>View org →</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
