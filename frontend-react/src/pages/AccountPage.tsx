import { useEffect, useState, type FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  changePassword,
  deleteAccount,
  getCatalogDownloadUrl,
  getMyQuotes,
  getWizardQuoteHistory,
  updateProfile,
  type QuoteItem,
  type QuoteStatus,
  type QuotesPage,
} from '@/api/account';
import { FormAlert } from '@/components/forms/FormAlert';
import { inputClassName } from '@/components/forms/PrivacyConsent';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useAuth } from '@/features/auth/AuthContext';
import { isLangCode, type LangCode, withLang } from '@/lib/lang';
import catalogsData from '@content/catalogs.json';

type TabId = 'profile' | 'quotes' | 'catalogs';
type CatalogEntry = { id: string; name_ko: string; name_en: string; type: string };
const CATALOGS = catalogsData as CatalogEntry[];

const STATUS_STYLES: Record<QuoteStatus, string> = {
  pending: 'bg-slate-200 text-slate-700',
  reviewing: 'bg-blue-100 text-blue-700',
  quoted: 'bg-green-100 text-green-700',
  completed: 'bg-navy/10 text-navy',
  expired: 'bg-red-100 text-red-700',
};

function buildReorderUrl(lang: LangCode, item: QuoteItem): string {
  const params = new URLSearchParams({
    ic_package_type: item.ic_package_type,
    pin_count: String(item.pin_count ?? ''),
    pitch: item.pitch ?? '',
    package_d: String(item.package_d ?? ''),
    package_e: String(item.package_e ?? ''),
  });
  if (item.ic_type) params.set('ic_type', item.ic_type);
  if (item.ic_code) params.set('ic_code', item.ic_code);
  return withLang(lang, `/quote?${params.toString()}`);
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

// ────────────────────────────────────────────────────────────
// Profile Tab
// ────────────────────────────────────────────────────────────
function ProfileTab() {
  const { user, refresh, logout } = useAuth();
  const { lang: langParam } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';
  const navigate = useNavigate();
  const { t } = useTranslation(['account', 'common']);

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [companyName, setCompanyName] = useState(user?.company_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [profileAlert, setProfileAlert] = useState<{ variant: 'success' | 'error'; message: string } | null>(null);

  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdAlert, setPwdAlert] = useState<{ variant: 'success' | 'error'; message: string } | null>(null);

  const [deleting, setDeleting] = useState(false);
  const [deleteAlert, setDeleteAlert] = useState<{ variant: 'success' | 'error'; message: string } | null>(null);

  if (!user) return null;

  const isVerified = user.membership_tier === 'verified';

  async function handleProfileSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setProfileAlert(null);
    try {
      await updateProfile({
        full_name: fullName.trim(),
        company_name: companyName.trim(),
        phone: phone.trim() || undefined,
      });
      await refresh();
      setEditing(false);
      setProfileAlert({ variant: 'success', message: t('account:profile.save_success') });
    } catch (err) {
      setProfileAlert({ variant: 'error', message: err instanceof Error ? err.message : 'Error' });
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    setPwdSaving(true);
    setPwdAlert(null);
    try {
      const msg = await changePassword({
        current_password: curPwd,
        new_password: newPwd,
        confirm_password: confirmPwd,
      });
      setPwdAlert({ variant: 'success', message: msg || t('account:password.success') });
      setCurPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (err) {
      setPwdAlert({ variant: 'error', message: err instanceof Error ? err.message : 'Error' });
    } finally {
      setPwdSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (!window.confirm(t('account:delete_account.confirm_prompt'))) return;
    setDeleting(true);
    setDeleteAlert(null);
    try {
      await deleteAccount();
      await logout();
      navigate(withLang(lang, '/'));
    } catch (err) {
      setDeleteAlert({ variant: 'error', message: err instanceof Error ? err.message : 'Error' });
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 계정 정보 */}
      <div className="rounded-lg border border-gray-light p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-navy">{t('account:profile.heading')}</h2>
          {!editing && (
            <button
              type="button"
              onClick={() => {
                setFullName(user.full_name);
                setCompanyName(user.company_name);
                setPhone(user.phone ?? '');
                setEditing(true);
              }}
              className="text-sm text-sky hover:underline"
            >
              {t('account:profile.edit')}
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleProfileSave} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('account:profile.full_name')}</label>
              <input
                type="text"
                required
                maxLength={50}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('account:profile.company_name')}</label>
              <input
                type="text"
                required
                maxLength={100}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('account:profile.phone')}</label>
              <input
                type="tel"
                maxLength={30}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClassName}
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="rounded bg-navy px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t('account:profile.save')}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded border border-gray-light px-4 py-2 text-sm text-charcoal hover:bg-slate-50"
              >
                {t('account:profile.cancel')}
              </button>
            </div>
          </form>
        ) : (
          <dl className="space-y-3 text-sm">
            <Row label={t('account:profile.email')} value={user.email} />
            <Row label={t('account:profile.full_name')} value={user.full_name} />
            <Row label={t('account:profile.company_name')} value={user.company_name} />
            {user.phone && <Row label={t('account:profile.phone')} value={user.phone} />}
            {user.created_at && <Row label={t('account:profile.created_at')} value={formatDate(user.created_at)} />}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-gray-mid">{t('account:profile.tier')}:</span>
              {isVerified ? (
                <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                  ✅ {t('account:profile.tier_verified')}
                </span>
              ) : (
                <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                  {t('account:profile.tier_general')}
                </span>
              )}
            </div>
          </dl>
        )}

        {profileAlert && <div className="mt-4"><FormAlert variant={profileAlert.variant} message={profileAlert.message} /></div>}

        {!editing && !isVerified && (
          <p className="mt-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {t('account:profile.tier_notice')}{' '}
            <Link to={withLang(lang, '/contact')} className="font-medium text-sky hover:underline">
              {t('common:nav.contact')}
            </Link>
          </p>
        )}
      </div>

      {/* 비밀번호 변경 */}
      <div className="rounded-lg border border-gray-light p-6">
        <h2 className="mb-4 font-semibold text-navy">{t('account:password.heading')}</h2>
        <form onSubmit={handlePasswordChange} className="max-w-sm space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">{t('account:password.current')}</label>
            <input
              type="password"
              required
              value={curPwd}
              onChange={(e) => setCurPwd(e.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('account:password.new')}</label>
            <input
              type="password"
              required
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('account:password.confirm')}</label>
            <input
              type="password"
              required
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              className={inputClassName}
            />
          </div>
          <button
            type="submit"
            disabled={pwdSaving}
            className="rounded bg-navy px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t('account:password.submit')}
          </button>
        </form>
        {pwdAlert && <div className="mt-4 max-w-sm"><FormAlert variant={pwdAlert.variant} message={pwdAlert.message} /></div>}
      </div>

      {/* 회원 탈퇴 */}
      <div className="rounded-lg border border-red-200 p-6">
        <h2 className="mb-2 font-semibold text-red-700">{t('account:delete_account.heading')}</h2>
        <p className="mb-4 text-sm text-gray-mid">{t('account:delete_account.warning')}</p>
        <button
          type="button"
          disabled={deleting}
          onClick={handleDeleteAccount}
          className="rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t('account:delete_account.submit')}
        </button>
        {deleteAlert && <div className="mt-4"><FormAlert variant={deleteAlert.variant} message={deleteAlert.message} /></div>}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Quotes Tab
