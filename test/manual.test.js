import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allExamples, runExample, readWith, MANUAL } from '../src/manual-content.js';

test('manual: todos os exemplos se aplicam', () => {
  for (const ex of allExamples()) {
    if (ex.steps) {
      let tree = readWith(ex.src, ex.defs);
      for (const s of ex.steps) {
        const { result } = runExample({ ...s, defs: ex.defs }, tree);
        assert.ok(result?.tree, `${ex.src}: passo ${s.rule}`);
        tree = result.tree;
      }
    } else {
      const { result } = runExample(ex);
      assert.ok(result?.tree, `${ex.rule}: ${ex.src}`);
    }
  }
});

test('manual: textos nos dois idiomas', () => {
  const check = (x) => {
    if (x && typeof x === 'object' && 'pt' in x) assert.ok(x.pt && x.en, JSON.stringify(x));
    else if (Array.isArray(x)) x.forEach(check);
    else if (x && typeof x === 'object') Object.values(x).forEach(check);
  };
  check(MANUAL);
});
