import { describe, it, expect } from 'vitest';
import React from 'react';
import { SafeRootRenderer } from '../../utils/safeRootRenderer';

describe('SafeRootRenderer', () => {
  it('safely mounts, renders, and unmounts a React tree into a parent DOM container', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const renderer = new SafeRootRenderer('test-renderer');

    renderer.render(
      'test-container-id',
      () => document.createElement('div'),
      parent,
      React.createElement('span', null, 'Rendered content')
    );

    const container = document.getElementById('test-container-id');
    expect(container).not.toBeNull();
    expect(parent.contains(container)).toBe(true);

    renderer.unmount();
    expect(document.getElementById('test-container-id')).toBeNull();

    parent.remove();
  });

  it('handles re-rendering gracefully when container is already attached', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const renderer = new SafeRootRenderer('test-renderer-2');

    renderer.render(
      'test-container-2',
      () => document.createElement('div'),
      parent,
      React.createElement('span', null, 'Initial')
    );

    renderer.render(
      'test-container-2',
      () => document.createElement('div'),
      parent,
      React.createElement('span', null, 'Updated')
    );

    const container = document.getElementById('test-container-2');
    expect(container).not.toBeNull();

    renderer.unmount();
    parent.remove();
  });
});
