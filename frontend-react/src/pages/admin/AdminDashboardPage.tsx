import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { getDashboard } from '@/api/admin';
import type { DashboardData, ExpiringSoonItem } from '@/api/admin';

function KpiCard({
  label,
  value,
  link,
  linkLabel,
}: {
  label: string;
  value: number | null;
  link?: string;
  linkLabel?: string;
}) {
  const isLoading = value === null;

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
      <p className="text-sm text-gray-mid">{label}</p>
      {isLoading ? (
        <div className="mt-2 h-9 w-16 animate-pulse rounded bg-gray-200" />
      ) : (
        <p className="mt-2 text-3xl font-bold text-navy">{value.toLocaleString()}</p>
      )}
      {link && linkLabel && (
        <Link to={link} className="mt-2 block text-xs text-sky hover:underline">
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}

function ExpiringTable({ items }: { items: ExpiringSoonItem[] }) {
  const navigate = useNavigate();

  if (items.length === 0) {
    return <p className="text-sm text-gray-mid">만료 임박 견적이 없습니다.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-gray-mid">
            <th className="pb-2 pr-4 font-medium">#ID</th>
            <th className="pb-2 pr-4 font-medium">IC Code</th>
            <th className="pb-2 pr-4 font-medium">회사명</th>
            <th className="pb-2 pr-4 font-medium">접수일</th>
            <th className="pb-2 font-medium">남은 시간</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const urgentClass = item.days_until_expiry <= 1 ? 'text-red-600 font-semibold' : 'text-orange-500';
            const dateStr = new Date(item.created_at).toLocaleDateString('ko-KR', {
              month: '2-digit',
              day: '2-digit',
            });

            return (
              <tr
                key={item.id}
                className="cursor-pointer border-b border-gray-50 hover:bg-slate-50"
                onClick={() => navigate(`/admin/wizard-quotes/${item.id}`)}
              >
                <td className="py-2 pr-4">{item.id}</td>
                <td className="py-2 pr-4 font-mono text-xs">{item.ic_code}</td>
                <td className="py-2 pr-4">{item.contact_company}</td>
                <td className="py-2 pr-4">{dateStr}</td>
                <td className={`py-2 ${urgentClass}`}>
                  {item.days_until_expiry === 0 ? '오늘 만료' : `${item.days_until_expiry}일 후`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(() => setError(true));
  }, []);

  const now = new Date();
  const monthLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월 기준`;

  if (error) {
    return (
      <div className="py-8 text-center text-sm text-gray-mid">데이터를 불러오지 못했습니다.</div>
    );
  }

  const tm = data?.this_month ?? null;
  const pd = data?.pending ?? null;

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold text-navy">Dashboard</h1>
        <span className="text-sm text-gray-mid">{monthLabel}</span>
      </div>

      {/* 이번 달 KPI */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-mid">이번 달</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            label="위저드 견적"
            value={tm?.wizard_quotes ?? null}
            link="/admin/wizard-quotes"
            linkLabel="Wizard Quotes"
          />
          <KpiCard
            label="Quick Quote"
            value={tm?.quick_quotes ?? null}
            link="/admin/quotes"
            linkLabel="Quotes"
          />
          <KpiCard label="신규 회원" value={tm?.new_users ?? null} link="/admin/users" linkLabel="Users" />
          <KpiCard label="문의" value={tm?.contacts ?? null} link="/admin/contacts" linkLabel="Contacts" />
        </div>
      </section>

      {/* 미처리 현황 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-mid">미처리 현황</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            label="미처리 위저드 견적"
            value={pd?.wizard_quotes ?? null}
            link="/admin/wizard-quotes"
            linkLabel="Wizard Quotes"
          />
          <KpiCard
            label="미처리 Quick Quote"
            value={pd?.quick_quotes ?? null}
            link="/admin/quotes"
            linkLabel="Quotes"
          />
          <KpiCard
            label="미처리 문의"
            value={pd?.contacts ?? null}
            link="/admin/contacts"
            linkLabel="Contacts"
          />
          <KpiCard label="인증 회원 수" value={pd?.verified_users ?? null} link="/admin/users" linkLabel="Users" />
        </div>
      </section>

      {/* 만료 임박 견적 */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-mid">
            만료 임박 견적{data && data.expiring_soon.length > 0 && ` (${data.expiring_soon.length}건)`}
          </h2>
          <Link to="/admin/wizard-quotes" className="text-xs text-sky hover:underline">
            Wizard Quotes →
          </Link>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          {data === null ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-5 animate-pulse rounded bg-gray-200" />
              ))}
            </div>
          ) : (
            <ExpiringTable items={data.expiring_soon} />
          )}
        </div>
      </section>
    </div>
  );
}
