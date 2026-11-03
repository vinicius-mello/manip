// Serialização da árvore para ASCII (reeditar no campo de entrada) e LaTeX.

import { FUNCTION_NAMES, GREEK } from './ast.js';
import { needsParens, needsDot, isFunctionOp } from './notation.js';

const asciiAtomic = (n) => n.op === 'Number' || n.op === 'Symbol' || n.op === 'Delimiter';

export function toAscii(n) {
  const sub = (c, i) => {
    const s = toAscii(c);
    return needsParens(c, n, i) ? `(${s})` : s;
  };
  const group = (c) => (asciiAtomic(c) || isFunctionOp(c.op) ? toAscii(c) : `(${toAscii(c)})`);
  switch (n.op) {
    case 'Number': return n.value;
    case 'Symbol': return n.name;
    case 'Equal': return `${toAscii(n.args[0])} = ${toAscii(n.args[1])}`;
    case 'Add':
      return n.args.map((c, i) => {
        if (i > 0 && c.op === 'Negate') return ' - ' + toAscii(c).slice(1);
        return (i > 0 ? ' + ' : '') + sub(c, i);
      }).join('');
    case 'Negate': return '-' + sub(n.args[0], 0);
    case 'Multiply':
      return n.args.map((c, i) => {
        // Em ASCII, uma fração dentro de um produto precisa de parênteses:
        // "x*1/2" seria lido como (x·1)/2.
        if (c.op === 'Divide') return `(${toAscii(c)})`;
        const sep = i === 0 ? '' : needsDot(n.args[i - 1], c, i, n) ? '*' : '';
        return sep + sub(c, i);
      }).join('');
    case 'Divide': return `${group(n.args[0])}/${group(n.args[1])}`;
    case 'Power': return `${sub(n.args[0], 0)}^${group(n.args[1])}`;
    case 'Delimiter': return `(${toAscii(n.args[0])})`;
    case 'Root': return `root(${toAscii(n.args[0])}, ${toAscii(n.args[1])})`;
    default: return `${FUNCTION_NAMES[n.op] ?? n.op}(${n.args.map(toAscii).join(', ')})`;
  }
}

function latexSymbol(name) {
  const [base, sub] = name.split('_');
  const b = GREEK.includes(base) ? `\\${base}` : base;
  return sub === undefined ? b : `${b}_{${sub}}`;
}

export function toLatex(n) {
  const sub = (c, i) => {
    const s = toLatex(c);
    return needsParens(c, n, i) ? `\\left(${s}\\right)` : s;
  };
  switch (n.op) {
    case 'Number': return n.value;
    case 'Symbol': return latexSymbol(n.name);
    case 'Equal': return `${toLatex(n.args[0])} = ${toLatex(n.args[1])}`;
    case 'Add':
      return n.args.map((c, i) => {
        if (i > 0 && c.op === 'Negate') return ' - ' + toLatex(c).slice(1);
        return (i > 0 ? ' + ' : '') + sub(c, i);
      }).join('');
    case 'Negate': return '-' + sub(n.args[0], 0);
    case 'Multiply':
      return n.args.map((c, i) => {
        const sep = i === 0 ? '' : needsDot(n.args[i - 1], c, i, n) ? ' \\cdot ' : ' ';
        return sep + sub(c, i);
      }).join('');
    case 'Divide': return `\\frac{${toLatex(n.args[0])}}{${toLatex(n.args[1])}}`;
    case 'Power': return `${sub(n.args[0], 0)}^{${toLatex(n.args[1])}}`;
    case 'Sqrt': return `\\sqrt{${toLatex(n.args[0])}}`;
    case 'Root': return `\\sqrt[${toLatex(n.args[1])}]{${toLatex(n.args[0])}}`;
    case 'Abs': return `\\left|${toLatex(n.args[0])}\\right|`;
    case 'Delimiter': return `\\left(${toLatex(n.args[0])}\\right)`;
    default: {
      const name = FUNCTION_NAMES[n.op] ?? n.op;
      return `\\${name}${sub(n.args[0], 0).replace(/^(?!\\left)/, ' ')}`;
    }
  }
}
