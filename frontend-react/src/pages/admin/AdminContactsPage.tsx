import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { listContacts, type ContactRow } from '@/api/admin';

const inputCls = 'rounded border border-gray-light px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky';

export function AdminContactsPage() {
  const [items, setItems] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const data = await listContacts();
        setItems(data.items);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const categories = useMemo(() => [...new Set(items.map((r) => r.category).filter(Boolean))], [items]);
  const statuses = useMemo(() => [...new Set(items.map((r) => r.status).filter(Boolean))], [items]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter((r) => {
      const matchQuery =
        !q ||
        r.company_name.toLowerCase().includes(q) ||
        r.contact_name.toLowerCase().includes(q) ||
        r.contact_email.toLowerCase().includes(q);
      const matchCategory = !category || r.category === category;
      const matchStatus = !status || r.status === status;
      return matchQuery && matchCategory && matchStatus;
    });
  }, [items, query, category, status]);

  return (
    <>
      <h1 className="mb-4 text-xl font-bold">Contact Inquiries</h1>
      <div className="mb-3 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="회사명 / 이름 / 이메일"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`${inputCls} w-64`}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
          <option value="">전체 카테고리</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
          <option value="">전체 상태</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {(query || category || status) && (
          <button
            type="button"
            onClick={() => { setQuery(''); setCategory(''); setStatus(''); }}
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
              {['ID', 'Company', 'Name', 'Phone', 'Email', 'Message', 'Status', 'Created'].map((h) => (
                <th key={h} className="p-2 text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const msg = r.message
                ? r.message.length > 40
                  ? `${r.message.slice(0, 40)}…`
                  : r.message
                : '—';
              return (
                <tr key={r.id} className="border-t hover:bg-slate-50">
                  <td className="p-2">
                    <Link to={`/admin/contacts/${r.id}`} className="text-sky hover:underline">
                      {r.id}
                    </Link>
                  </td>
                  <td className="p-2">{r.company_name}</td>
                  <td className="p-2">
                    {r.contact_name}
                    {r.contact_count > 1 ? (
                      <span className="ml-1 rounded-full bg-slate-200 px-1.5 text-xs text-slate-600">
                        ×{r.contact_count}
                      </span>
                    ) : null}
                  </td>
                  <td className="p-2">{r.contact_phone || '—'}</td>
                  <td className="p-2">{r.contact_email}</td>
                  <td className="p-2 text-slate-500">{msg}</td>
                  <td className="p-2">{r.status}</td>
                  <td className="p-2">{r.created_at.slice(0, 10)}</td>
                </tr>
              );
            })}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="p-4 text-center text-gray-mid">검색 결과가 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
