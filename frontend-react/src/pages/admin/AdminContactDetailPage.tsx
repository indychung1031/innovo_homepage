import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { downloadContactAttachment, getContactDetail, patchContact, type ContactDetail } from '@/api/admin';
import { AdminDetailTable, dash } from '@/components/admin/AdminDetailTable';

const CONTACT_STATUSES = ['new', 'in_progress', 'resolved', 'closed'] as const;

const inputCls = 'rounded border border-gray-light px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sky';

export function AdminContactDetailPage() {
  const { id } = useParams();
  const [row, setRow] = useState<ContactDetail | null>(null);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteMsg, setNoteMsg] = useState<'saved' | 'error' | null>(null);

  useEffect(() => {
    const num = parseInt(id ?? '', 10);
    if (!Number.isFinite(num)) return;
    void getContactDetail(num).then((data) => {
      setRow(data);
      setStatus(data.status ?? 'new');
      setNote(data.admin_note ?? '');
    });
  }, [id]);

  async function handleStatusChange(next: string) {
    if (!row) return;
    setStatus(next);
    try {
      await patchContact(row.id, { status: next });
    } catch {
      setStatus(row.status);
    }
  }

  async function handleNoteSave() {
    if (!row) return;
    setNoteSaving(true);
    setNoteMsg(null);
    try {
      await patchContact(row.id, { admin_note: note });
      setNoteMsg('saved');
    } catch {
      setNoteMsg('error');
    } finally {
      setNoteSaving(false);
      setTimeout(() => setNoteMsg(null), 2000);
    }
  }

  async function handleDownload() {
    if (!row) return;
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
        ]}
      />

      {/* Admin 편집 섹션 */}
      <div className="mt-4 overflow-hidden rounded border border-gray-light bg-white text-sm">
        <div className="bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-400">
          Admin
        </div>

        {/* Status */}
        <div className="flex items-center gap-4 border-t border-slate-100 px-3 py-3">
          <span className="w-40 shrink-0 font-medium text-slate-600">Status</span>
          <select
            value={status}
            onChange={(e) => void handleStatusChange(e.target.value)}
            className={inputCls}
          >
            {CONTACT_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Admin Note */}
        <div className="flex gap-4 border-t border-slate-100 px-3 py-3">
          <span className="w-40 shrink-0 pt-1 font-medium text-slate-600">Admin Note</span>
          <div className="flex flex-1 flex-col gap-2">
            <textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="내부 메모 (고객에게 노출되지 않음)"
              className={`${inputCls} w-full resize-y`}
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={noteSaving}
                onClick={() => void handleNoteSave()}
                className="rounded bg-navy px-4 py-1.5 text-sm text-white disabled:opacity-60 hover:opacity-90"
              >
                {noteSaving ? '저장 중…' : '저장'}
              </button>
              {noteMsg === 'saved' && <span className="text-sm text-green-600">저장됨</span>}
              {noteMsg === 'error' && <span className="text-sm text-red-600">저장 실패</span>}
            </div>
          </div>
        </div>

        {/* Received */}
        <div className="flex items-center gap-4 border-t border-slate-100 px-3 py-3">
          <span className="w-40 shrink-0 font-medium text-slate-600">Received</span>
          <span className="text-slate-800">{row.created_at.slice(0, 19).replace('T', ' ')}</span>
        </div>
      </div>

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
