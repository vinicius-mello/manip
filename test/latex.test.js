import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLatex } from '../src/parse-latex.js';
import { parseAscii } from '../src/parse-ascii.js';
import { parseInput, isLatex } from '../src/input.js';
import { toMathJson } from '../src/mathjson.js';
import { toLatex, toAscii } from '../src/serialize.js';

const mj = (s) => toMathJson(parseLatex(s));

test('LaTeX básico', () => {
  assert.deepEqual(mj('\\frac{y-1}{4} = 2x'), ['Equal', ['Divide', ['Add', 'y', ['Negate', 1]], 4], ['Multiply', 2, 'x']]);
  assert.deepEqual(mj('x^{n+1}'), ['Power', 'x', ['Add', 'n', 1]]);
  assert.deepEqual(mj('x^23'), ['Multiply', ['Power', 'x', 2], 3]);
  assert.deepEqual(mj('\\sqrt{b^2 - 4ac}'), ['Sqrt', ['Add', ['Power', 'b', 2], ['Negate', ['Multiply', 4, 'a', 'c']]]]);
  assert.deepEqual(mj('\\sqrt[3]{x}'), ['Root', 'x', 3]);
  assert.deepEqual(mj('2 \\cdot 3 \\times 4'), ['Multiply', 2, 3, 4]);
  assert.deepEqual(mj('\\left(a+b\\right)c'), ['Multiply', ['Delimiter', ['Add', 'a', 'b']], 'c']);
  assert.deepEqual(mj('\\sin\\theta + \\pi'), ['Add', ['Sin', 'theta'], 'pi']);
  assert.deepEqual(mj('x_{12} + y_a'), ['Add', 'x_12', 'y_a']);
  assert.deepEqual(mj('\\dfrac{1}{2}\\,x'), ['Multiply', ['Divide', 1, 2], 'x']);
  assert.deepEqual(mj('[a+b]'), ['Delimiter', ['Add', 'a', 'b']]);
});

test('erros de LaTeX', () => {
  assert.throws(() => parseLatex('\\foo{x}'), { key: 'err.unknownCmd', params: { name: 'foo' } });
  assert.throws(() => parseLatex('\\frac{1}'), { key: 'err.missing' });
});

test('ida e volta: toLatex → parseLatex', () => {
  for (const s of ['(y-1)/4 = 2x', 'x^(n+1) - sqrt(2) = root(x, 3)', '-(a + b) = 2(x - 1)', 'sin(theta) + x_1 = pi']) {
    const t = parseAscii(s);
    assert.deepEqual(toMathJson(parseLatex(toLatex(t))), toMathJson(t), s);
    assert.deepEqual(toMathJson(parseAscii(toAscii(t))), toMathJson(t), s);
  }
});

test('detecção automática', () => {
  assert.equal(isLatex('2x+1=3'), false);
  assert.equal(isLatex('\\frac{1}{2}'), true);
  assert.deepEqual(toMathJson(parseInput('x^{2}')), ['Power', 'x', 2]);
  assert.deepEqual(toMathJson(parseInput('x^2')), ['Power', 'x', 2]);
});
