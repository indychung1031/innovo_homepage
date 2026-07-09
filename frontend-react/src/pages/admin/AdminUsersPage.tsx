import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { deleteUser, isAdminUnauthorized, listUsers, patchUserMembership, type UserRow } from '@/api/admin';

const inputCls = 'rounded border border-gray-light px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky';

export function AdminUsersPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listUsers();
      setItems(data.items);
    } catch (err) {
      if (isAdminUnauthorized(err)) {
        navigate('/admin/login', { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter((u) => {
      const matchQuery =
        !q ||
        u.email.toLowerCase().includes(q) ||
        u.company_name.toLowerCase().includes(q);
      const matchTier = !tier || u.membership_tier === tier;
      return matchQuery && matchTier;
    });
  }, [items, query, tier]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleTier(user: UserRow, tier: string) {
    try {
      await patchUserMembership(user.id, tier);
    } catch (err) {
      // 실패를 삼키면 관리자가 성공한 것으로 오인함
      window.alert(`등급 변경 실패: ${err instanceof Error ? err.message : 'Error'}`);
      return;
    }
    await load();
  }

  async function handleDelete(user: UserRow) {
    const ok = window.confirm(
      `${user.email} 계정을 삭제하시겠습니까?\n견적 기록은 익명화 후 보존됩니다.`,
    );
    if (!ok) {
      return;
    }
    try {
      await deleteUser(user.id);
    } catch (err) {
      window.alert(`삭제 실패: ${err instanceof Error ? err.message : 'Error'}`);
      return;
    }
    await load();
  }

  return (
    <>
      <h1 className="mb-4 text-xl font-bold">Members</h1>
      <div className="mb-3 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="이메일 / 회사명"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`${inputCls} w-60`}
        />
        <select value={tier} onChange={(e) => setTier(e.target.value)} className={inputCls}>
          <option value="">전체 등급</option>
          <option value="general">general</option>
          <option value="verified">verified</option>
        </select>
        {(query || tier) && (
          <button
            type="button"
            onClick={() => { setQuery(''); setTier(''); }}
            className="text-sm text-gray-mid hover:text-charcoal"
          >
            초기화
          </button>
        )}
        <span className="ml-auto self-center text-sm text-gray-mid">{filtered.length}건</span>
      </div>
      {loading ? <p className="text-gray-mid">Loading…</p> : null}
      {error ? <p className="mb-3 text-sm text-red-600">데이터를 불러오지 못했습니다: {error}</p> : null}
      <div className="overflow-x-auto rounded border border-gray-light bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              {['ID', 'Email', 'Company', 'Tier', 'Verified', 'Action', 'Delete'].map((h) => (
                <th key={h} className="p-2 text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-2">{u.id}</td>
                <td className="p-2">{u.email}</td>
                <td className="p-2">{u.company_name}</td>
                <td className="p-2">{u.membership_tier}</td>
                <td className="p-2">{u.email_verified ? 'Yes' : 'No'}</td>
                <td className="p-2">
                  {u.membership_tier === 'verified' ? (
                    <button
                      type="button"
                      className="text-sky hover:underline"
                      onClick={() => void handleTier(u, 'general')}
                    >
                      Revoke
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="text-sky hover:underline"
                      onClick={() => void handleTier(u, 'verified')}
                    >
                      Approve
                    </button>
                  )}
                </td>
                <td className="p-2">
                  <button
                    type="button"
                    className="text-red-600 hover:underline"
                    onClick={() => void handleDelete(u)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-mid">검색 결과가 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
