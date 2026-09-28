const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{6,20}$/;

export function getYouTubeVideoId(
  input: string | URL = window.location.href,
): string | null {
  const url = input instanceof URL ? input : new URL(input, window.location.origin);

  if (
    url.hostname !== 'youtube.com' &&
    !url.hostname.endsWith('.youtube.com') &&
    url.hostname !== 'youtu.be'
  ) {
    return null;
  }

  if (url.hostname === 'youtu.be') {
    const candidate = url.pathname.split('/').filter(Boolean)[0];
    return candidate && VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
  }

  if (url.pathname === '/watch') {
    const candidate = url.searchParams.get('v');
    return candidate && VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
  }

  return null;
}
