export interface CaptionTextDecoder {
  decode(input: string): string;
}

export class BrowserCaptionTextDecoder implements CaptionTextDecoder {
  private readonly textarea = document.createElement('textarea');

  decode(input: string): string {
    this.textarea.innerHTML = input;
    return this.textarea.value;
  }
}

export function decodeCaptionText(input: string): string {
  return new BrowserCaptionTextDecoder().decode(input);
}
