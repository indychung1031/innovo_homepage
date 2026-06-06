import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getWizardQuote, patchWizardQuote, type WizardQuoteDetail } from '@/api/admin';
import { AdminDetailTable, dash } from '@/components/admin/AdminDetailTable';

const WIZARD_STATUSES = ['pending', 'reviewing', 'quoted', 'completed', 'expired'] as const;
const inputCls = 'rounded border border-gray-light px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sky';

export function AdminWizardQuoteDetailPage() {
  const { id } = useParams();
  const [row, setRow] = useState<WizardQuoteDetail | null>(null);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteMsg, setNoteMsg] = useState<'saved' | 'error' | null>(null);

  useEffect(() => {
    const num = parseInt(id ?? '', 10);
    if (!Number.isFinite(num)) return;
    void getWizardQuote(num).then((data) => {
      setRow(data);
      setStatus(data.status ?? 'pending');
      setNote(data.admin_note ?? '');
    });
  }, [id]);

  async function handleStatusChange(next: string) {
    if (!row) return;
    setStatus(next);
    try {
      await patchWizardQuote(row.id, { status: next });
    } catch {
      setStatus(row.status);
    }
  }

  async function handleNoteSave() {
    if (!row) return;
    setNoteSaving(true);
    setNoteMsg(null);
    try {
      await patchWizardQuote(row.id, { admin_note: note });
      setNoteMsg('saved');
    } catch {
      setNoteMsg('error');
    } finally {
      setNoteSaving(false);
      setTimeout(() => setNoteMsg(null), 2000);
    }
  }

  if (!row) {
    return <p className="text-gray-mid">Loading…</p>;
  }

  const size = [
    row.dimension_d != null ? `D: ${row.dimension_d}` : null,
    row.dimension_e != null ? `E: ${row.dimension_e}` : null,
    row.dimension_a != null ? `A: ${row.dimension_a}` : null,
  ]
    .filter(Boolean)
    .join(' / ');

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <Link to="/admin/wizard-quotes" className="text-sm text-sky hover:underline">
          ← Wizard Quotes
        </Link>
        <h1 className="text-xl font-bold">Wizard Quote #{row.id}</h1>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${row.membership_tier === 'verified' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
          {row.membership_tier}
        </span>
      </div>

      <AdminDetailTable
        sections={[
          {
            title: 'IC / Socket',
            rows: [
              { label: 'Series', value: dash(row.series) },
              { label: 'IC Type', value: dash(row.ic_type) },
              { label: 'IC Code', value: dash(row.ic_code) },
              { label: 'Package Code', value: dash(row.ic_package_code) },
              { label: 'Socket Type', value: dash(row.socket_type_name) },
              { label: 'Dimensions', value: size || '—' },
              { label: 'Pitch', value: dash(row.pitch) },
              { label: 'Pin Count', value: row.pin_count ? `${row.pin_count} pin` : '—' },
            ],
          },
          {
            title: 'Order',
            rows: [
              { label: 'Quantity', value: `${row.quantity} pcs` },
              { label: 'Spec Notes', value: <span className="whitespace-pre-wrap">{dash(row.spec_notes)}</span> },
              { label: 'Attachment', value: dash(row.attachment_name) },
            ],
          },
          {
            title: 'Estimate',
            rows: [
              { label: 'Matched', value: row.matched ? 'Yes' : 'No (견적 필요)' },
              {
                label: 'Unit Price',
                value: row.unit_price != null
                  ? `${row.unit_price.toLocaleString()} ${row.currency ?? 'KRW'}`
                  : '—',
              },
              {
                label: 'Total Price',
                value: row.total_price != null
                  ? `${row.total_price.toLocaleString()} ${row.currency ?? 'KRW'}`
                  : '—',
              },
              { label: 'Lead Time', value: dash(row.lead_time_label) },
            ],
          },
          {
            title: 'Customer',
            rows: [
              { label: 'Company', value: dash(row.contact_company) },
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

        <div className="flex items-center gap-4 border-t border-slate-100 px-3 py-3">
          <span className="w-40 shrink-0 font-medium text-slate-600">Status</span>
          <select
            value={status}
            onChange={(e) => void handleStatusChange(e.target.value)}
            className={inputCls}
          >
            {WIZARD_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

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

        <div className="flex items-center gap-4 border-t border-slate-100 px-3 py-3">
          <span className="w-40 shrink-0 font-medium text-slate-600">Received</span>
          <span className="text-slate-800">{row.created_at.slice(0, 19).replace('T', ' ')}</span>
        </div>
      </div>
    </>
  );
}
