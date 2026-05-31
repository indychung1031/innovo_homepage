import { Fragment, type ReactNode } from 'react';

export function AdminDetailTable({
  sections,
}: {
  sections: { title: string; rows: { label: string; value: ReactNode }[] }[];
}) {
  return (
    <table className="w-full overflow-hidden rounded border border-gray-light bg-white text-sm">
      <tbody>
        {sections.map((section) => (
          <Fragment key={section.title}>
            <tr>
              <td
                colSpan={2}
                className="bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-400"
              >
                {section.title}
              </td>
            </tr>
            {section.rows.map((row) => (
              <tr key={`${section.title}-${row.label}`} className="border-t border-slate-100">
                <th className="w-40 bg-slate-50 px-3 py-2 align-top font-medium text-slate-600">{row.label}</th>
                <td className="px-3 py-2 text-slate-800">{row.value ?? <span className="text-slate-400">—</span>}</td>
              </tr>
            ))}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}

export function dash(value: string | number | null | undefined): ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="text-slate-400">—</span>;
  }
  return value;
}
