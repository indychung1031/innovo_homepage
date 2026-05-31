import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type { FamilySpecsRow } from '@/lib/products/types';

type SpecTableProps = {
  specs: FamilySpecsRow;
};

export function SpecTable({ specs }: SpecTableProps) {
  const { t } = useTranslation('products');

  const rows: { label: ReactNode; value: string | null }[] = [
    { label: t('category.spec_ic_type'), value: specs.ic_type },
    {
      label: (
        <span
          dangerouslySetInnerHTML={{
            __html: t('category.spec_socket_size'),
          }}
        />
      ),
      value: specs.socket_size,
    },
    { label: t('category.spec_operating_temp'), value: specs.operating_temp },
    { label: t('category.spec_humidity'), value: specs.humidity },
    { label: t('category.spec_cover_type'), value: specs.cover_type },
    { label: t('category.spec_material'), value: specs.material },
  ];

  return (
    <table className="w-full text-left text-sm">
      <tbody>
        {rows.map((row) => (
          <tr key={String(row.label)}>
            <td className="w-2/5 py-1 pr-3 text-gray-mid">{row.label}</td>
            <td className="py-1 font-medium">{row.value || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
