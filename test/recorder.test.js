import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readingTime, pickMimeType } from '../src/recorder.js';

test('tempo de leitura das notas', () => {
  assert.equal(readingTime(undefined), 0);
  assert.equal(readingTime('ok'), 1500, 'mínimo');
  assert.equal(readingTime('x'.repeat(40)), 2800);
  assert.equal(readingTime('x'.repeat(500)), 6000, 'máximo');
});

test('sem MediaRecorder (Node), nenhum formato', () => {
  assert.equal(pickMimeType(), '');
});
