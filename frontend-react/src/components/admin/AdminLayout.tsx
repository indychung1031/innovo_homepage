import { Link, NavLink, Outlet } from 'react-router-dom';

import { useAdminAuth } from '@/features/admin/AdminAuthContext';

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'font-semibold' : 'opacity-80 hover:opacity-100';

export function AdminLayout() {
  const { logout } = useAdminAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex gap-4 bg-navy px-4 py-3 text-sm text-white">
        <NavLink to="/admin/dashboard" className={navClass}>
          Dashboard
        </NavLink>
        <NavLink to="/admin/quotes" className={navClass}>
          Quotes
        </NavLink>
        <NavLink to="/admin/wizard-quotes" className={navClass}>
          Wizard Quotes
        </NavLink>
        <NavLink to="/admin/contacts" className={navClass}>
          Contacts
        </NavLink>
        <NavLink to="/admin/users" className={navClass}>
          Users
        </NavLink>
        <button type="button" className="ml-auto opacity-80 hover:opacity-100" onClick={logout}>
          Logout
        </button>
      </header>
      <main className="mx-auto max-w-6xl p-4">
        <Outlet />
      </main>
      <footer className="px-4 py-6 text-center text-xs text-gray-mid">
        <Link to="/en/" className="text-sky hover:underline">
          ← Public site
        </Link>
      </footer>
    </div>
  );
}