// ────────────────────────────────────────────────────────────
function QuotesTab() {
  const { lang: langParam } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';
  const { t } = useTranslation('account');

  const [data, setData] = useState<QuotesPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await getMyQuotes(page);
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error');
      } finally {
        setLoading(false);
      }
    })();
  }, [page]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-slate-100" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  const quickQuoteItems = data ? data.items.filter((item) => !item.source || item.source === 'quick_quote') : [];
  const totalPages = data ? Math.ceil(data.total / data.size) : 0;

  if (!data || quickQuoteItems.length === 0) {
    return (
      <div>
        <div className="py-10 text-center">
          <p className="mb-4 text-gray-mid">{t('account:quotes.empty')}</p>
          <Link
            to={withLang(lang, '/quote')}
            className="inline-flex rounded bg-sky px-5 py-2 text-sm font-medium text-white hover:opacity-95"
          >
            {t('account:quotes.empty_cta')}
          </Link>
        </div>
        <WizardQuotesSection />
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-gray-light">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-gray-mid">
            <tr>
              <th className="px-4 py-3">{t('account:quotes.col_id')}</th>
              <th className="px-4 py-3">{t('account:quotes.col_package')}</th>
              <th className="px-4 py-3">{t('account:quotes.col_size')}</th>
              <th className="px-4 py-3">{t('account:quotes.col_pins')}</th>
              <th className="px-4 py-3">{t('account:quotes.col_qty')}</th>
              <th className="px-4 py-3">{t('account:quotes.col_date')}</th>
              <th className="px-4 py-3">{t('account:quotes.col_status')}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-light">
            {quickQuoteItems.map((item) => (
              <tr key={`${item.source ?? 'quick_quote'}_${item.id}`} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-gray-mid">{item.id}</td>
                <td className="px-4 py-3 font-medium">{item.ic_package_type}</td>
                <td className="px-4 py-3">{item.package_d ?? '—'} × {item.package_e ?? '—'}</td>
                <td className="px-4 py-3">{item.pin_count ?? '—'}</td>
                <td className="px-4 py-3">{item.quantity ?? '—'}</td>
                <td className="px-4 py-3">{formatDate(item.created_at)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[item.status]}`}>
                    {t(`account:quotes.status.${item.status}`)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={buildReorderUrl(lang, item)}
                    className="text-xs font-medium text-sky hover:underline"
                  >
                    {t('account:quotes.reorder')}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-1 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded border border-gray-light px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              className={`rounded border px-3 py-1 ${p === page ? 'border-navy bg-navy text-white' : 'border-gray-light hover:bg-slate-50'}`}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-gray-light px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ›
          </button>
        </div>
      )}

      <WizardQuotesSection />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Wizard Quotes Section (QuotesTab 하단)
// ────────────────────────────────────────────────────────────
function WizardQuotesSection() {
  const { lang: langParam } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    void (async () => {
      try {
        const data = await getWizardQuoteHistory();
        setItems(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="h-10 animate-pulse rounded bg-slate-100" />;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-navy">Wizard Quote 견적 이력</h3>
        <Link
          to={withLang(lang, '/quote/wizard')}
          className="text-sm font-medium text-sky hover:underline"
        >
          새 견적 요청 →
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-mid">견적 위저드 제출 이력이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-light">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-gray-mid">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">IC Code</th>
                <th className="px-4 py-3">Package</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-light">
              {items.map((item) => (
                <tr key={`${item.source ?? 'wizard'}_${item.id}`} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-gray-mid">{item.id}</td>
                  <td className="px-4 py-3 font-medium">{item.ic_code ?? '—'}</td>
                  <td className="px-4 py-3">{item.ic_package_type ?? '—'}</td>
                  <td className="px-4 py-3">{item.quantity ?? '—'} pcs</td>
                  <td className="px-4 py-3">
                    {item.total_price
                      ? `${item.total_price.toLocaleString()} ${item.currency ?? 'KRW'}`
                      : <span className="text-gray-mid">담당자 확인 후 안내</span>}
                  </td>
                  <td className="px-4 py-3">{formatDate(item.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[item.status]}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Catalogs Tab
// ────────────────────────────────────────────────────────────
function CatalogsTab() {
  const { user } = useAuth();
  const { lang: langParam } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';
  const { t } = useTranslation(['account', 'common']);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [dlError, setDlError] = useState<string | null>(null);

  const isVerified = user?.membership_tier === 'verified';

  if (!isVerified) {
    return (
      <div className="rounded-lg border border-gray-light p-8 text-center">
        <p className="mb-2 font-medium">{t('account:catalogs.verified_only')}</p>
        <p className="mb-4 text-sm text-gray-mid">{t('account:catalogs.contact_prompt')}</p>
        <Link
          to={withLang(lang, '/contact')}
          className="inline-flex rounded bg-navy px-5 py-2 text-sm font-medium text-white hover:opacity-95"
        >
          {t('common:nav.contact')}
        </Link>
      </div>
    );
  }

  async function handleDownload(fileId: string) {
    setDownloading(fileId);
    setDlError(null);
    try {
      const url = await getCatalogDownloadUrl(fileId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setDlError(err instanceof Error ? err.message : 'Error');
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-gray-light">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-gray-mid">
            <tr>
              <th className="px-5 py-3">File</th>
              <th className="px-5 py-3">{t('account:catalogs.file_type')}</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-light">
            {CATALOGS.map((cat) => (
              <tr key={cat.id} className="hover:bg-slate-50">
                <td className="px-5 py-4 font-medium">
                  {lang === 'ko' ? cat.name_ko : cat.name_en}
                </td>
                <td className="px-5 py-4 text-gray-mid">{cat.type}</td>
                <td className="px-5 py-4">
                  <button
                    type="button"
                    disabled={downloading === cat.id}
                    onClick={() => void handleDownload(cat.id)}
                    className="text-xs font-medium text-sky hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {downloading === cat.id ? '…' : t('account:catalogs.download')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {dlError && <p className="mt-3 text-sm text-red-600">{dlError}</p>}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 공통 헬퍼
// ────────────────────────────────────────────────────────────
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 text-gray-mid">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// AccountPage (메인)
// ────────────────────────────────────────────────────────────
export function AccountPage() {
  const { t } = useTranslation(['account', 'common']);
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = (searchParams.get('tab') as TabId) || 'profile';

  function setTab(tab: TabId) {
    setSearchParams(tab === 'profile' ? {} : { tab });
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'profile', label: t('account:tabs.profile') },
    { id: 'quotes', label: t('account:tabs.quotes') },
    { id: 'catalogs', label: t('account:tabs.catalogs') },
  ];

  return (
    <>
      <Helmet>
        <title>{t('account:meta.title')} | Innovo Solution</title>
      </Helmet>

      <section className="border-b border-gray-light bg-white py-10">
        <div className="mx-auto max-w-4xl px-4">
          <Breadcrumb items={[{ label: t('account:breadcrumb') }]} />
          <h1 className="mb-6 text-3xl font-bold">{t('account:breadcrumb')}</h1>
          <nav className="flex gap-1" aria-label="account tabs">
            {tabs.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-t px-5 py-2 text-sm font-medium transition-colors ${
                  activeTab === id
                    ? 'bg-white border border-b-white border-gray-light text-navy'
                    : 'text-gray-mid hover:text-charcoal'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-4xl px-4">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'quotes' && <QuotesTab />}
          {activeTab === 'catalogs' && <CatalogsTab />}
        </div>
      </section>
    </>
  );
}
