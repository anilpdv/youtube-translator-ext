import type { CredentialProviderId } from '../../security/credentials/Credential';
import type { CredentialStore } from '../../security/credentials/CredentialStore';
import { CredentialError } from '../../security/credentials/CredentialError';
import { EndpointValidator } from '../../security/network/EndpointValidator';
import type { ProviderEndpointPolicy } from '../../security/network/ProviderEndpointPolicy';
import { SafeFetch } from '../../security/network/SafeFetch';

export class ProviderRequestGateway {
  constructor(
    private readonly credentials: CredentialStore,
    private readonly policies: ProviderEndpointPolicy,
    private readonly fetcher = new SafeFetch(),
  ) {}

  async post(
    providerId: CredentialProviderId,
    endpoint: string,
    body: string,
    signal: AbortSignal,
  ): Promise<string> {
    const definition = this.policies.get(providerId);
    const url = new EndpointValidator().validate(endpoint, definition);
    const credential = await this.credentials.get(providerId);
    if (!credential) throw new CredentialError('CREDENTIAL_NOT_FOUND', 'The provider credential is not configured.');
    const response = await this.fetcher.execute({
      url,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': credential.secret },
      body,
      signal,
      policy: definition.policy,
    });
    return response.body;
  }
}
