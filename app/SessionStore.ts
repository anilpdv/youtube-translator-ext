import { ApplicationError } from './ApplicationError';
import {
  canTransition,
  type SessionState,
  type SessionStateUpdate,
  type SessionStatus,
} from './SessionState';

export type SessionStateListener = (state: Readonly<SessionState>) => void;

export class SessionStore {
  private state: SessionState;
  private readonly listeners = new Set<SessionStateListener>();

  constructor(initialState: SessionState) {
    this.state = initialState;
  }

  getSnapshot(): Readonly<SessionState> {
    return this.state;
  }

  subscribe(listener: SessionStateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  update(
    updater:
      | SessionStateUpdate
      | ((current: Readonly<SessionState>) => SessionStateUpdate),
  ): void {
    const patch = typeof updater === 'function' ? updater(this.state) : updater;

    if (
      patch.status &&
      !canTransition(this.state.status, patch.status)
    ) {
      throw new ApplicationError({
        code: 'INVALID_STATE_TRANSITION',
        title: 'Invalid application state',
        message: `Cannot move from "${this.state.status}" to "${patch.status}".`,
        technicalDetails: `Rejected state transition: ${this.state.status} -> ${patch.status}`,
      });
    }

    this.state = {
      ...this.state,
      ...patch,
      progress: patch.progress
        ? { ...this.state.progress, ...patch.progress }
        : this.state.progress,
    };
    this.emit();
  }

  transition(status: SessionStatus, patch: SessionStateUpdate = {}): void {
    this.update({ ...patch, status });
  }

  reset(nextState: SessionState): void {
    this.state = nextState;
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
