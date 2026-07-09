import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { getCatalogDownloadUrl, getPublicDownloadUrl } from '@/api/account';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useAuth } from '@/features/auth/AuthContext';
import { isLangCode, type LangCode, withLang } from '@/lib/lang';

type FileId = 'iso9001_en' | 'iso9001_ko' | 'socket_list' | 'probe_pin_plunger';

type AccessMode = 'public' | 'members' | 'request';

type FileDef = {
  id: FileId;
  accessMode: AccessMode;
};

const FILES: FileDef[] = [
  { id: 'iso9001_en', accessMode: 'request' },
  { id: 'iso9001_ko', accessMode: 'request' },
  { id: 'socket_list', accessMode: 'members' },
  { id: 'probe_pin_plunger', accessMode: 'members' },
];

async function triggerDownload(fileId: FileId, isPublic: boolean): Promise<void> {
  const url = isPublic
    ? await getPublicDownloadUrl(fileId)
    : await getCatalogDownloadUrl(fileId);
  window.open(url, '_blank', 'noopener');
}

export function DownloadsPage() {
  const { lang: langParam } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';
  const { t } = useTranslation('downloads');
  const { user, status } = useAuth();

  const [loadingId, setLoadingId] = useState<FileId | null>(null);
  const [errorId, setErrorId] = useState<FileId | null>(null);

  const isVerified = user?.membership_tier === 'verified';
  const isLoading = status === 'loading';

  async function handleDownload(file: FileDef) {
    setLoadingId(file.id);
    setErrorId(null);
    try {
      await triggerDownload(file.id, file.accessMode === 'public');
    } catch {
      setErrorId(file.id);
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Helmet>
        <title>{t('title')} | Innovo Solution</title>
      </Helmet>
      <Breadcrumb items={[{ label: t('title') }]} />
      <h1 className="mb-2 text-3xl font-bold text-navy">{t('title')}</h1>
      <p className="mb-8 text-gray-mid">{t('subtitle')}</p>

      <div className="overflow-hidden rounded-lg border border-gray-light bg-white">
        {FILES.map((file, idx) => {
          const name = t(`files.${file.id}.name`);
          const format = t(`files.${file.id}.format`);
          const isThisLoading = loadingId === file.id;
          const hasError = errorId === file.id;

          let action: React.ReactNode;

          if (file.accessMode === 'request') {
            action = (
              <Link
                to={withLang(lang, '/contact')}
                className="rounded border border-gray-light px-4 py-1.5 text-sm text-gray-mid hover:border-navy hover:text-navy"
              >
                {t('request_action')}
              </Link>
            );
          } else if (file.accessMode === 'public') {
            action = (
              <button
                type="button"
                disabled={isThisLoading}
                onClick={() => void handleDownload(file)}
                className="rounded bg-navy px-4 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-60"
              >
                {isThisLoading ? '…' : t('download')}
              </button>
            );
          } else if (isLoading) {
            action = <span className="h-8 w-20 animate-pulse rounded bg-gray-200 inline-block" />;
          } else if (!user) {
            action = (
              <Link
                to={withLang(lang, '/login')}
                className="rounded border border-gray-light px-4 py-1.5 text-sm text-gray-mid hover:border-navy hover:text-navy"
              >
                {t('login_required')}
              </Link>
            );
          } else if (!isVerified) {
            action = (
              <span className="rounded border border-gray-light px-4 py-1.5 text-sm text-gray-mid cursor-not-allowed">
                {t('not_verified')}
              </span>
            );
          } else {
            action = (
              <button
                type="button"
                disabled={isThisLoading}
                onClick={() => void handleDownload(file)}
                className="rounded bg-navy px-4 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-60"
              >
                {isThisLoading ? '…' : t('download')}
              </button>
            );
          }

          return (
            <div
              key={file.id}
              className={`flex items-center justify-between gap-4 px-5 py-4 ${idx < FILES.length - 1 ? 'border-b border-gray-light' : ''}`}
            >
              <div className="min-w-0">
                <p className="font-medium text-charcoal truncate">{name}</p>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span className="text-gray-mid">{format}</span>
                  {file.accessMode === 'public' && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">
                      {t('public_badge')}
                    </span>
                  )}
                  {file.accessMode === 'members' && (
                    <span className="rounded-full bg-sky/10 px-2 py-0.5 text-sky">
                      {t('members_only_badge')}
                    </span>
                  )}
                  {file.accessMode === 'request' && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-gray-mid">
                      {t('request_only_badge')}
                    </span>
                  )}
                </div>
                {hasError && (
                  <p className="mt-1 text-xs text-red-600">
                    {lang === 'ko'
                      ? '다운로드에 실패했습니다. 다시 시도해주세요.'
                      : 'Download failed. Please try again.'}
                  </p>
                )}
              </div>
              <div className="shrink-0">{action}</div>
            </div>
          );
        })}
      </div>

      {!user && status !== 'loading' && (
        <p className="mt-6 text-sm text-gray-mid">
          {lang === 'ko'
            ? '카탈로그 다운로드는 인증회원에게 제공됩니다.'
            : 'Catalog downloads are available to verified members.'}{' '}
          <Link to={withLang(lang, '/register')} className="text-sky hover:underline">
            {t('sign_up')}
          </Link>
        </p>
      )}
    </div>
  );
}
