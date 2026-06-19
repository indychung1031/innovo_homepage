import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getQuickQuote, patchQuickQuote, type QuickQuoteDetail } from '@/api/admin';
import { AdminDetailTable, dash } from '@/components/admin/AdminDetailTable';

const QUOTE_STATUSES = ['pending', 'reviewing', 'quoted', 'completed', 'expired'] as const;

const inputCls = 'rounded border border-gray-light px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sky';

export function AdminQuoteDetailPage() {
  const { id } = useParams();
  const [row, setRow] = useState<QuickQuoteDetail | null>(null);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteMsg, setNoteMsg] = useState<'saved' | 'error' | null>(null);

  useEffect(() => {
    const num = parseInt(id ?? '', 10);
    if (!Number.isFinite(num)) return;
    void getQuickQuote(num).then((data) => {
      setRow(data);
      setStatus(data.status ?? 'pending');
      setNote(data.admin_note ?? '');
    });
  }, [id]);

  async function handleStatusChange(next: string) {
    if (!row) return;
    setStatus(next);
    try {
      await patchQuickQuote(row.id, { status: next });
    } catch {
      setStatus(row.status);
    }
  }

  async function handleNoteSave() {
    if (!row) return;
    setNoteSaving(true);
    setNoteMsg(null);
    try {
      await patchQuickQuote(row.id, { admin_note: note });
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

  const size = `${row.package_d} × ${row.package_e} mm${row.package_a ? ` (A: ${row.package_a} mm)` : ''}`;

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <Link to="/admin/quotes" className="text-sm text-sky hover:underline">
          ← Quotes
        </Link>
        <h1 className="text-xl font-bold">Quote Detail #{row.id}</h1>
      </div>

      <AdminDetailTable
        sections={[
          {
            title: 'IC Information',
            rows: [
              { label: 'Package Type', value: dash(row.ic_package_type) },
              { label: 'IC Type', value: dash(row.ic_type) },
              { label: 'IC Code', value: dash(row.ic_code) },
              { label: 'Pin Count', value: `${row.pin_count} pin` },
              { label: 'Pitch', value: dash(row.pitch) },
              { label: 'Package Size (D×E)', value: size },
            ],
          },
          {
            title: 'Order Information',
            rows: [
              { label: 'Quantity', value: row.quantity ? `${row.quantity} pcs` : dash(null) },
              { label: 'Desired Delivery', value: dash(row.desired_delivery) },
              { label: 'Message', value: <span className="whitespace-pre-wrap">{dash(row.message)}</span> },
            ],
          },
          {
            title: 'Customer Information',
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
            {QUOTE_STATUSES.map((s) => (
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

        {/* Product Category */}
        <div className="flex items-center gap-4 border-t border-slate-100 px-3 py-3">
          <span className="w-40 shrink-0 font-medium text-slate-600">Product Category</span>
          <span className="text-slate-800">{row.product_category ?? '—'}</span>
        </div>

        {/* ERP Inquiry ID */}
        <div className="flex items-center gap-4 border-t border-slate-100 px-3 py-3">
          <span className="w-40 shrink-0 font-medium text-slate-600">ERP Inquiry ID</span>
          {row.erp_inquiry_id ? (
            <span className="rounded bg-green-50 px-2 py-0.5 text-sm font-mono text-green-700">
              #{row.erp_inquiry_id}
            </span>
          ) : (
            <span className="text-gray-mid text-sm">미전송</span>
          )}
        </div>

        {/* Received */}
        <div className="flex items-center gap-4 border-t border-slate-100 px-3 py-3">
          <span className="w-40 shrink-0 font-medium text-slate-600">Received</span>
          <span className="text-slate-800">{row.created_at.slice(0, 19).replace('T', ' ')}</span>
        </div>
      </div>
    </>
  );
}
