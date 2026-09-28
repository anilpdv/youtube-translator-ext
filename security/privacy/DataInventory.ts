export interface DataInventoryItem {
  readonly name: string;
  readonly purpose: string;
  readonly storage: 'memory' | 'browser-storage' | 'indexeddb' | 'provider';
  readonly retention: string;
}

export const DATA_INVENTORY: readonly DataInventoryItem[] = [
  { name: 'Provider credentials', purpose: 'Authorize provider requests', storage: 'browser-storage', retention: 'Until deleted by the user' },
  { name: 'Caption translations', purpose: 'Resume translation locally', storage: 'indexeddb', retention: 'Bounded cache retention policy' },
  { name: 'Session state', purpose: 'Coordinate active subtitles', storage: 'memory', retention: 'Active session only' },
];
