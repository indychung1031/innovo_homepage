import type { PinSpec } from '@/api/erp';

export function formatSpec(value: string | number | null): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  // ERP 부동소수점 저장값이 5.699999999999999처럼 나오는 경우가 있어 소수점 2자리로 정리
  return typeof value === 'number' ? value.toFixed(2) : value;
}

// ERP 데이터에 모델명 구분자가 "_"/"-"로 혼재되어 있어 표시용으로는 "-"로 통일
export function displayPinName(pinName: string): string {
  return pinName.replace(/_/g, '-');
}

export function buildPinInquiryBlock(pin: PinSpec, isKo: boolean): string {
  const lines = [
    `${isKo ? '모델명' : 'Model'}: ${displayPinName(pin.pin_name)}`,
    `${isKo ? '전체 길이 (mm)' : 'Total Length (mm)'}: ${formatSpec(pin.total_length)}`,
    `${isKo ? '풀 스트로크 (mm)' : 'Full Stroke (mm)'}: ${formatSpec(pin.full_stroke)}`,
    `${isKo ? '권장 스트로크 (mm)' : 'Recommended Stroke (mm)'}: ${formatSpec(pin.recommended_stroke)}`,
    `${isKo ? '상부 팁 형상' : 'Top Plunger Shape'}: ${formatSpec(pin.top_plunger_shape)}`,
    `${isKo ? '하부 팁 형상' : 'Bottom Plunger Shape'}: ${formatSpec(pin.bottom_plunger_shape)}`,
    `${isKo ? '하중 (g)' : 'Spring Force (g)'}: ${formatSpec(pin.spring_force)}`,
    `${isKo ? '정격전류 (A)' : 'Max Current (A)'}: ${formatSpec(pin.current_continuous)}`,
    `${isKo ? '접촉저항' : 'Resistance'}: ${formatSpec(pin.resistance)}`,
    `${isKo ? '대역폭 (GHz, -3dB)' : 'Bandwidth (GHz, -3dB)'}: ${formatSpec(pin.bandwidth3db)}`,
  ];
  return lines.join('\n');
}

export function buildPinInquiryMessage(pins: PinSpec[], isKo: boolean): string {
  return pins.map((pin) => buildPinInquiryBlock(pin, isKo)).join('\n\n---\n\n');
}
