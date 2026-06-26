# Homepage 팀 확인 요청 — Quote Wizard 실거래가 연동 착수 보류 사유

**보낸 곳**: ERP(socket_auto_design) 팀
**관련 원본 요청서**: `document/tasks/erp_quote_wizard_pricing_task.md` (2026-06-24)
**ERP 측 기획서**: `socket_auto_design/document/tasks_next_step/32_homepage_quote_wizard_pricing_plan.md`
**작성일**: 2026-06-25
**요청 사항**: 아래 2개 항목에 답변을 이 문서에 직접 적어주세요. 답변 확인 후 ERP 측 Phase 1 착수합니다.

---

## 확인 ① — `series` 범위: Quote Wizard 실거래가 연동을 `test_socket`만 할지, 3종 전체를 할지

ERP 팀이 `frontend-react` 코드를 직접 확인한 결과, Quote Wizard는 3개 제품 시리즈를 다룹니다(`types.ts`):

```ts
export type ProductSeries = 'test_socket' | 'probe_pin' | 'test_jig';
```

그런데 `api/erp.ts`의 `postQuoteEstimate()`를 보면:

```ts
if (useMock || draft.series !== 'test_socket') {
  return mockQuoteEstimate(draft, membershipTier);  // 항상 mock, matched:false
}
```

**`VITE_WIZARD_USE_MOCK`을 `false`로 바꿔도 `series`가 `test_socket`이 아니면 영원히 mock(미매칭) 응답만 나가도록 이미 코드에 박혀 있습니다.**

원본 작업요청서(`erp_quote_wizard_pricing_task.md`)는 이 구분을 전혀 언급하지 않고 그냥 "Quote Wizard"라고만 칭했습니다. ERP의 실제 판매가 테이블(`socket_selling_cost`)도 소켓(test_socket) 전용이라 이 가드와 우연히 맞아떨어지긴 하지만, 의도한 설계인지 확인이 필요합니다.

**질문**: 다음 중 어느 쪽이 맞나요?

- **(A)** 이번 작업은 `test_socket`만 실거래가로 전환하는 게 맞고, `probe_pin`/`test_jig`는 당분간(또는 영구적으로) "담당자 확인" 상태로 남겨둔다. → 프론트 가드는 의도된 것이며 ERP는 추가 작업 불필요.
- **(B)** `probe_pin`/`test_jig`도 이번에 또는 가까운 시일 내 실거래가가 필요하다. → 프론트 가드가 누락/실수이며, ERP에 probe_pin/test_jig용 판매가 테이블·로직을 신규로 만들어야 한다(범위 확대).

**답변**:
> **(A)** — `test_socket`만 실거래가로 전환합니다. 프론트 가드는 의도된 동작이며, `probe_pin`/`test_jig`용 판매가 테이블·로직 작업은 이번 범위에 포함하지 않습니다. ERP 측 추가 작업 불필요.

---

## 확인 ② — 마크업 계산 시 수량할인 처리 — 의사코드 내부 모순

원본 작업요청서의 마크업 의사코드:

```python
if user.membership_tier == "verified":
    unit_price = base_unit_price  # discount_rule은 이미 /api/public/quote-estimate에서 적용됨
    total_price = base_total_price
else:  # general
    unit_price = ceil(base_unit_price * 1.3 / 10) * 10  # 10원 절삭, 수량 할인 미적용
    total_price = unit_price * quantity
```

`else` 분기 주석이 "수량 할인 미적용"이라고 되어 있는데, 입력값으로 쓰는 `base_unit_price` 자체가 이미 `/api/public/quote-estimate`에서 수량할인이 적용된 값입니다. 즉 의사코드를 그대로 구현하면 일반회원도 수량할인이 반영된 가격 위에 마크업만 얹게 되어, 주석("수량 할인 미적용")과 실제 계산 결과가 어긋납니다.

**질문**: 일반회원(general) 단가를 계산할 때 다음 중 어느 쪽이 맞나요?

- **(A)** 일반회원은 수량할인 혜택을 전혀 받지 않는다 — **할인 적용 전** 단가에 1.3배 마크업만 적용 (주석 문구 그대로 해석)
- **(B)** 일반회원도 수량할인은 그대로 받고, 그 위에 1.3배 마크업만 추가 (입력값 그대로 해석, 주석은 오기로 간주)

**답변**:
> **(A)** — 일반회원은 수량할인을 전혀 받지 않습니다. **할인 적용 전** 기준가에 1.3배 마크업만 적용해주세요. 원본 의사코드의 주석이 맞고, `base_unit_price` 입력값 쪽을 "할인 미적용 기준가"로 구현해야 합니다 (마스터플랜 §7-1 확정 내용과 일치). 참고: `00_master_plan.md` 624~625행 — "일반회원: `base_price × 1.3` 고정 단가 — `discount_rule` 미적용(수량 할인 없음)".

---

## 참고 — 질문 불필요로 이미 정리된 항목 (ERP 측이 코드로 직접 확인함)

- 첨부파일: 프론트에서 파일명만 기록(`file?.name`)하고 실제 파일은 업로드하지 않음 — 현재 동작 그대로 유지하면 됨. ERP도 파일명 문자열만 저장.
- JWT `sub` 클레임 형식(`"hp_user:{id}"` vs 순수 정수): 동작에 영향 없음, 확인 불필요.

---

## 답변 후 진행 순서

답변을 이 문서에 적어주시면 ERP 팀이 확인 후 `32_homepage_quote_wizard_pricing_plan.md`의 Phase 1부터 순차 진행합니다.
