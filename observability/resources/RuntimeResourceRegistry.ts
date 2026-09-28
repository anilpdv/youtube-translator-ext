export type ResourceType = 'session' | 'event-listener' | 'mutation-observer' | 'timer' | 'animation-frame' | 'react-root' | 'subtitle-overlay' | 'subtitle-scheduler' | 'player-adapter' | 'provider-request' | 'cache-write';
export interface ResourceRegistration { readonly id: string; readonly type: ResourceType; readonly ownerId: string; readonly createdAt: number; }
export class RuntimeResourceRegistry {
  private readonly resources = new Map<string, ResourceRegistration>();
  register(resource: ResourceRegistration): void { this.resources.set(resource.id, resource); }
  release(resourceId: string): void { this.resources.delete(resourceId); }
  count(type?: ResourceType): number { return type ? [...this.resources.values()].filter((resource) => resource.type === type).length : this.resources.size; }
  listByOwner(ownerId: string): readonly ResourceRegistration[] { return [...this.resources.values()].filter((resource) => resource.ownerId === ownerId); }
  snapshot(): readonly ResourceRegistration[] { return [...this.resources.values()]; }
}
