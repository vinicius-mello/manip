// Gramática comum aos parsers ASCII e LaTeX. Recebe uma lista de tokens
// e devolve a árvore, sem simplificar nada:
//   num, id, fn            números, símbolos, funções (v = operador MathJSON)
//   + - * / ^ = ( ) ,      operadores e pontuação
//   frac, sqrt, { } [ ]    construções do LaTeX
// Parênteses digitados viram Delimiter, exceto onde a notação já mostra o
// agrupamento (numerador/denominador, expoente, argumento de função).

import { num, sym, fn } from './ast.js';

export class ParseError extends Error {
  constructor(message, pos) {
    super(message);
    this.pos = pos;
  }
}

const unwrap = (n) => (n.op === 'Delimiter' ? n.args[0] : n);
const ARITY = { Root: 2 };
const ATOM_START = new Set(['num', 'id', 'fn', '(', 'frac', 'sqrt', '{']);

export function parseTokens(toks) {
  let k = 0;
  const peek = () => toks[k];
  const next = () => toks[k++];
  const expect = (t) => {
    const tok = next();
    if (tok.t !== t) {
      throw new ParseError(tok.t === 'end' ? `Faltou “${t}”` : `Esperava “${t}”`, tok.pos);
    }
    return tok;
  };

  function expr() {
    const terms = [];
    let tok = peek();
    if (tok.t === '-') { next(); terms.push(fn('Negate', term())); }
    else { if (tok.t === '+') next(); terms.push(term()); }
    while ((tok = peek()).t === '+' || tok.t === '-') {
      next();
      terms.push(tok.t === '-' ? fn('Negate', term()) : term());
    }
    return terms.length === 1 ? terms[0] : fn('Add', ...terms);
  }

  function term() {
    let factors = [signedFactor()];
    const product = () => (factors.length === 1 ? factors[0] : fn('Multiply', ...factors));
    for (;;) {
      const tok = peek();
      if (tok.t === '*') { next(); factors.push(signedFactor()); }
      else if (tok.t === '/') {
        next();
        factors = [fn('Divide', unwrap(product()), unwrap(signedFactor()))];
      } else if (ATOM_START.has(tok.t)) factors.push(power());
      else return product();
    }
  }

  function signedFactor() {
    if (peek().t === '-') { next(); return fn('Negate', signedFactor()); }
    return power();
  }

  function power() {
    const base = atom();
    if (peek().t !== '^') return base;
    next();
    return fn('Power', base, unwrap(signedFactor()));
  }

  // { ... } do LaTeX: agrupamento invisível.
  function braced() {
    expect('{');
    const e = expr();
    expect('}');
    return e;
  }

  function atom() {
    const tok = next();
    switch (tok.t) {
      case 'num': return num(tok.v);
      case 'id': return sym(tok.v);
      case 'fn': {
        const arity = ARITY[tok.v] ?? 1;
        if (peek().t !== '(') {
          if (arity !== 1) throw new ParseError('Faltou “(”', peek().pos);
          return fn(tok.v, peek().t === '{' ? braced() : power());
        }
        next();
        const args = [expr()];
        while (peek().t === ',') { next(); args.push(expr()); }
        const close = expect(')');
        if (args.length !== arity) {
          throw new ParseError(`Esperava ${arity} argumento(s)`, close.pos);
        }
        return fn(tok.v, ...args);
      }
      case '(': {
        const e = expr();
        expect(')');
        return fn('Delimiter', e);
      }
      case '{': {
        k--;
        return braced();
      }
      case 'frac': {
        const a = braced();
        return fn('Divide', a, braced());
      }
      case 'sqrt': {
        if (peek().t === '[') {
          next();
          const n = expr();
          expect(']');
          return fn('Root', braced(), n);
        }
        return fn('Sqrt', peek().t === '{' ? braced() : atom());
      }
      case 'end': throw new ParseError('Expressão incompleta', tok.pos);
      default: throw new ParseError(`“${tok.t}” inesperado`, tok.pos);
    }
  }

  const lhs = expr();
  let root = lhs;
  if (peek().t === '=') {
    next();
    root = fn('Equal', lhs, expr());
  }
  if (peek().t !== 'end') throw new ParseError(`“${peek().t}” inesperado`, peek().pos);
  return root;
}
