import { describe, expect, it } from 'vitest';
import { stableFeatureFlags } from '../../release/config/stable';
import { betaFeatureFlags } from '../../release/config/beta';
import { parseReleaseVersion, formatReleaseVersion } from '../../release/domain/ReleaseVersion';
import { validateStableFeatureFlags } from '../../release/validation/StableFeatureValidator';
import { evaluateReleaseHealth } from '../../release/health/ReleaseHealthEvaluator';
import { MigrationRegistry } from '../../release/migration/MigrationRegistry';

describe('release domain', () => {
  it('keeps stable flags safe and beta narrowly additive', () => {
    expect(validateStableFeatureFlags(stableFeatureFlags)).toEqual([]);
    expect(betaFeatureFlags.betaFeedback).toBe(true);
    expect(validateStableFeatureFlags(betaFeatureFlags)).toEqual([]);
  });

  it('parses and formats prerelease versions', () => {
    const version = parseReleaseVersion('0.9.0-beta.2');
    expect(formatReleaseVersion(version)).toBe('0.9.0-beta.2');
  });

  it('requests rollback when both health gates fail', () => {
    expect(evaluateReleaseHealth({
      channel: 'stable', version: '1.0.0', errorRate: 0.2, completionRate: 0.5,
    }).decision).toBe('rollback');
  });

  it('creates contiguous migration plans', () => {
    const registry = new MigrationRegistry([
      { id: 'one', fromVersion: 1, toVersion: 2, description: 'one', run: async () => undefined },
      { id: 'two', fromVersion: 2, toVersion: 3, description: 'two', run: async () => undefined },
    ]);
    expect(registry.createPlan(1, 3).map((migration) => migration.id)).toEqual(['one', 'two']);
  });
});
