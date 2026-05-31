import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { listQuickQuotes, type QuickQuoteRow } from '@/api/admin';

export function AdminQuotesPage() {
  const [items, setItems] = useState<QuickQuoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const data = await listQuickQuotes();
        setItems(data.items);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <h1 className="mb-4 text-xl font-bold">Quick Quotes</h1>
      {loading ? <p className="text-gray-mid">Loading…</p> : null}
      <div className="overflow-x-auto rounded border border-gray-light bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              {['ID', 'Company', 'Name', 'Email', 'IC Code', 'Package', 'Pins', 'Pitch', 'Status', 'Created'].map(
                (h) => (
                  <th key={h} className="p-2 text-left">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-t hover:bg-slate-50">
                <td className="p-2">
                  <Link to={`/admin/quotes/${r.id}`} className="text-sky hover:underline">
                    {r.id}
                  </Link>
                </td>
                <td className="p-2">{r.company_name}</td>
                <td className="p-2">{r.contact_name}</td>
                <td className="p-2">{r.contact_email}</td>
                <td className="p-2">{r.ic_code || '—'}</td>
                <td className="p-2">{r.ic_package_type}</td>
                <td className="p-2">{r.pin_count} pin</td>
                <td className="p-2">{r.pitch}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2">{r.created_at.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
