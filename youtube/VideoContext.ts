export interface VideoContext {
  videoId: string;
  url: string;
  title: string;
}

export function createVideoContext(videoId: string): VideoContext {
  return {
    videoId,
    url: window.location.href,
    title: document.title,
  };
}
