# HP팀 작업 요청 — Probe Pin 이미지 API 전환

**작성일**: 2026-06-28
**상태**: ⏸ ERP 배포 완료 대기 중
**관련 협의**: ERP→HP 전달 내용 (2026-06-28)

---

## 배경

현재 Probe Pin 이미지는 `pin_name` 컨벤션으로 S3 경로를 조합해 표시한다.

```tsx
// 현재 방식 (ProbePinGeneralPage.tsx:248)
src={`/upload/products/renders/probe_pin/${pin.pin_name}.png`}
```

ERP 팀이 `pin_image` 테이블을 신설하고 `/api/erp/pins` 응답에 `images` 배열을 추가하기로 결정했다.
ERP 배포 완료 후 HP팀은 아래 두 파일만 수정하면 된다.

---

## 변경 파일

### 1. `frontend-react/src/api/erp.ts`

`PinSpec` 타입에 `images` 배열 추가:

```typescript
export type PinImage = {
  image_url: string;
  image_type: 'render' | 'front' | 'side' | 'detail' | string;
  sort_order: number;
};

export type PinSpec = {
  pin_id: number;
  pin_name: string;
  total_length: number | null;
  full_stroke: number | null;
  recommended_stroke: number | null;
  top_plunger_shape: string | null;
  bottom_plunger_shape: string | null;
  spring_force: string | null;
  current_continuous: string | null;
  resistance: string | null;
  bandwidth3db: string | null;
  images: PinImage[];  // 추가
};
```

---

### 2. `frontend-react/src/pages/products/ProbePinGeneralPage.tsx`

line 247 이미지 src 교체:

```tsx
// 변경 전
src={`/upload/products/renders/probe_pin/${pin.pin_name}.png`}

// 변경 후
src={pin.images?.[0]?.image_url ?? ''}
```

`images`가 빈 배열이면 `src=""`가 되어 기존 `onError` fallback("이미지 준비 중")이 그대로 동작하므로
별도 조건 분기 불필요.

---

## 주의 사항

- ERP 기존 필드(`pin_name`, `total_length` 등)는 변경 없음 — 다른 코드 수정 불필요
- `images` 배열이 없는 구버전 API 응답에도 `?.` 옵셔널 체이닝으로 방어됨
- 배포 후 이미지 URL이 S3 절대 경로(`https://innovo-www-prod.s3...`)이므로
  CloudFront 커스텀 도메인(`https://www.innovosolution.co.kr/upload/...`)과 다를 수 있음.
  ERP가 실제 반환하는 URL 형식 확인 후 필요하면 URL 변환 처리 추가.

---

## 배포 순서

1. ERP 배포 완료 통보 수신
2. 위 2개 파일 수정 + 커밋 + push
3. 로컬 빌드 → S3 동기화 → CloudFront 무효화
4. 운영에서 핀 이미지 표시 확인
