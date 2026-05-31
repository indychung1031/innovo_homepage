import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getQuickQuote, type QuickQuoteDetail } from '@/api/admin';
import { AdminDetailTable, dash } from '@/components/admin/AdminDetailTable';

export function AdminQuoteDetailPage() {
  const { id } = useParams();
  const [row, setRow] = useState<QuickQuoteDetail | null>(null);

  useEffect(() => {
    const num = parseInt(id ?? '', 10);
    if (!Number.isFinite(num)) {
      return;
    }
    void getQuickQuote(num).then(setRow);
  }, [id]);

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
    </>
  );
}
