export interface YouTubeCaptionTrackData {
  baseUrl?: unknown;
  name?: {
    simpleText?: unknown;
    runs?: Array<{ text?: unknown }>;
  };
  vssId?: unknown;
  languageCode?: unknown;
  kind?: unknown;
  isTranslatable?: unknown;
}

export interface YouTubePlayerData {
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: unknown;
      audioTracks?: unknown;
      translationLanguages?: unknown;
    };
  };
}
