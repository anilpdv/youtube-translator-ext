import type { RequestPolicy } from './RequestPolicy';

export interface ProviderEndpointDefinition {
  readonly providerId: string;
  readonly origin: string;
  readonly allowedPathPrefixes: readonly string[];
  readonly allowedModelIds: readonly string[];
  readonly policy: RequestPolicy;
}

export class ProviderEndpointPolicy {
  constructor(private readonly definitions: ReadonlyMap<string, ProviderEndpointDefinition>) {}
  get(providerId: string): ProviderEndpointDefinition {
    const definition = this.definitions.get(providerId);
    if (!definition) throw new Error('Provider endpoint policy is not configured.');
    return definition;
  }
}
