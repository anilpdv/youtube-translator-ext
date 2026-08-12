import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from '../components/ErrorBoundary';

/**
 * Encapsulates safe React 19 root creation, rendering, and unmounting with DOM lifecycle protection
 */
export class SafeRootRenderer {
  private root: ReactDOM.Root | null = null;
  private container: HTMLElement | null = null;
  private isUnmounted = false;

  constructor(private name: string) {}

  render(
    containerId: string,
    createContainer: () => HTMLElement,
    parent: Element | null,
    element: React.ReactNode
  ): void {
    if (this.isUnmounted || !parent || !parent.isConnected) return;

    try {
      let currentContainer = document.getElementById(containerId);

      // If container was detached or replaced by YouTube DOM recycling
      if (!currentContainer || !currentContainer.isConnected) {
        if (this.root) {
          try {
            this.root.unmount();
          } catch {}
          this.root = null;
        }
        if (currentContainer && currentContainer.parentNode) {
          try {
            currentContainer.remove();
          } catch {}
        }
        currentContainer = createContainer();
        currentContainer.id = containerId;
        parent.appendChild(currentContainer);
        this.container = currentContainer;
        this.root = ReactDOM.createRoot(currentContainer);
      } else if (!this.root || this.container !== currentContainer) {
        if (this.root) {
          try {
            this.root.unmount();
          } catch {}
        }
        this.container = currentContainer;
        this.root = ReactDOM.createRoot(currentContainer);
      }

      if (this.root && !this.isUnmounted) {
        this.root.render(
          <ErrorBoundary name={this.name}>
            {element}
          </ErrorBoundary>
        );
      }
    } catch (err) {
      console.warn(`[AI Subtitles] Error rendering root ${this.name}:`, err);
    }
  }

  unmount(): void {
    this.isUnmounted = true;
    const rootToUnmount = this.root;
    const containerToRemove = this.container;

    this.root = null;
    this.container = null;

    if (rootToUnmount) {
      try {
        rootToUnmount.unmount();
      } catch (err) {
        console.warn(`[AI Subtitles] Error unmounting root ${this.name}:`, err);
      }
    }

    if (containerToRemove && containerToRemove.parentNode) {
      try {
        containerToRemove.remove();
      } catch {}
    }
  }

  reset(): void {
    this.isUnmounted = false;
  }
}
