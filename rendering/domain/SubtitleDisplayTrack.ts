import type { SubtitleDisplaySlice } from './SubtitleDisplaySlice';
export interface SubtitleDisplayTrack { readonly sessionId: string; readonly videoId: string; readonly sourceLanguage: string; readonly targetLanguage: string; readonly slices: readonly SubtitleDisplaySlice[]; readonly durationMs: number; readonly planningVersion: string; }
