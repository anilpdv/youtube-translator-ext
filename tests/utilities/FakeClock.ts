export class FakeClock {
  constructor(private currentTime = 0) {}
  now(): number { return this.currentTime; }
  advanceBy(milliseconds: number): void { this.currentTime += milliseconds; }
}
