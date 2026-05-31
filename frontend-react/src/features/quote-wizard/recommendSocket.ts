import type { SocketTypeOption } from '@/features/quote-wizard/types';

/** ERP design_logic.recommend_socket_type 와 동일한 클라이언트 추천 */
export function recommendSocketType(
  sockets: SocketTypeOption[],
  icD: number,
  icE: number,
  tolD = 0,
  tolE = 0,
): SocketTypeOption | null {
  const sorted = [...sockets].sort(
    (a, b) => a.max_ic_width - b.max_ic_width || a.max_ic_length - b.max_ic_length,
  );

  for (const socket of sorted) {
    if (icD <= socket.max_ic_width + tolD && icE <= socket.max_ic_length + tolE) {
      return socket;
    }
  }

  return null;
}
