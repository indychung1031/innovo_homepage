import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { listContacts, type ContactRow } from '@/api/admin';

export function AdminContactsPage() {
  const [items, setItems] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <>
      <h1 className="mb-4 text-xl font-bold">Contact Inquiries</h1>
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
            {items.map((r) => {
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
          </tbody>
        </table>
      </div>
    </>
  );
}
