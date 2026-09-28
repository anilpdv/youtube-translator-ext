import type { PopupState } from './PopupState';

export type PopupScreen =
  | 'loading'
  | 'unsupported'
  | 'no-captions'
  | 'ready'
  | 'translating'
  | 'partial'
  | 'completed'
  | 'error';

export interface PopupViewState {
  readonly screen: PopupScreen;
  readonly primaryAction:
    | 'discover-tracks'
    | 'start-translation'
    | 'cancel-translation'
    | 'retry-failed'
    | 'show-subtitles'
    | 'configure-provider'
    | 'none';
  readonly translationFormEnabled: boolean;
  readonly displayControlsVisible: boolean;
}
