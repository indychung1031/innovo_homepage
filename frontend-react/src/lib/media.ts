/** upload·정적 미디어 URL — VITE_MEDIA_BASE_URL 또는 /upload */
export function mediaUrl(relativePath: string): string {
  const base = (import.meta.env.VITE_MEDIA_BASE_URL || '').replace(/\/$/, '');
  const raw = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  // 파일명 공백·한글 등 (예: LOGO (Mask 제거).png)
  const path = raw
    .split('/')
    .map((seg, i) => (i === 0 && seg === '' ? '' : encodeURIComponent(seg)))
    .join('/');
  if (!base) {
    return path;
  }
  return `${base}${path}`;
}
