import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import {
  fetchCoverTypes,
  fetchIcPackageTypes,
  fetchMaterialTypes,
  fetchSocketTypes,
  postQuoteEstimate,
  submitWizardQuote,
} from '@/api/erp';
import { FormAlert } from '@/components/forms/FormAlert';
import { inputClassName } from '@/components/forms/PrivacyConsent';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { formatKrw } from '@/features/quote-wizard/formatKrw';
import { recommendSocketType } from '@/features/quote-wizard/recommendSocket';
import { MOCK_SOCKET_TYPES } from '@/features/quote-wizard/mockErp';
import { clearWizardDraft, loadWizardDraft, saveWizardDraft } from '@/features/quote-wizard/storage';
import { WizardStepper } from '@/features/quote-wizard/WizardStepper';
import {
  EMPTY_DRAFT,
  type MasterOption,
  type ProductSeries,
  type SocketTypeOption,
  type WizardDraft,
} from '@/features/quote-wizard/types';
import { useAuth } from '@/features/auth/AuthContext';
import { isLangCode, type LangCode, withLang } from '@/lib/lang';

const SERIES_OPTIONS: ProductSeries[] = ['test_socket', 'probe_pin', 'test_jig'];
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export function QuoteWizardPage() {
  const { lang: langParam } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';
  const { t } = useTranslation('wizard');
  const { user } = useAuth();

  const [draft, setDraft] = useState<WizardDraft>(() =>
    user ? loadWizardDraft(user.id, lang) : loadWizardDraft(0, lang),
  );
  const [socketTypes, setSocketTypes] = useState<SocketTypeOption[]>([]);
  const [icPackages, setIcPackages] = useState<MasterOption[]>([]);
  const [coverTypes, setCoverTypes] = useState<MasterOption[]>([]);
  const [materialTypes, setMaterialTypes] = useState<MasterOption[]>([]);
  const [mastersLoading, setMastersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [draftHint, setDraftHint] = useState(false);

  const membershipTier = user?.membership_tier ?? 'general';
  const isVerified = membershipTier === 'verified';

  useEffect(() => {
    if (!user) {
      return;
    }
    setDraft((prev) => ({
      ...loadWizardDraft(user.id, lang),
      contact_name: prev.contact_name || user.full_name,
      contact_company: prev.contact_company || user.company_name,
      contact_email: prev.contact_email || user.email,
      contact_phone: prev.contact_phone || '',
    }));
  }, [user, lang]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setMastersLoading(true);
      try {
        const [sockets, packages, covers, materials] = await Promise.all([
          fetchSocketTypes(),
          fetchIcPackageTypes(),
          fetchMaterialTypes(),
          fetchCoverTypes(),
        ]);
        if (!cancelled) {
          setSocketTypes(sockets);
          setIcPackages(packages);
          setCoverTypes(covers);
          setMaterialTypes(materials);
        }
      } finally {
        if (!cancelled) {
          setMastersLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(
    (next: WizardDraft) => {
      setDraft(next);
      if (user) {
        saveWizardDraft(user.id, lang, next);
        setDraftHint(true);
        window.setTimeout(() => setDraftHint(false), 2000);
      }
    },
    [user, lang],
  );

  const recommended = useMemo(() => {
    if (draft.series !== 'test_socket') {
      return null;
    }
    const d = parseFloat(draft.dimension_d);
    const e = parseFloat(draft.dimension_e);
    if (!Number.isFinite(d) || !Number.isFinite(e)) {
      return null;
    }
    const tolD = parseFloat(draft.tolerance_d) || 0;
    const tolE = parseFloat(draft.tolerance_e) || 0;
    const pool = socketTypes.length ? socketTypes : MOCK_SOCKET_TYPES;
    return recommendSocketType(pool, d, e, tolD, tolE);
  }, [draft, socketTypes]);

  function patch(partial: Partial<WizardDraft>) {
    persist({ ...draft, ...partial });
  }

  function validateStep1(): boolean {
    if (!draft.ic_type.trim() || !draft.ic_code.trim() || !draft.ic_package_code) {
      return false;
    }
    const d = parseFloat(draft.dimension_d);
    const e = parseFloat(draft.dimension_e);
    const a = parseFloat(draft.dimension_a);
    const pins = parseInt(draft.pin_count, 10);
    if (!Number.isFinite(d) || !Number.isFinite(e) || !Number.isFinite(a) || !Number.isFinite(pins)) {
      return false;
    }
    if (!draft.pitch.trim()) {
      return false;
    }
    if (draft.series === 'test_socket' && !draft.socket_type_id) {
      return false;
    }
    return true;
  }

  function validateStep2(): boolean {
    const qty = parseInt(draft.quantity, 10);
    if (!Number.isFinite(qty) || qty < 1) {
      return false;
    }
    if (draft.series === 'test_socket') {
      return draft.cover_type_id != null && draft.material_type_id != null;
    }
    return true;
  }

  async function goToStep3() {
    setError(null);
    if (!validateStep2()) {
      setError(t('errors.required'));
      return;
    }

    if (draft.series !== 'test_socket') {
      patch({
        step: 3,
        estimate: {
          matched: false,
          unit_price: 0,
          currency: 'KRW',
          quantity: parseInt(draft.quantity, 10) || 1,
          total_price: 0,
          lead_time_label: lang === 'ko' ? '담당자 확인 후 안내' : 'To be confirmed by sales',
        },
      });
      return;
    }

    try {
      const estimate = await postQuoteEstimate(
        {
          socket_type_id: draft.socket_type_id!,
          material_type_id: draft.material_type_id!,
          cover_type_id: draft.cover_type_id!,
          pin_count: parseInt(draft.pin_count, 10),
          quantity: parseInt(draft.quantity, 10),
        },
        draft,
        membershipTier,
      );
      patch({ step: 3, estimate });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!draft.estimate || !user) {
      return;
    }
    if (!draft.contact_name.trim() || !draft.contact_company.trim() || !draft.contact_email.trim()) {
      setError(t('errors.required'));
      return;
    }

    setSubmitting(true);
    try {
      await submitWizardQuote({
        lang,
        series: draft.series,
        ic_type: draft.ic_type.trim(),
        ic_code: draft.ic_code.trim(),
        ic_package_code: draft.ic_package_code,
        dimension_d: parseFloat(draft.dimension_d),
        dimension_e: parseFloat(draft.dimension_e),
        dimension_a: parseFloat(draft.dimension_a),
        pitch: draft.pitch.trim(),
        pin_count: parseInt(draft.pin_count, 10),
        socket_type_id: draft.socket_type_id,
        socket_type_name: draft.socket_type_name,
        quantity: parseInt(draft.quantity, 10),
        cover_type_id: draft.cover_type_id,
        material_type_id: draft.material_type_id,
        spec_notes: draft.spec_notes.trim(),
        estimate: draft.estimate,
        contact_name: draft.contact_name.trim(),
        contact_company: draft.contact_company.trim(),
        contact_email: draft.contact_email.trim(),
        contact_phone: draft.contact_phone.trim(),
      });
      if (user) {
        clearWizardDraft(user.id, lang);
      }
      patch({ step: 'complete' });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.submit_failed'));
    } finally {
      setSubmitting(false);
    }
  }

  function seriesLabel(series: ProductSeries): string {
    return t(`step1.series_${series}`);
  }

  if (draft.step === 'complete') {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16">
        <Helmet>
          <title>{t('meta.title')} | Innovo Solution</title>
        </Helmet>
        <h1 className="mb-4 text-2xl font-bold">{t('complete.heading')}</h1>
        <p className="text-gray-mid">{t('complete.message')}</p>
        <div className="mt-8 flex flex-wrap gap-4">
          <button
            type="button"
            className="rounded bg-navy px-4 py-2 text-white"
            onClick={() => {
              const fresh: WizardDraft = {
                ...EMPTY_DRAFT,
                contact_name: user!.full_name,
                contact_company: user!.company_name,
                contact_email: user!.email,
              };
              persist(fresh);
            }}
          >
            {t('complete.new_quote')}
          </button>
          <Link to={withLang(lang, '/')} className="text-sky underline">
            {t('complete.home')}
          </Link>
        </div>
      </section>
    );
  }

  const step = draft.step as 1 | 2 | 3 | 4;

  return (
    <section className="mx-auto max-w-2xl px-4 py-16">
      <Helmet>
        <title>{t('meta.title')} | Innovo Solution</title>
      </Helmet>
      <Breadcrumb items={[{ label: t('meta.breadcrumb') }]} />
      <h1 className="mb-2 text-2xl font-bold">{t('meta.title')}</h1>
      <p className="mb-4 text-sm text-amber-700">{t('step1.multi_product')}</p>
      {draftHint ? <p className="mb-2 text-xs text-gray-mid">{t('nav.draft_saved')}</p> : null}

      <WizardStepper current={step} />
      {error ? <FormAlert variant="error" message={error} /> : null}

      {step === 1 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">{t('step1.heading')}</h2>
          <fieldset className="space-y-3" disabled={mastersLoading}>
            <label className="block text-sm font-medium">{t('step1.series')}</label>
            <select
              className={inputClassName}
              value={draft.series}
              onChange={(e) => patch({ series: e.target.value as ProductSeries, socket_type_id: null })}
            >
              {SERIES_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {seriesLabel(s)}
                </option>
              ))}
            </select>

            {draft.series !== 'test_socket' ? (
              <p className="rounded bg-amber-50 p-3 text-sm text-amber-900">{t('step1.manual_only')}</p>
            ) : null}

            <input
              className={inputClassName}
              placeholder={t('step1.ic_type_placeholder')}
              value={draft.ic_type}
              onChange={(e) => patch({ ic_type: e.target.value })}
              required
            />
            <input
              className={inputClassName}
              placeholder={t('step1.ic_code')}
              value={draft.ic_code}
              onChange={(e) => patch({ ic_code: e.target.value })}
              required
            />
            <select
              className={inputClassName}
              value={draft.ic_package_code}
              onChange={(e) => {
                const pkg = icPackages.find((p) => p.code === e.target.value);
                patch({
                  ic_package_code: e.target.value,
                  ic_package_type_id: pkg?.id ?? null,
                });
              }}
              required
            >
              <option value="">{t('step1.ic_package')}</option>
              {icPackages.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.display_name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                step="0.001"
                min="0"
                className={inputClassName}
                placeholder={t('step1.dimension_d')}
                value={draft.dimension_d}
                onChange={(e) => patch({ dimension_d: e.target.value })}
                required
              />
              <input
                type="number"
                step="0.001"
                min="0"
                className={inputClassName}
                placeholder={t('step1.dimension_e')}
                value={draft.dimension_e}
                onChange={(e) => patch({ dimension_e: e.target.value })}
                required
              />
            </div>
            <input
              type="number"
              step="0.001"
              min="0"
              className={inputClassName}
              placeholder={t('step1.dimension_a')}
              value={draft.dimension_a}
              onChange={(e) => patch({ dimension_a: e.target.value })}
              required
            />
            <input
              className={inputClassName}
              placeholder={t('step1.pitch')}
              value={draft.pitch}
              onChange={(e) => patch({ pitch: e.target.value })}
              required
            />
            <input
              type="number"
              min="1"
              className={inputClassName}
              placeholder={t('step1.pin_count')}
              value={draft.pin_count}
              onChange={(e) => patch({ pin_count: e.target.value })}
              required
            />

            {draft.series === 'test_socket' && recommended ? (
              <p className="rounded bg-slate-50 p-3 text-sm">
                <span className="font-medium">{t('step1.recommended')}: </span>
                {recommended.type_name}
              </p>
            ) : null}
            {draft.series === 'test_socket' && draft.dimension_d && draft.dimension_e && !recommended ? (
              <p className="text-sm text-red-700">{t('step1.no_recommend')}</p>
            ) : null}
          </fieldset>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              className="rounded bg-navy px-6 py-2 text-white"
              onClick={() => {
                if (!validateStep1()) {
                  setError(t('errors.required'));
                  return;
                }
                setError(null);
                patch({
                  step: 2,
                  socket_type_id: recommended?.socket_type_id ?? null,
                  socket_type_name: recommended?.type_name ?? '',
                });
              }}
            >
              {t('nav.next')}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">{t('step2.heading')}</h2>
          <fieldset className="space-y-3">
            <input
              type="number"
              min="1"
              className={inputClassName}
              placeholder={t('step2.quantity')}
              value={draft.quantity}
              onChange={(e) => patch({ quantity: e.target.value })}
              required
            />
            {draft.series === 'test_socket' ? (
              <>
                <select
                  className={inputClassName}
                  value={draft.cover_type_id ?? ''}
                  onChange={(e) =>
                    patch({ cover_type_id: e.target.value ? parseInt(e.target.value, 10) : null })
                  }
                  required
                >
                  <option value="">{t('step2.cover_type')}</option>
                  {coverTypes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.display_name}
                    </option>
                  ))}
                </select>
                <select
                  className={inputClassName}
                  value={draft.material_type_id ?? ''}
                  onChange={(e) =>
                    patch({ material_type_id: e.target.value ? parseInt(e.target.value, 10) : null })
                  }
                  required
                >
                  <option value="">{t('step2.material_type')}</option>
                  {materialTypes.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.display_name}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
            <p className="text-sm text-gray-mid">{t('step2.dynamic_placeholder')}</p>
            <textarea
              className={inputClassName}
              rows={3}
              placeholder={t('step2.spec_notes')}
              value={draft.spec_notes}
              onChange={(e) => patch({ spec_notes: e.target.value })}
            />
            <div>
              <label className="mb-1 block text-sm font-medium">{t('step2.attachment')}</label>
              <input
                type="file"
                accept=".dxf,.pdf,.step,.stp,.zip"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && file.size > MAX_ATTACHMENT_BYTES) {
                    setError(lang === 'ko' ? '파일은 10MB 이하여야 합니다.' : 'File must be 10MB or less.');
                    return;
                  }
                  patch({ attachment_name: file?.name ?? '' });
                }}
              />
              <p className="mt-1 text-xs text-gray-mid">{t('step2.attachment_hint')}</p>
              {draft.attachment_name ? (
                <p className="text-sm text-charcoal">{draft.attachment_name}</p>
              ) : null}
            </div>
          </fieldset>
          <div className="mt-6 flex justify-between">
            <button type="button" className="text-sky" onClick={() => patch({ step: 1 })}>
              {t('nav.back')}
            </button>
            <button type="button" className="rounded bg-navy px-6 py-2 text-white" onClick={() => void goToStep3()}>
              {t('nav.next')}
            </button>
          </div>
        </div>
      )}

      {step === 3 && draft.estimate && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">{t('step3.heading')}</h2>
          <div className="space-y-2 rounded border border-gray-light bg-slate-50 p-4 text-sm">
            <p>
              <span className="font-medium">{t('step3.product_line')}: </span>
              {seriesLabel(draft.series)}
              {draft.socket_type_name ? ` — ${draft.socket_type_name}` : ''}
            </p>
            <p>
              <span className="font-medium">{t('step3.quantity')}: </span>
              {draft.estimate.quantity} pcs
            </p>
            {draft.estimate.matched ? (
              <>
                <p>
                  <span className="font-medium">{t('step3.unit_price')}: </span>
                  {formatKrw(draft.estimate.unit_price, lang)}
                </p>
                <p className="text-lg font-bold text-navy">
                  {t('step3.total_price')}: {formatKrw(draft.estimate.total_price, lang)}
                </p>
              </>
            ) : (
              <p className="text-amber-800">{t('step3.no_match')}</p>
            )}
            <p>
              <span className="font-medium">{t('step3.lead_time')}: </span>
              {draft.estimate.lead_time_label ?? '—'}
            </p>
            <p>
              <span className="font-medium">{t('step3.payment_terms')}: </span>
              {isVerified ? t('step3.payment_verified') : t('step3.payment_general')}
            </p>
            <p className="text-gray-mid">{t('step3.validity')}</p>
            <p className="border-t border-gray-light pt-2 text-xs text-gray-mid">{t('step3.disclaimer')}</p>
          </div>
          <div className="mt-6 flex justify-between">
            <button type="button" className="text-sky" onClick={() => patch({ step: 2 })}>
              {t('step3.back_edit')}
            </button>
            <button type="button" className="rounded bg-navy px-6 py-2 text-white" onClick={() => patch({ step: 4 })}>
              {t('step3.continue')}
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">{t('step4.heading')}</h2>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <p className="text-sm font-medium text-gray-mid">{t('step4.contact_info')}</p>
            <input
              className={inputClassName}
              placeholder={t('step4.full_name')}
              value={draft.contact_name}
              onChange={(e) => patch({ contact_name: e.target.value })}
              required
            />
            <input
              className={inputClassName}
              placeholder={t('step4.company_name')}
              value={draft.contact_company}
              onChange={(e) => patch({ contact_company: e.target.value })}
              required
            />
            <input
              type="email"
              className={inputClassName}
              placeholder={t('step4.email')}
              value={draft.contact_email}
              onChange={(e) => patch({ contact_email: e.target.value })}
              required
            />
            <input
              type="tel"
              className={inputClassName}
              placeholder={t('step4.phone')}
              value={draft.contact_phone}
              onChange={(e) => patch({ contact_phone: e.target.value })}
            />
            <div className="mt-6 flex justify-between">
              <button type="button" className="text-sky" onClick={() => patch({ step: 3 })}>
                {t('nav.back')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded bg-navy px-6 py-2 text-white disabled:opacity-60"
              >
                {submitting ? t('step4.submitting') : t('step4.submit')}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
