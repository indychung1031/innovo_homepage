"""
Sales Calculation Logic Module
Handles VAT calculation and discount policy application for quotes.
S20: 국문(KRW) 10원 이하 절삭, 영문(외화) 소수 2자리·3자리 이하 버림.

[이식 출처] socket_auto_design/backend/utils/sales_logic.py
[수정 사항] 없음 — 순수 Python 로직, 프레임워크 의존성 없음
[홈페이지 적용 시 유의]
  - discount_rule(수량 할인): service_cost_logic 테이블에서 가져온 JSON — 인증회원·일반회원 모두 동일하게 적용
  - 회원 등급 처리는 이 함수 호출 전 단계에서 완료해야 함
      인증회원: set_unit_price = base_price (그대로)
      일반회원: set_unit_price = base_price × 1.3 (30% 마크업 후 전달)
  - 즉, 이 함수는 등급을 모른다 — 전달받은 단가와 수량 할인으로만 계산
"""
import math
from typing import List, Dict, Any, Optional, Union
from dataclasses import dataclass, field


def _truncate_krw(amount: float) -> int:
    """S20: 국문(KRW) 10원 이하 절삭."""
    return (int(amount) // 10) * 10


def _truncate_foreign(amount: float) -> float:
    """S20: 영문(외화) 소수 2자리까지, 3자리 이하 버림."""
    return math.floor(amount * 100) / 100


def _apply_amount_rule(amount: float, currency: str) -> Union[int, float]:
    """currency가 KRW면 10원 절삭, 아니면 소수 2자리 버림."""
    if (currency or "KRW").upper() == "KRW":
        return _truncate_krw(amount)
    return _truncate_foreign(amount)


@dataclass
class QuoteCalculationResult:
    """Result of quote amount calculation (amounts: int for KRW, float for foreign)"""
    subtotal: Union[int, float]
    discount_rate: float
    discount_amount: Union[int, float]
    supply_amount: Union[int, float]
    vat_amount: Union[int, float]
    total_amount: Union[int, float]

@dataclass
class ProductGroupResult:
    """Calculation result for a single product group"""
    category: str
    set_quantity: int
    set_unit_price: Union[int, float]
    subtotal: Union[int, float]
    discount_rate: float
    discount_amount: Union[int, float]
    net_amount: Union[int, float]

@dataclass
class ProductGroupsCalculationResult:
    """Result of product groups calculation"""
    groups: List[ProductGroupResult] = field(default_factory=list)
    subtotal: Union[int, float] = 0
    total_discount: Union[int, float] = 0
    special_discount_amount: Union[int, float] = 0
    supply_amount: Union[int, float] = 0
    vat_amount: Union[int, float] = 0
    total_amount: Union[int, float] = 0

def get_discount_rate(set_quantity: int, discount_policy: List[Dict[str, Any]]) -> float:
    """
    Get discount rate based on set quantity and customer's discount policy.
    """
    if not discount_policy:
        return 0.0

    for tier in discount_policy:
        min_qty = tier.get('min', 0)
        max_qty = tier.get('max', float('inf'))
        rate = tier.get('rate', 0)

        if min_qty <= set_quantity <= max_qty:
            return float(rate)

    return 0.0

def calculate_product_group(
    group: Dict[str, Any],
    discount_policy: List[Dict[str, Any]]
) -> ProductGroupResult:
    """
    Calculate amounts for a single product group.
    Discount is applied per product based on its set_quantity.
    """
    category = group.get('category', '')
    set_quantity = group.get('set_quantity', 1)
    set_linked = group.get('set_linked', True)
    sub_items = group.get('sub_items', [])

    if sub_items:
        set_unit_price = 0
        for item in sub_items:
            qty = item.get('quantity', 0)
            price = item.get('unit_price', 0)
            set_unit_price += qty * price
    else:
        set_unit_price = group.get('set_unit_price', 0) or 0

    subtotal = set_unit_price * set_quantity if set_linked else set_unit_price

    discount_rate = get_discount_rate(set_quantity, discount_policy)
    discount_amount = int(subtotal * discount_rate / 100)
    net_amount = subtotal - discount_amount

    return ProductGroupResult(
        category=category,
        set_quantity=set_quantity,
        set_unit_price=set_unit_price,
        subtotal=subtotal,
        discount_rate=discount_rate,
        discount_amount=discount_amount,
        net_amount=net_amount
    )

def calculate_product_groups_amounts(
    product_groups: List[Dict[str, Any]],
    vat_type: str = "separate",
    discount_policy: Optional[List[Dict[str, Any]]] = None,
    is_discount_applied: bool = True,
    is_special_discount_applied: bool = False,
    special_discount_rate: float = 0.0,
    currency: str = "KRW",
) -> ProductGroupsCalculationResult:
    """
    Calculate quote amounts with per-product discount and optional special discount.
    S20: currency=KRW → 10원 절삭, 그 외 → 소수 2자리 버림.
    """
    groups = []
    subtotal = 0
    total_discount = 0

    active_policy = discount_policy if is_discount_applied else []

    for group in product_groups:
        result = calculate_product_group(group, active_policy or [])
        result = ProductGroupResult(
            category=result.category,
            set_quantity=result.set_quantity,
            set_unit_price=_apply_amount_rule(result.set_unit_price, currency),
            subtotal=_apply_amount_rule(result.subtotal, currency),
            discount_rate=result.discount_rate,
            discount_amount=_apply_amount_rule(result.discount_amount, currency),
            net_amount=_apply_amount_rule(result.net_amount, currency),
        )
        groups.append(result)
        subtotal += result.subtotal if isinstance(result.subtotal, (int, float)) else 0
        total_discount += result.discount_amount if isinstance(result.discount_amount, (int, float)) else 0

    after_standard_discount = subtotal - total_discount

    special_discount_amount = 0.0
    if is_special_discount_applied and special_discount_rate > 0:
        special_discount_amount = after_standard_discount * special_discount_rate / 100
    special_discount_amount = _apply_amount_rule(special_discount_amount, currency)

    supply_amount = _apply_amount_rule(after_standard_discount - special_discount_amount, currency)
    sup = float(supply_amount) if isinstance(supply_amount, (int, float)) else 0

    if vat_type == "separate":
        vat_amount = _apply_amount_rule(sup * 0.1, currency)
        total_amount = _apply_amount_rule(sup + float(vat_amount), currency)
    elif vat_type == "included":
        total_amount = supply_amount
        supply_amount = _apply_amount_rule(sup / 1.1, currency)
        vat_amount = _apply_amount_rule(float(total_amount) - float(supply_amount), currency)
    else:
        vat_amount = _apply_amount_rule(0, currency)
        total_amount = supply_amount

    subtotal = _apply_amount_rule(subtotal, currency)
    total_discount = _apply_amount_rule(total_discount, currency)

    return ProductGroupsCalculationResult(
        groups=groups,
        subtotal=subtotal,
        total_discount=total_discount,
        special_discount_amount=special_discount_amount,
        supply_amount=supply_amount,
        vat_amount=vat_amount,
        total_amount=total_amount
    )


def format_currency(amount: int) -> str:
    """Format amount as Korean Won currency string"""
    return f"₩{amount:,}"
