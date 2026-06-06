import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { listWizardQuotes, type WizardQuoteRow } from '@/api/admin';

const STATUSES = ['pending', 'reviewing', 'quoted', 'completed', 'expired'] as const;
const inputCls = 'rounded border border-gray-light px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-slate-200 text-slate-700',
  reviewing: 'bg-blue-100 text-blue-700',
  quoted: 'bg-green-100 text-green-700',
  completed: 'bg-navy/10 text-navy',
  expired: 'bg-red-100 text-red-700',
};

export function AdminWizardQuotesPage() {
  const [items, setItems] = useState<WizardQuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const data = await listWizardQuotes();
        setItems(data.items);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter((r) => {
      const matchQuery =
        !q ||
        r.contact_company.toLowerCase().includes(q) ||
        r.contact_name.toLowerCase().includes(q) ||
        r.contact_email.toLowerCase().includes(q) ||
        (r.ic_code ?? '').toLowerCase().includes(q);
      const matchStatus = !status || r.status === status;
      return matchQuery && matchStatus;
    });
  }, [items, query, status]);

  return (
    <>
      <h1 className="mb-4 text-xl font-bold">Wizard Quotes</h1>
      <div className="mb-3 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="회사명 / 이름 / 이메일 / IC Code"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`${inputCls} w-72`}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
          <option value="">전체 상태</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {(query || status) && (
          <button
            type="button"
            onClick={() => { setQuery(''); setStatus(''); }}
            className="text-sm text-gray-mid hover:text-charcoal"
          >
            초기화
          </button>
        )}
        <span className="ml-auto self-center text-sm text-gray-mid">{filtered.length}건</span>
      </div>
      {loading ? <p className="text-gray-mid">Loading…</p> : null}
      <div className="overflow-x-auto rounded border border-gray-light bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              {['ID', 'Company', 'Name', 'IC Code', 'Socket', 'Qty', 'Price', 'Tier', 'Status', 'Created'].map(
                (h) => (
                  <th key={h} className="p-2 text-left">{h}</th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t hover:bg-slate-50">
                <td className="p-2">
                  <Link to={`/admin/wizard-quotes/${r.id}`} className="text-sky hover:underline">
                    {r.id}
                  </Link>
                </td>
                <td className="p-2">{r.contact_company}</td>
                <td className="p-2">{r.contact_name}</td>
                <td className="p-2">{r.ic_code || '—'}</td>
                <td className="p-2">{r.socket_type_name || '—'}</td>
                <td className="p-2">{r.quantity}</td>
                <td className="p-2">
                  {r.matched && r.total_price
                    ? `${r.total_price.toLocaleString()} ${r.currency ?? 'KRW'}`
                    : <span className="text-gray-mid">견적 필요</span>}
                </td>
                <td className="p-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs ${r.membership_tier === 'verified' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {r.membership_tier}
                  </span>
                </td>
                <td className="p-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status] ?? ''}`}>
                    {r.status}
                  </span>
                </td>
                <td className="p-2">{r.created_at.slice(0, 10)}</td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="p-4 text-center text-gray-mid">검색 결과가 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
