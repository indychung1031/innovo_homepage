import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { fetchPins, type PinSpec } from '@/api/erp';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { isLangCode, type LangCode, withLang } from '@/lib/lang';
import { displayPinName, formatSpec } from '@/lib/products/pinSpecFormat';

type FilterField =
  | 'total_length'
  | 'top_plunger_shape'
  | 'bottom_plunger_shape'
  | 'spring_force'
  | 'current_continuous'
  | 'resistance'
  | 'bandwidth3db';

const FILTER_CONFIG: { field: FilterField; labelKo: string; labelEn: string; numeric: boolean }[] = [
  { field: 'total_length', labelKo: '전체 길이 (mm)', labelEn: 'Total Length (mm)', numeric: true },
  { field: 'top_plunger_shape', labelKo: '상부 팁 형상', labelEn: 'Top Plunger Shape', numeric: false },
  { field: 'bottom_plunger_shape', labelKo: '하부 팁 형상', labelEn: 'Bottom Plunger Shape', numeric: false },
  { field: 'spring_force', labelKo: '하중 (g)', labelEn: 'Spring Force (g)', numeric: true },
  { field: 'current_continuous', labelKo: '정격전류 (A)', labelEn: 'Max Current (A)', numeric: true },
  { field: 'resistance', labelKo: '접촉저항', labelEn: 'Resistance', numeric: true },
  { field: 'bandwidth3db', labelKo: '대역폭 (GHz, -3dB)', labelEn: 'Bandwidth (GHz, -3dB)', numeric: true },
];

function buildFilterOptions(pins: PinSpec[], field: FilterField, numeric: boolean): string[] {
  const values = new Set<string>();
  pins.forEach((pin) => {
    const formatted = formatSpec(pin[field]);
    if (formatted !== '-') {
      values.add(formatted);
    }
  });
  const list = Array.from(values);
  list.sort((a, b) => (numeric ? parseFloat(a) - parseFloat(b) : a.localeCompare(b)));
  return list;
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-gray-light/60 py-1 last:border-0">
      <span className="text-gray-mid">{label}</span>
      <span className="font-medium text-navy">{value}</span>
    </div>
  );
}

