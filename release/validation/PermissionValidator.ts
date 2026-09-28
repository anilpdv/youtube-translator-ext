const FORBIDDEN = ['debugger', 'unlimitedStorage'];
export function validatePermissions(permissions: readonly string[], forbidden = FORBIDDEN): readonly string[] {
  return permissions.filter((permission) => forbidden.includes(permission));
}
