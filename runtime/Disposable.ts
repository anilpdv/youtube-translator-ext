export interface Disposable {
  dispose(): void | Promise<void>;
}

export type DisposeFunction = () => void | Promise<void>;