export function ProbePinGeneralPage() {
  const { lang: langParam } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';
  const isKo = lang === 'ko';
  const navigate = useNavigate();

  const [pins, setPins] = useState<PinSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Partial<Record<FilterField, string>>>({});
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  function toggleSelected(pinId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(pinId)) {
        next.delete(pinId);
      } else {
        next.add(pinId);
      }
      return next;
    });
  }

  function handleInquirySelected() {
    const models = pins
      .filter((pin) => selectedIds.has(pin.pin_id))
      .map((pin) => pin.pin_name)
      .join(',');
    if (!models) {
      return;
    }
    navigate({
      pathname: withLang(lang, '/contact'),
      search: `?category=probe_pin&model=${encodeURIComponent(models)}`,
    });
  }

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchPins();
        setPins(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filterOptions = useMemo(
    () =>
      FILTER_CONFIG.map((config) => ({
        ...config,
        options: buildFilterOptions(pins, config.field, config.numeric),
      })),
    [pins],
  );

  const filteredPins = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pins.filter((pin) => {
      if (q && !displayPinName(pin.pin_name).toLowerCase().includes(q)) {
        return false;
      }
      return FILTER_CONFIG.every((config) => {
        const selected = filters[config.field];
        return !selected || formatSpec(pin[config.field]) === selected;
      });
    });
  }, [pins, query, filters]);

  const hasActiveFilter = query.trim() !== '' || Object.values(filters).some(Boolean);

  const title = 'General POGO Pin';
  const pageTitle = isKo ? `${title} | 이노보솔루션` : `${title} | Innovo Solution`;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>

      <section className="border-b border-gray-light bg-white py-12">
        <div className="mx-auto max-w-6xl px-4">
          <Breadcrumb
            items={[
              { label: 'Products', href: withLang(lang, '/products') },
              { label: 'Probe Pin', href: withLang(lang, '/products/probe-pin') },
              { label: title },
            ]}
          />
          <h1 className="mb-3 text-3xl font-bold">{title}</h1>
          <p className="max-w-2xl text-gray-mid">
            {isKo
              ? '다양한 피치·전류·팁 사양을 갖춘 표준 카탈로그 POGO 핀.'
              : 'Standard catalog POGO pins covering a wide range of pitches, currents, and tip configurations.'}
          </p>
        </div>
      </section>

      <section className="bg-slate-50 py-14">
        <div className="mx-auto max-w-6xl px-4">
          {loading && (
            <p className="py-8 text-center text-sm text-gray-mid">
              {isKo ? '모델 목록을 불러오는 중입니다...' : 'Loading model list...'}
            </p>
          )}

          {!loading && error && (
            <p className="mb-8 inline-block rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {isKo
                ? '스펙 데이터를 불러오지 못했습니다. 현재 카탈로그는 문의해 주세요.'
                : 'Unable to load specification data. Please contact us for the current catalog.'}
            </p>
          )}

          {!loading && !error && (
            <div className="mb-6 rounded-lg border border-gray-light bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={isKo ? '모델명으로 검색 (예: IVB-SAR-440)' : 'Search by model name (e.g. IVB-SAR-440)'}
                  className="w-full max-w-sm rounded border border-gray-light px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sky"
                />
                <span className="text-xs text-gray-mid">
                  {filteredPins.length} / {pins.length}
                </span>
                {hasActiveFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setFilters({});
                    }}
                    className="text-xs text-gray-mid underline hover:text-navy"
                  >
                    {isKo ? '필터 초기화' : 'Reset filters'}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {filterOptions.map((config) => (
                  <div key={config.field}>
                    <label className="mb-1 block text-xs text-gray-mid">
                      {isKo ? config.labelKo : config.labelEn}
                    </label>
                    <select
                      value={filters[config.field] ?? ''}
                      onChange={(e) =>
                        setFilters((prev) => {
                          const next = { ...prev };
                          if (e.target.value) {
                            next[config.field] = e.target.value;
                          } else {
                            delete next[config.field];
                          }
                          return next;
                        })
                      }
                      className="w-full rounded border border-gray-light px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky"
                    >
                      <option value="">{isKo ? '전체' : 'All'}</option>
                      {config.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && !error && filteredPins.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-mid">
              {isKo ? '검색 결과가 없습니다.' : 'No matching models.'}
            </p>
          )}

          {!loading && !error && filteredPins.length > 0 && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredPins.map((pin) => {
                const selected = selectedIds.has(pin.pin_id);
                return (
                <div
                  key={pin.pin_id}
                  className={`flex flex-col rounded-lg border bg-white p-4 ${selected ? 'border-navy ring-1 ring-navy' : 'border-gray-light'}`}
                >
                  <div className="mb-3 flex h-32 items-center justify-center overflow-hidden rounded bg-slate-50">
                    <img
                      src={`/upload/products/renders/probe_pin/${pin.pin_name}.png`}
                      alt={pin.pin_name}
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <span className="hidden text-xs text-gray-mid">
                      {isKo ? '이미지 준비 중' : 'Image coming soon'}
                    </span>
                  </div>

                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-navy">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleSelected(pin.pin_id)}
                      className="h-4 w-4 accent-navy"
                    />
                    <span className="truncate" title={displayPinName(pin.pin_name)}>
                      {displayPinName(pin.pin_name)}
                    </span>
                  </label>

                  <div className="mb-3 flex-1 text-xs">
                    <SpecRow label={isKo ? '전체 길이 (mm)' : 'Total Length (mm)'} value={formatSpec(pin.total_length)} />
                    <SpecRow label={isKo ? '풀 스트로크 (mm)' : 'Full Stroke (mm)'} value={formatSpec(pin.full_stroke)} />
                    <SpecRow
                      label={isKo ? '권장 스트로크 (mm)' : 'Recommended Stroke (mm)'}
                      value={formatSpec(pin.recommended_stroke)}
                    />
                    <SpecRow
                      label={isKo ? '상부 팁 형상' : 'Top Plunger Shape'}
                      value={formatSpec(pin.top_plunger_shape)}
                    />
                    <SpecRow
                      label={isKo ? '하부 팁 형상' : 'Bottom Plunger Shape'}
                      value={formatSpec(pin.bottom_plunger_shape)}
                    />
                    <SpecRow label={isKo ? '하중 (g)' : 'Spring Force (g)'} value={formatSpec(pin.spring_force)} />
                    <SpecRow
                      label={isKo ? '정격전류 (A)' : 'Max Current (A)'}
                      value={formatSpec(pin.current_continuous)}
                    />
                    <SpecRow label={isKo ? '접촉저항' : 'Resistance'} value={formatSpec(pin.resistance)} />
                    <SpecRow
                      label={isKo ? '대역폭 (GHz, -3dB)' : 'Bandwidth (GHz, -3dB)'}
                      value={formatSpec(pin.bandwidth3db)}
                    />
                  </div>
                </div>
                );
              })}
            </div>
          )}

          <div className="mt-10 flex gap-4">
            <Link
              to={withLang(lang, '/products/probe-pin')}
              className="text-sm text-gray-mid hover:text-navy"
            >
              ← {isKo ? 'Probe Pin 목록으로' : 'Back to Probe Pin'}
            </Link>
          </div>
        </div>
      </section>

      {selectedIds.size > 0 && (
        <div className="sticky bottom-0 z-10 border-t border-gray-light bg-white/95 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4">
            <span className="text-sm text-gray-mid">
              {isKo ? `${selectedIds.size}개 모델 선택됨` : `${selectedIds.size} model(s) selected`}
            </span>
            <button
              type="button"
              onClick={handleInquirySelected}
              className="inline-flex items-center justify-center rounded bg-navy px-5 py-2.5 text-sm font-medium text-white hover:opacity-95"
            >
              {isKo ? '선택된 제품으로 견적 문의' : 'Request a Quote for Selected'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
