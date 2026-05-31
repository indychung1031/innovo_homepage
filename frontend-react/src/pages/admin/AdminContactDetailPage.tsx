import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { downloadContactAttachment, getContactDetail, type ContactDetail } from '@/api/admin';
import { AdminDetailTable, dash } from '@/components/admin/AdminDetailTable';

export function AdminContactDetailPage() {
  const { id } = useParams();
  const [row, setRow] = useState<ContactDetail | null>(null);

  useEffect(() => {
    const num = parseInt(id ?? '', 10);
    if (!Number.isFinite(num)) {
      return;
    }
    void getContactDetail(num).then(setRow);
  }, [id]);

  async function handleDownload() {
    if (!row) {
      return;
    }
    try {
      const blob = await downloadContactAttachment(row.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = row.attachment_name || 'attachment';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.alert('Download failed');
    }
  }

  if (!row) {
    return <p className="text-gray-mid">Loading…</p>;
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <Link to="/admin/contacts" className="text-sm text-sky hover:underline">
          ← Contacts
        </Link>
        <h1 className="text-xl font-bold">Contact Detail #{row.id}</h1>
      </div>
      <AdminDetailTable
        sections={[
          {
            title: 'Inquiry',
            rows: [
              { label: 'Category', value: dash(row.category) },
              { label: 'Subject', value: dash(row.subject) },
              { label: 'Message', value: <span className="whitespace-pre-wrap">{dash(row.message)}</span> },
              {
                label: 'Attachment',
                value: row.has_attachment ? (
                  <button type="button" className="text-sky hover:underline" onClick={() => void handleDownload()}>
                    {row.attachment_name}
                  </button>
                ) : (
                  dash(null)
                ),
              },
            ],
          },
          {
            title: 'Customer',
            rows: [
              { label: 'Company', value: dash(row.company_name) },
              { label: 'Name', value: dash(row.contact_name) },
              {
                label: 'Email',
                value: (
                  <a href={`mailto:${row.contact_email}`} className="text-sky hover:underline">
                    {row.contact_email}
                  </a>
                ),
              },
              { label: 'Phone', value: dash(row.contact_phone) },
            ],
          },
          {
            title: 'Admin',
            rows: [
              { label: 'Status', value: dash(row.status) },
              { label: 'Admin Note', value: <span className="whitespace-pre-wrap">{dash(row.admin_note)}</span> },
              { label: 'Received', value: row.created_at.slice(0, 19).replace('T', ' ') },
            ],
          },
        ]}
      />

      {row.other_contacts.length > 0 ? (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-500">Other contacts from same email</h2>
          <div className="overflow-hidden rounded border border-gray-light bg-white text-sm">
            {row.other_contacts.map((o) => (
              <div key={o.id} className="flex items-center justify-between border-b p-3 last:border-0">
                <Link to={`/admin/contacts/${o.id}`} className="text-sky hover:underline">
                  #{o.id} — {o.subject}
                </Link>
                <span className="text-slate-400">{o.created_at.slice(0, 10)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
