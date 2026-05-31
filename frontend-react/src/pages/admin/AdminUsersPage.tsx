import { useCallback, useEffect, useState } from 'react';

import { deleteUser, listUsers, patchUserMembership, type UserRow } from '@/api/admin';

export function AdminUsersPage() {
  const [items, setItems] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listUsers();
      setItems(data.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleTier(user: UserRow, tier: string) {
    await patchUserMembership(user.id, tier);
    await load();
  }

  async function handleDelete(user: UserRow) {
    const ok = window.confirm(
      `${user.email} 계정을 삭제하시겠습니까?\n견적 기록은 익명화 후 보존됩니다.`,
    );
    if (!ok) {
      return;
    }
    await deleteUser(user.id);
    await load();
  }

  return (
    <>
      <h1 className="mb-4 text-xl font-bold">Members</h1>
      {loading ? <p className="text-gray-mid">Loading…</p> : null}
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
            {items.map((u) => (
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
          </tbody>
        </table>
      </div>
    </>
  );
}
