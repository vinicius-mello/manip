// Aritmética exata com racionais (BigInt), usada só quando o usuário pede
// para calcular uma subexpressão numérica.

import { num, fn } from '../ast.js';

const gcd = (a, b) => {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a;
};

function rat(n, d = 1n) {
  if (d === 0n) return null;
  if (d < 0n) { n = -n; d = -d; }
  const g = gcd(n, d) || 1n;
  return { n: n / g, d: d / g };
}

function parseNumber(s) {
  const [int, frac = ''] = s.split('.');
  return rat(BigInt(int + frac || '0'), 10n ** BigInt(frac.length));
}

const add = (a, b) => rat(a.n * b.d + b.n * a.d, a.d * b.d);
const mul = (a, b) => rat(a.n * b.n, a.d * b.d);
const div = (a, b) => (b.n === 0n ? null : rat(a.n * b.d, a.d * b.n));

function pow(a, e) {
  if (e.d !== 1n) return null;
  let k = e.n < 0n ? -e.n : e.n;
  if (k > 1000n) return null;
  let r = rat(1n);
  for (; k > 0n; k--) r = mul(r, a);
  return e.n < 0n ? div(rat(1n), r) : r;
}

const DECIMAL = Symbol('decimal');

// Valor racional de uma subárvore puramente numérica, ou null.
export function evaluate(n) {
  switch (n.op) {
    case 'Number': {
      const r = parseNumber(n.value);
      if (n.value.includes('.')) r[DECIMAL] = true;
      return r;
    }
    case 'Delimiter': return evaluate(n.args[0]);
    case 'Negate': {
      const a = evaluate(n.args[0]);
      return a && keep(rat(-a.n, a.d), a);
    }
    case 'Add': case 'Multiply': {
      let acc = null;
      for (const c of n.args) {
        const v = evaluate(c);
        if (!v) return null;
        acc = acc ? keep(n.op === 'Add' ? add(acc, v) : mul(acc, v), acc, v) : v;
      }
      return acc;
    }
    case 'Divide': {
      const a = evaluate(n.args[0]);
      const b = evaluate(n.args[1]);
      return a && b && keep(div(a, b), a, b);
    }
    case 'Power': {
      const a = evaluate(n.args[0]);
      const b = evaluate(n.args[1]);
      return a && b && keep(pow(a, b), a, b);
    }
    default: return null;
  }
}

// Propaga a marca "veio de decimal" para o resultado.
function keep(r, ...from) {
  if (r && from.some((x) => x?.[DECIMAL])) r[DECIMAL] = true;
  return r;
}

function terminatingDecimal({ n, d }) {
  let k = d;
  let twos = 0, fives = 0;
  while (k % 2n === 0n) { k /= 2n; twos++; }
  while (k % 5n === 0n) { k /= 5n; fives++; }
  if (k !== 1n) return null;
  const places = Math.max(twos, fives);
  const scaled = (n < 0n ? -n : n) * 10n ** BigInt(places) / d;
  const s = scaled.toString().padStart(places + 1, '0');
  return places ? `${s.slice(0, -places)}.${s.slice(-places)}` : s;
}

// Nó que representa o racional: 4, −4, 3/4, −3/4 ou 0.75 (se veio de decimais).
export function ratToNode(r) {
  const neg = r.n < 0n;
  const abs = { n: neg ? -r.n : r.n, d: r.d };
  let node;
  if (abs.d === 1n) node = num(abs.n.toString());
  else if (r[DECIMAL] && terminatingDecimal(abs)) node = num(terminatingDecimal(abs));
  else node = fn('Divide', num(abs.n.toString()), num(abs.d.toString()));
  return neg ? fn('Negate', node) : node;
}
