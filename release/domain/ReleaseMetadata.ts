import type { BuildChannel } from './BuildChannel';
export interface ReleaseMetadata {
  readonly version: string;
  readonly channel: BuildChannel;
  readonly commitHash: string;
  readonly buildId: string;
  readonly builtAt: number;
  readonly schemaVersions: { readonly settings: number; readonly cache: number; readonly diagnostics: number; readonly messageProtocol: number };
  readonly enabledFeatures: readonly string[];
}
