import type { CredentialStore } from '../../security/credentials/CredentialStore';
import type { TranslationCacheRepository } from '../../cache/repository/TranslationCacheRepository';
import type { DiagnosticEventRepository } from '../../observability/diagnostics/DiagnosticEventRepository';
import type { Logger } from '../../observability/logging/Logger';
import type { PrivacyConsent } from '../../security/privacy/PrivacyConsent';

export interface SettingsRepository { get<T = unknown>(key: string): Promise<T | null>; set(key: string, value: unknown): Promise<void>; }
export interface PrivacyConsentRepository { get(providerId: string): Promise<PrivacyConsent | null>; set(consent: PrivacyConsent): Promise<void>; }
export interface MigrationContext {
  readonly settings: SettingsRepository;
  readonly credentials: CredentialStore;
  readonly cache: TranslationCacheRepository;
  readonly consent: PrivacyConsentRepository;
  readonly diagnostics: DiagnosticEventRepository;
  readonly logger: Logger;
}
export interface ExtensionMigration {
  readonly id: string;
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly description: string;
  run(context: MigrationContext): Promise<void>;
}
