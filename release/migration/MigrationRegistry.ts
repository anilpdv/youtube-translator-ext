import type { ExtensionMigration } from './ExtensionMigration';
export class MigrationRegistry {
  constructor(private readonly migrations: readonly ExtensionMigration[]) {}
  createPlan(fromVersion: number, toVersion: number): readonly ExtensionMigration[] {
    const plan: ExtensionMigration[] = [];
    for (let current = fromVersion; current < toVersion; current += 1) {
      const migration = this.migrations.find((candidate) => candidate.fromVersion === current && candidate.toVersion === current + 1);
      if (!migration) throw new Error(`No migration exists from version ${current}.`);
      plan.push(migration);
    }
    return plan;
  }
}
