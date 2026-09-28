import type { ExtensionMigration, MigrationContext } from './ExtensionMigration';
import { MigrationRegistry } from './MigrationRegistry';
export interface MigrationResult { readonly completed: boolean; readonly appliedMigrationIds: readonly string[]; readonly failedMigrationId: string | null; readonly errorCode: string | null; }
export class MigrationRunner {
  constructor(private readonly registry: MigrationRegistry, private readonly context: MigrationContext) {}
  async run(fromVersion: number, toVersion: number): Promise<MigrationResult> {
    let plan: readonly ExtensionMigration[];
    try { plan = this.registry.createPlan(fromVersion, toVersion); }
    catch (error) { return { completed: false, appliedMigrationIds: [], failedMigrationId: null, errorCode: error instanceof Error ? error.name : 'PLAN_FAILED' }; }
    const applied: string[] = [];
    for (const migration of plan) {
      try { await migration.run(this.context); applied.push(migration.id); }
      catch (error) { return { completed: false, appliedMigrationIds: applied, failedMigrationId: migration.id, errorCode: error instanceof Error ? error.name : 'UNKNOWN_ERROR' }; }
    }
    return { completed: true, appliedMigrationIds: applied, failedMigrationId: null, errorCode: null };
  }
}
