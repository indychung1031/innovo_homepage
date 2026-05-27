"""
Design Logic Module
IC 치수/Pitch 기반 소켓 패밀리 및 핀 자동 추천 로직.

[이식 출처] socket_auto_design/backend/utils/design_logic.py
[수정 사항]
  - generate_drawing_number() 제거 (ERP 전용 — 홈페이지 불필요)
[개발 시 필수 작업]
  - `from backend import models` → homepage models로 교체
  - homepage models.py에 아래 클래스 정의 필요:
      SocketType, PinMaster, PinMechanicalSpec, PinType, Supplier
  - 해당 테이블의 마스터 데이터를 ERP DB에서 pg_dump 후 homepage DB에 적재
"""
from sqlalchemy.orm import Session
from sqlalchemy import asc
from backend import models  # TODO: homepage models.py 작성 후 유효


def recommend_pins(
    db: Session,
    ic_pitch: float,
    pin_type_ids: list[int] = None,
    supplier_ids: list[int] = None,
):
    """
    Recommend pins where pin_pitch <= ic_pitch
    And optionally filter by pin_type_ids / supplier_ids (pin_master.supplier_id)
    """

    query = db.query(models.PinMechanicalSpec).join(models.PinMaster)

    query = query.filter(models.PinMaster.is_active == True)

    if pin_type_ids:
        query = query.filter(models.PinMaster.pin_type_id.in_(pin_type_ids))

    if supplier_ids:
        query = query.filter(models.PinMaster.supplier_id.in_(supplier_ids))

    all_specs = query.all()

    supplier_ids_in_specs = set(spec.pin.supplier_id for spec in all_specs if spec.pin and spec.pin.supplier_id)
    suppliers = {}
    if supplier_ids_in_specs:
        suppliers = {s.supplier_id: s for s in db.query(models.Supplier).filter(models.Supplier.supplier_id.in_(supplier_ids_in_specs)).all()}

    recommended = []

    for spec in all_specs:
        try:
            if not spec.pitch:
                continue
            pin_pitch_val = float(str(spec.pitch).replace("mm", "").strip())

            if pin_pitch_val > 0 and pin_pitch_val <= ic_pitch:
                pin_info = spec.pin

                supplier_name = ""
                if pin_info.supplier_id:
                    supplier = suppliers.get(pin_info.supplier_id)
                    if supplier:
                        supplier_name = supplier.supplier_name

                recommended.append({
                    "pin_id": pin_info.pin_id,
                    "pin_name": pin_info.pin_name,
                    "pitch": spec.pitch,
                    "length": float(spec.top_plunger_length or 0) + float(spec.barrel_length or 0) + float(spec.bottom_plunger_length or 0),
                    "supplier_name": supplier_name,
                    "type_name": pin_info.pin_type.type_name if pin_info.pin_type else "Unknown",
                    "type_symbol": pin_info.pin_type.symbol if pin_info.pin_type and pin_info.pin_type.symbol else (pin_info.pin_type.type_name[0] if pin_info.pin_type else "P")
                })
        except ValueError:
            continue

    return recommended


def recommend_socket_type(db: Session, ic_d: float, ic_e: float, tol_d: float = 0.0, tol_e: float = 0.0):
    """
    Recommend socket types based on IC dimensions + tolerance.
    Logic: socket.max_ic_width >= (ic_d + tol_d) AND socket.max_ic_length >= (ic_e + tol_e)
    Sort: By (max_ic_width * max_ic_length) ASC to find the smallest suitable socket.
    """
    max_ic_w = ic_d + tol_d
    max_ic_l = ic_e + tol_e

    candidates = db.query(models.SocketType).filter(
        models.SocketType.max_ic_width >= max_ic_w,
        models.SocketType.max_ic_length >= max_ic_l
    ).all()

    candidates.sort(key=lambda s: (s.max_ic_width * s.max_ic_length))

    result = []
    for st in candidates:
        result.append({
            "socket_type_id": st.socket_type_id,
            "type_name": st.type_name,
            "card_size": f"{st.max_ic_width}x{st.max_ic_length}"
        })

    return result
