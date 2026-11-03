import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAscii } from '../src/parse-ascii.js';
import { RULES } from '../src/rules/index.js';
import { EXAMPLES, exampleContext } from '../src/examples.js';

// expand e open dependem de um nome já definido.
const WITHOUT_EXAMPLE = new Set(['expand', 'open']);

test('toda operação tem exemplo na folha de atalhos', () => {
  for (const r of RULES) {
    if (WITHOUT_EXAMPLE.has(r.id)) continue;
    assert.ok(EXAMPLES[r.id], `sem exemplo: ${r.id}`);
  }
});

test('todos os exemplos se aplicam', () => {
  for (const [id, ex] of Object.entries(EXAMPLES)) {
    const rule = RULES.find((r) => r.id === id);
    assert.ok(rule, `regra inexistente: ${id}`);
    const r = rule.run(exampleContext(ex, parseAscii(ex.src)));
    assert.ok(r?.tree, `exemplo não se aplica: ${id}`);
  }
});
