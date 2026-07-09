import type { SocketTypeOption } from '@/features/quote-wizard/types';

/**
 * ERP design_logic.recommend_socket_type 와 동일한 클라이언트 추천.
 * - 공차(tol)는 IC 치수에 더한다 (socket.max >= ic + tol) — 소켓 허용치에 더하면
 *   실제로 IC가 들어가지 않는 소켓이 추천되므로 방향에 주의
 * - 정렬은 면적(max_ic_width × max_ic_length) 오름차순 — 가장 작은 적합 소켓 우선
 */
export function recommendSocketType(
  sockets: SocketTypeOption[],
  icD: number,
  icE: number,
  tolD = 0,
  tolE = 0,
): SocketTypeOption | null {
  const sorted = [...sockets].sort(
    (a, b) => a.max_ic_width * a.max_ic_length - b.max_ic_width * b.max_ic_length,
  );

  for (const socket of sorted) {
    if (icD + tolD <= socket.max_ic_width && icE + tolE <= socket.max_ic_length) {
      return socket;
    }
  }

  return null;
}
