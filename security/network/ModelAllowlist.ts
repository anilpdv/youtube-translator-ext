import { NetworkError } from './NetworkError';
import type { ProviderEndpointDefinition } from './ProviderEndpointPolicy';

export function validateModelId(modelId: string, definition: ProviderEndpointDefinition): string {
  const normalized = modelId.trim();
  if (!normalized || !definition.allowedModelIds.includes(normalized)) {
    throw new NetworkError('MODEL_NOT_ALLOWED', 'The selected provider model is not allowed.');
  }
  return normalized;
}
