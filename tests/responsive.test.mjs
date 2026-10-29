import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('progression, collections, and dungeon cards include narrow-screen and reduced-motion rules', async () => {
  const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(css, /@media\s*\(max-width:\s*440px\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /\.dungeon-grid\s*\{grid-template-columns:1fr/);
});
