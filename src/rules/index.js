// Engine simbólico próprio: cada regra é uma transformação pequena e
// explícita, escolhida pelo usuário no menu contextual.
//
// Regra: { id, key, run(ctx) → resultado | null }  (nome no menu: i18n "rule.<id>")
//   ctx = { tree, focus: caminho, targets: caminhos (seleção ou [foco]),
//           input?, definitions?: { nome: árvore } }
//   resultado = { tree?, label, focus?: id, hints?, action? }
// Uma regra se aplica quando run() devolve algo; o menu usa o próprio
// resultado como prévia. Regras com `input` pedem um texto ao usuário (com
// textos de ajuda em i18n "rule.<id>.ph" e "rule.<id>.hint") e
// aparecem no menu quando available(ctx) é verdadeiro. `action` pede ao app
// algo além de trocar a árvore (definir um nome, abrir uma área de trabalho).
//
// Dicas de animação (hints):
//   merge:  { to: id, from: [ids] }  pedaços removidos "voam" até `to`
//   strike: [ids]                    pedaços removidos são riscados
//   clones: { idNovo: idOrigem }     cópias saem da posição do original

import { getAt, replaceAt, withArgs, fn, num, sym, same, isLeaf } from '../ast.js';
import { needsParens } from '../notation.js';
import { parseInput } from '../input.js';
import { toAscii } from '../serialize.js';
import { msg } from '../i18n.js';
import { evaluate, ratToNode } from './arith.js';
import {
  terms, factors, unparen, signed, parentPath, lastIndex, parentOf,
  siblingsOf, cloneFrom, spliceFlat,
} from './util.js';

// Soma/produto com 0 ou 1 argumentos vira o elemento neutro ou o próprio item.
function rebuild(op, args, original) {
  if (args.length === 0) return num(op === 'Add' ? 0 : 1);
  if (args.length === 1) return args[0];
  return original?.op === op ? withArgs(original, args) : fn(op, ...args);
}

// Substitui o nó em `path` por `node`; se o nó resultante for uma soma
// dentro de outra soma, os termos entram direto no pai.
function place(tree, path, node) {
  const parent = parentOf(tree, path);
  if (parent?.op === 'Add' && node.op === 'Add') {
    return replaceAt(tree, parentPath(path), withArgs(parent, spliceFlat(parent, lastIndex(path), [node])));
  }
  return replaceAt(tree, path, node);
}

// Tenta f no foco e, se não se aplicar, no pai do foco.
function atFocusOrParent(ctx, f) {
  return f(ctx.focus) ?? (ctx.focus.length ? f(parentPath(ctx.focus)) : null);
}

const sumOf = (x) => {
  const u = unparen(x);
  return u.op === 'Add' ? u : null;
};

const isNum = (n, v) => n.op === 'Number' && Number(n.value) === v;

// ---------------------------------------------------------------- calcular

function calculate(ctx) {
  const { tree, targets } = ctx;
  if (targets.length === 1) {
    const p = targets[0];
    const n = getAt(tree, p);
    if (isLeaf(n) || (n.op === 'Negate' && isLeaf(n.args[0]))) return null;
    const v = evaluate(n);
    if (!v) return null;
    const node = ratToNode(v);
    if (same(node, n)) return null;
    return {
      tree: replaceAt(tree, p, node),
      label: msg('step.calc'),
      focus: node.id,
      hints: { merge: { to: node.id, from: [n.id] } },
    };
  }
  const idx = siblingsOf(targets);
  if (!idx) return null;
  const pp = parentPath(targets[0]);
  const parent = getAt(tree, pp);
  if (parent.op !== 'Add' && parent.op !== 'Multiply') return null;
  const items = idx.map((i) => parent.args[i]);
  const v = evaluate(fn(parent.op, ...items));
  if (!v) return null;
  const node = ratToNode(v);
  const args = parent.args.filter((_, i) => !idx.includes(i) || i === idx[0]);
  args[args.indexOf(parent.args[idx[0]])] = node;
  return {
    tree: replaceAt(tree, pp, rebuild(parent.op, args, parent)),
    label: msg('step.calc'),
    focus: node.id,
    hints: { merge: { to: node.id, from: items.map((x) => x.id) } },
  };
}

// -------------------------------------------------------------- distribuir

function distribute(ctx) {
  return atFocusOrParent(ctx, (p) => {
    const { tree } = ctx;
    const n = getAt(tree, p);
    const clones = {};

    // −(a + b) → −a − b  (cada termo ganha o seu sinal; nada é cancelado)
    if (n.op === 'Negate' && sumOf(n.args[0])) {
      const s = sumOf(n.args[0]);
      const result = withArgs(s, s.args.map((t) => fn('Negate', t)));
      return { tree: place(tree, p, result), label: msg('step.distSign'), focus: result.id };
    }

    // a(b + c) → ab + ac
    if (n.op !== 'Multiply') return null;
    let k = n.args.findIndex((f) => sumOf(f));
    const focusIdx = ctx.focus.length === p.length + 1 ? lastIndex(ctx.focus) : -1;
    if (focusIdx >= 0 && sumOf(n.args[focusIdx])) k = focusIdx;
    if (k < 0) return null;
    const s = sumOf(n.args[k]);
    const before = n.args.slice(0, k);
    const after = n.args.slice(k + 1);
    const newTerms = s.args.map((t, i) => {
      const { neg, body } = signed(t);
      const copy = (x) => (i === 0 ? x : cloneFrom(x, clones));
      const fs = [...before.map(copy), ...factors(body), ...after.map(copy)];
      const prod = fs.length === 1 ? fs[0] : fn('Multiply', ...fs);
      return neg ? withArgs(t, [prod]) : prod;
    });
    const result = withArgs(s, newTerms);
    return { tree: place(tree, p, result), label: msg('step.dist'), focus: result.id, hints: { clones } };
  });
}

// -------------------------------------------------------- pôr em evidência

function factorOut(ctx) {
  const { tree, focus, targets } = ctx;
  if (!focus.length) return null;
  const F = getAt(tree, focus);
  let tp = focus;
  if (parentOf(tree, tp)?.op === 'Multiply') tp = parentPath(tp);
  if (parentOf(tree, tp)?.op === 'Negate') tp = parentPath(tp);
  const sp = parentPath(tp);
  const S = parentOf(tree, tp);
  if (S?.op !== 'Add') return null;

  // Termos envolvidos: os selecionados dessa soma (com o do foco) ou todos.
  const chosen = new Set(targets.filter((t) => parentPath(t).join() === sp.join()).map(lastIndex));
  chosen.add(lastIndex(tp));
  const idx = chosen.size >= 2 ? [...chosen].sort((a, b) => a - b) : S.args.map((_, i) => i);
  if (idx.length < 2) return null;

  const removed = [];
  let atEnd = false;
  const rems = [];
  for (const i of idx) {
    const t = S.args[i];
    const { neg, body } = signed(t);
    let rem;
    if (body.id === F.id || (same(body, F) && body.op !== 'Multiply')) {
      rem = num(1);
      if (body.id !== F.id) removed.push(body.id);
    } else if (body.op === 'Multiply') {
      let j = body.args.findIndex((a) => a.id === F.id);
      if (j >= 0) atEnd = j === body.args.length - 1;
      else j = body.args.findIndex((a) => same(a, F));
      if (j < 0) return null;
      if (body.args[j].id !== F.id) removed.push(body.args[j].id);
      rem = rebuild('Multiply', body.args.filter((_, q) => q !== j), body);
    } else return null;
    rems.push(neg ? withArgs(t, [rem]) : rem);
  }

  const all = idx.length === S.args.length;
  const inner = all ? withArgs(S, rems) : fn('Add', ...rems);
  const product = atEnd ? fn('Multiply', inner, F) : fn('Multiply', F, inner);
  let t2;
  if (all) t2 = replaceAt(tree, sp, product);
  else {
    const args = S.args.filter((_, i) => !idx.includes(i) || i === idx[0]);
    args[args.indexOf(S.args[idx[0]])] = product;
    t2 = replaceAt(tree, sp, withArgs(S, args));
  }
  return {
    tree: t2,
    label: msg('step.factor'),
    focus: product.id,
    hints: { merge: { to: F.id, from: removed } },
  };
}

// ------------------------------------------------------------------ cancelar

// Termos opostos numa soma: x e −x somem juntos.
function cancelTerms(ctx) {
  const { tree, targets, focus } = ctx;
  let sp, i, j;
  const idx = siblingsOf(targets);
  if (idx && idx.length === 2) {
    sp = parentPath(targets[0]);
    [i, j] = idx;
  } else if (targets.length === 1) {
    let tp = focus;
    if (parentOf(tree, tp)?.op === 'Negate') tp = parentPath(tp);
    if (parentOf(tree, tp)?.op !== 'Add') return null;
    sp = parentPath(tp);
    i = lastIndex(tp);
    const S = getAt(tree, sp);
    const a = signed(S.args[i]);
    j = S.args.findIndex((t, k) => k !== i && signed(t).neg !== a.neg && same(signed(t).body, a.body));
    if (j < 0) return null;
  } else return null;

  const S = getAt(tree, sp);
  if (S.op !== 'Add') return null;
  const a = signed(S.args[i]);
  const b = signed(S.args[j]);
  if (a.neg === b.neg || !same(a.body, b.body)) return null;
  const rest = S.args.filter((_, k) => k !== i && k !== j);
  return {
    tree: replaceAt(tree, sp, rebuild('Add', rest, S)),
    label: msg('step.cancelTerms'),
    hints: { strike: [S.args[i].id, S.args[j].id] },
  };
}

// Onde um nó está dentro de uma fração: { dp, side, k } com k = índice do
// fator (ou -1 se o nó é o numerador/denominador inteiro).
function fractionSlot(tree, p) {
  const parent = parentOf(tree, p);
  if (parent?.op === 'Divide') return { dp: parentPath(p), side: lastIndex(p), k: -1 };
  if (parent?.op === 'Multiply' && parentOf(tree, parentPath(p))?.op === 'Divide') {
    const mp = parentPath(p);
    return { dp: parentPath(mp), side: lastIndex(mp), k: lastIndex(p) };
  }
  return null;
}

// Fatores iguais no numerador e no denominador.
function cancelFactors(ctx) {
  const { tree, targets, focus } = ctx;
  let A, B;
  if (targets.length === 2) {
    A = fractionSlot(tree, targets[0]);
    B = fractionSlot(tree, targets[1]);
    if (!A || !B || A.dp.join() !== B.dp.join() || A.side === B.side) return null;
  } else if (targets.length === 1) {
    A = fractionSlot(tree, focus);
    if (!A) return null;
    const D = getAt(tree, A.dp);
    const mine = getAt(tree, focus);
    const other = D.args[1 - A.side];
    const k = factors(other).findIndex((f) => same(f, mine));
    if (k < 0) return null;
    B = { dp: A.dp, side: 1 - A.side, k: other.op === 'Multiply' ? k : -1 };
  } else return null;

  const D = getAt(tree, A.dp);
  const pick = (s) => (s.k < 0 ? D.args[s.side] : D.args[s.side].args[s.k]);
  const x = pick(A);
  const y = pick(B);
  if (!same(x, y)) return null;
  const strip = (s) => {
    const part = D.args[s.side];
    return s.k < 0 ? num(1) : rebuild('Multiply', part.args.filter((_, q) => q !== s.k), part);
  };
  const args = [];
  args[A.side] = strip(A);
  args[B.side] = strip(B);
  return {
    tree: replaceAt(tree, A.dp, withArgs(D, args)),
    label: msg('step.cancelFactors'),
    hints: { strike: [x.id, y.id] },
  };
}

const cancel = (ctx) => cancelTerms(ctx) ?? cancelFactors(ctx);

// ----------------------------------------------------- elemento neutro

function neutral(ctx) {
  return atFocusOrParent(ctx, (p) => {
    const { tree } = ctx;
    const n = getAt(tree, p);
    let node = null;
    let gone = [];
    if (n.op === 'Divide' && isNum(n.args[1], 1)) { node = n.args[0]; gone = [n.args[1].id]; }
    else if (n.op === 'Power' && isNum(n.args[1], 1)) { node = n.args[0]; gone = [n.args[1].id]; }
    else if (n.op === 'Negate' && isNum(n.args[0], 0)) { node = n.args[0]; }
    else if (n.op === 'Add' || n.op === 'Multiply') {
      const unit = n.op === 'Add' ? 0 : 1;
      const keep = n.args.filter((a) => !isNum(a, unit));
      if (keep.length === n.args.length || keep.length === 0) return null;
      gone = n.args.filter((a) => isNum(a, unit)).map((a) => a.id);
      node = rebuild(n.op, keep, n);
    } else return null;
    return { tree: replaceAt(tree, p, node), label: msg('step.neutral'), hints: { strike: gone } };
  });
}

// --------------------------------------------------------- parênteses

function removeParens(ctx) {
  return atFocusOrParent(ctx, (p) => {
    const { tree } = ctx;
    const n = getAt(tree, p);
    const parent = parentOf(tree, p);
    const content = n.op === 'Delimiter' ? n.args[0] : n;
    // Grupo implícito (soma dentro de soma, produto dentro de produto).
    const flattens = parent && (parent.op === 'Add' || parent.op === 'Multiply') && content.op === parent.op;
    if (n.op !== 'Delimiter' && !flattens) return null;
    let t2;
    if (flattens) {
      t2 = replaceAt(tree, parentPath(p), withArgs(parent, spliceFlat(parent, lastIndex(p), [content])));
    } else {
      if (parent && needsParens(content, parent, lastIndex(p))) return null;
      t2 = replaceAt(tree, p, content);
    }
    return { tree: t2, label: msg('step.parens'), focus: content.id };
  });
}

// ------------------------------------------------------------- agrupar

function group(ctx) {
  const { tree, targets } = ctx;
  const idx = siblingsOf(targets);
  if (!idx) return null;
  const pp = parentPath(targets[0]);
  const parent = getAt(tree, pp);
  if ((parent.op !== 'Add' && parent.op !== 'Multiply') || idx.length === parent.args.length) return null;
  const g = fn('Delimiter', fn(parent.op, ...idx.map((i) => parent.args[i])));
  const args = parent.args.filter((_, i) => !idx.includes(i) || i === idx[0]);
  args[args.indexOf(parent.args[idx[0]])] = g;
  return { tree: replaceAt(tree, pp, withArgs(parent, args)), label: msg('step.group'), focus: g.id };
}

// ------------------------------------------------- pôr entre parênteses

// Acrescenta um nível de parênteses (Delimiter) em volta da seleção. Vários
// irmãos vizinhos de uma soma/produto viram um grupo só; seleções soltas
// ganham parênteses cada uma.
function wrapParens(ctx) {
  const { tree, targets } = ctx;
  const idx = siblingsOf(targets);
  if (idx) {
    const pp = parentPath(targets[0]);
    const parent = getAt(tree, pp);
    const contiguous = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
    if ((parent.op === 'Add' || parent.op === 'Multiply') && contiguous) {
      // A soma inteira selecionada: os parênteses vão em volta dela.
      if (idx.length === parent.args.length) return wrapParens({ ...ctx, targets: [pp] });
      const g = fn('Delimiter', fn(parent.op, ...idx.map((i) => parent.args[i])));
      const args = parent.args.slice();
      args.splice(idx[0], idx.length, g);
      return { tree: replaceAt(tree, pp, withArgs(parent, args)), label: msg('step.wrapParens'), focus: g.id };
    }
  }
  // De trás para a frente: envolver um nó interno não muda o caminho de um
  // nó que vem antes dele.
  let t2 = tree;
  let focus = null;
  for (const p of [...targets].reverse()) {
    const n = getAt(t2, p);
    if (n.op === 'Equal') return null;
    const d = fn('Delimiter', n);
    focus = d.id;
    t2 = replaceAt(t2, p, d);
  }
  return { tree: t2, label: msg('step.wrapParens'), focus };
}

// --------------------------------------------------------------- frações

function joinFractions(ctx) {
  const { tree, targets, focus } = ctx;
  let sp, idx;
  const sib = siblingsOf(targets);
  if (sib) {
    sp = parentPath(targets[0]);
    idx = sib;
  } else {
    sp = getAt(tree, focus).op === 'Add' ? focus : parentPath(focus);
    if (!sp || getAt(tree, sp)?.op !== 'Add') return null;
    idx = getAt(tree, sp).args.map((_, i) => i);
  }
  const S = getAt(tree, sp);
  if (S.op !== 'Add' || idx.length < 2) return null;
  const parts = idx.map((i) => ({ t: S.args[i], ...signed(S.args[i]) }));
  if (parts.some((x) => x.body.op !== 'Divide')) return null;
  const den = parts[0].body.args[1];
  if (parts.some((x) => !same(x.body.args[1], den))) return null;
  const nums = parts.map((x) => (x.neg ? withArgs(x.t, [x.body.args[0]]) : x.body.args[0]));
  const frac = withArgs(parts[0].body, [fn('Add', ...nums), den]);
  let t2;
  if (idx.length === S.args.length) t2 = replaceAt(tree, sp, frac);
  else {
    const args = S.args.filter((_, i) => !idx.includes(i) || i === idx[0]);
    args[args.indexOf(S.args[idx[0]])] = frac;
    t2 = replaceAt(tree, sp, withArgs(S, args));
  }
  return {
    tree: t2,
    label: msg('step.join'),
    focus: frac.id,
    hints: { merge: { to: den.id, from: parts.slice(1).map((x) => x.body.args[1].id) } },
  };
}

function splitFraction(ctx) {
  return atFocusOrParent(ctx, (p) => {
    const { tree } = ctx;
    const D = getAt(tree, p);
    if (D.op !== 'Divide' || !sumOf(D.args[0])) return null;
    const s = sumOf(D.args[0]);
    const clones = {};
    const newTerms = s.args.map((t, i) => {
      const { neg, body } = signed(t);
      const den = i === 0 ? D.args[1] : cloneFrom(D.args[1], clones);
      const f = i === 0 ? withArgs(D, [body, den]) : fn('Divide', body, den);
      return neg ? withArgs(t, [f]) : f;
    });
    const result = withArgs(s, newTerms);
    return { tree: place(tree, p, result), label: msg('step.split'), focus: result.id, hints: { clones } };
  });
}

// --------------------------------------------------------- regra de sinais

function signs(ctx) {
  return atFocusOrParent(ctx, (p) => {
    const { tree } = ctx;
    const n = getAt(tree, p);
    const isNeg = (x) => unparen(x).op === 'Negate';
    if (n.op === 'Negate' && isNeg(n.args[0])) {
      const inner = unparen(n.args[0]).args[0];
      return { tree: replaceAt(tree, p, inner), label: msg('step.doubleNeg'), focus: inner.id };
    }
    if (n.op !== 'Multiply' && n.op !== 'Divide') return null;
    const count = n.args.filter(isNeg).length;
    if (!count) return null;
    const stripped = withArgs(n, n.args.map((x) => (isNeg(x) ? unparen(x).args[0] : x)));
    const node = count % 2 ? fn('Negate', stripped) : stripped;
    return { tree: place(tree, p, node), label: msg('step.signs'), focus: node.id };
  });
}

// ------------------------------------------------------------- potências

const baseOf = (x) => (x.op === 'Power' ? x.args[0] : x);
const expOf = (x) => (x.op === 'Power' ? x.args[1] : num(1));

function powers(ctx) {
  const { tree, targets, focus } = ctx;

  // x^a · x^b → x^(a + b)
  const sameBaseProduct = (pp, i, j) => {
    const M = getAt(tree, pp);
    const a = M.args[i];
    const b = M.args[j];
    // a·a (sem expoentes) é a definição de potência: regra "aspower".
    if (!same(baseOf(a), baseOf(b)) || (a.op !== 'Power' && b.op !== 'Power')) return null;
    const pw = a.op === 'Power'
      ? withArgs(a, [a.args[0], fn('Add', a.args[1], expOf(b))])
      : fn('Power', a, fn('Add', num(1), expOf(b)));
    const args = M.args.filter((_, k) => k !== j);
    args[args.indexOf(a)] = pw;
    return {
      tree: replaceAt(tree, pp, rebuild('Multiply', args, M)),
      label: msg('step.expAdd'),
      focus: pw.id,
      hints: { merge: { to: baseOf(a).id, from: [baseOf(b).id] } },
    };
  };

  const sib = siblingsOf(targets);
  if (sib?.length === 2 && parentOf(tree, targets[0])?.op === 'Multiply') {
    return sameBaseProduct(parentPath(targets[0]), sib[0], sib[1]);
  }

  return atFocusOrParent(ctx, (p) => {
    const n = getAt(tree, p);
    // foco no produto: primeiro par de fatores com a mesma base
    if (n.op === 'Multiply') {
      for (let i = 0; i < n.args.length; i++) {
        for (let j = i + 1; j < n.args.length; j++) {
          const r = sameBaseProduct(p, i, j);
          if (r) return r;
        }
      }
    }
    // foco num fator: procura outro fator com a mesma base
    if (parentOf(tree, p)?.op === 'Multiply' && p.length === focus.length) {
      const M = parentOf(tree, p);
      const i = lastIndex(p);
      const j = M.args.findIndex((x, k) => k !== i && same(baseOf(x), baseOf(n)));
      if (j >= 0) return sameBaseProduct(parentPath(p), Math.min(i, j), Math.max(i, j));
    }
    // x^a / x^b → x^(a − b)
    if (n.op === 'Divide' && same(baseOf(n.args[0]), baseOf(n.args[1]))) {
      const [a, b] = n.args;
      const e = fn('Add', expOf(a), fn('Negate', expOf(b)));
      const pw = a.op === 'Power' ? withArgs(a, [a.args[0], e]) : fn('Power', a, e);
      return {
        tree: replaceAt(tree, p, pw),
        label: msg('step.expSub'),
        focus: pw.id,
        hints: { merge: { to: baseOf(a).id, from: [baseOf(b).id] } },
      };
    }
    // (x^a)^b → x^(a·b)
    if (n.op === 'Power' && unparen(n.args[0]).op === 'Power') {
      const inner = unparen(n.args[0]);
      const pw = withArgs(n, [inner.args[0], fn('Multiply', inner.args[1], n.args[1])]);
      return { tree: replaceAt(tree, p, pw), label: msg('step.powPow'), focus: pw.id };
    }
    return null;
  });
}

// ------------------------------------------------ escrever como potência

// a·a·b·a → a³·b: fatores iguais (sem expoente) viram uma potência, pela
// definição. O primeiro fator fica no lugar; os outros "voam" até ele.
function asPower(ctx) {
  const { tree, targets, focus } = ctx;
  const group = (pp, idx) => {
    const M = getAt(tree, pp);
    if (M.op !== 'Multiply' || idx.length < 2) return null;
    const first = M.args[idx[0]];
    if (first.op === 'Power' || idx.some((i) => M.args[i].op === 'Power' || !same(M.args[i], first))) return null;
    const pw = fn('Power', first, num(idx.length));
    const args = M.args.filter((_, k) => !idx.includes(k) || k === idx[0]);
    args[args.indexOf(first)] = pw;
    return {
      tree: replaceAt(tree, pp, rebuild('Multiply', args, M)),
      label: msg('step.asPower'),
      focus: pw.id,
      hints: { merge: { to: first.id, from: idx.slice(1).map((i) => M.args[i].id) } },
    };
  };
  // Todas as ocorrências (sem expoente) de um fator no produto.
  const copiesOf = (M, x) => M.args.map((c, k) => (c.op !== 'Power' && same(c, x) ? k : -1)).filter((k) => k >= 0);

  const sib = siblingsOf(targets);
  if (sib) return group(parentPath(targets[0]), sib);
  const n = getAt(tree, focus);
  if (n.op === 'Multiply') {
    for (const c of n.args) {
      const idx = copiesOf(n, c);
      if (idx.length >= 2) return group(focus, idx);
    }
    return null;
  }
  const parent = parentOf(tree, focus);
  if (parent?.op !== 'Multiply') return null;
  return group(parentPath(focus), copiesOf(parent, n));
}

// ------------------------------------------- juntar termos semelhantes

// Coeficiente numérico e "parte literal" de um termo: −3ab → (−3, ab).
function monomial(t) {
  const { neg, body } = signed(t);
  let coef = rat1();
  let rest = body;
  if (body.op === 'Multiply' && evaluate(body.args[0])) {
    coef = evaluate(body.args[0]);
    rest = rebuild('Multiply', body.args.slice(1), body);
  } else if (evaluate(body)) return null; // constante: use "calcular"
  return { coef: neg ? { n: -coef.n, d: coef.d } : coef, rest };
}
const rat1 = () => ({ n: 1n, d: 1n });

// ab + ab → 2ab; 3x − x → 2x. Só junta termos escritos igualmente (ba e ab
// precisam ser reordenados antes: a comutatividade fica visível).
function likeTerms(ctx) {
  const { tree, targets, focus } = ctx;
  let sp, idx;
  const sib = siblingsOf(targets);
  if (sib && getAt(tree, parentPath(targets[0])).op === 'Add') {
    sp = parentPath(targets[0]);
    idx = sib;
  } else {
    let tp = focus;
    if (parentOf(tree, tp)?.op === 'Multiply') tp = parentPath(tp);
    if (parentOf(tree, tp)?.op === 'Negate') tp = parentPath(tp);
    if (parentOf(tree, tp)?.op !== 'Add') return null;
    sp = parentPath(tp);
    const S = getAt(tree, sp);
    const me = monomial(S.args[lastIndex(tp)]);
    if (!me) return null;
    idx = S.args.map((t, k) => (same(monomial(t)?.rest ?? num(0), me.rest) && monomial(t) ? k : -1)).filter((k) => k >= 0);
  }
  const S = getAt(tree, sp);
  if (idx.length < 2) return null;
  const ms = idx.map((i) => monomial(S.args[i]));
  if (ms.some((m) => !m || !same(m.rest, ms[0].rest))) return null;

  let sum = { n: 0n, d: 1n };
  for (const { coef } of ms) sum = { n: sum.n * coef.d + coef.n * sum.d, d: sum.d * coef.d };
  const rest = ms[0].rest;
  let term;
  if (sum.n === 0n) term = num(0);
  else {
    const c = ratToNode({ n: sum.n < 0n ? -sum.n : sum.n, d: sum.d });
    const isOne = c.op === 'Number' && c.value === '1';
    const body = isOne ? rest : fn('Multiply', c, ...(rest.op === 'Multiply' ? rest.args : [rest]));
    term = sum.n < 0n ? fn('Negate', body) : body;
  }
  const args = S.args.filter((_, k) => !idx.includes(k) || k === idx[0]);
  args[args.indexOf(S.args[idx[0]])] = term;
  return {
    tree: replaceAt(tree, sp, rebuild('Add', args, S)),
    label: msg('step.like'),
    focus: term.id,
    hints: { merge: { to: term.id, from: idx.map((i) => S.args[i].id) } },
  };
}

// --------------------------------------------- expansão de potências

const MAX_TERMS = 60;

// Expoente inteiro pequeno (≥ 2) de um nó Number, ou null.
function smallExponent(e, max) {
  if (e.op !== 'Number' || !/^\d+$/.test(e.value)) return null;
  const n = Number(e.value);
  return n >= 2 && n <= max ? n : null;
}

// Todas as formas de escrever n como soma ordenada de m inteiros ≥ 0, na
// ordem usual (a^n primeiro): [n,0,0], [n-1,1,0], [n-1,0,1], ...
function compositions(n, m) {
  if (m === 1) return [[n]];
  const out = [];
  for (let k = n; k >= 0; k--) {
    for (const rest of compositions(n - k, m - 1)) out.push([k, ...rest]);
  }
  return out;
}

// n! / (k1! k2! ... km!) com BigInt.
function multinomial(n, ks) {
  const fact = (k) => { let r = 1n; for (let i = 2n; i <= BigInt(k); i++) r *= i; return r; };
  return ks.reduce((acc, k) => acc / fact(k), fact(n));
}

// (a + b)^n → Σ C(n; k1..km) a^k1 b^k2 ...  (binômio de Newton / multinomial)
function expandPower(ctx) {
  return atFocusOrParent(ctx, (p) => {
    const { tree } = ctx;
    const P = getAt(tree, p);
    if (P.op !== 'Power') return null;
    const s = sumOf(P.args[0]);
    const n = s && smallExponent(P.args[1], 20);
    if (!n) return null;
    const ks = compositions(n, s.args.length);
    if (ks.length > MAX_TERMS) return null;

    const clones = {};
    const used = new Set();
    // A primeira ocorrência de cada termo fica com o nó original; as demais
    // são cópias que, na animação, saem dele.
    const copyOf = (i) => {
      if (used.has(i)) return cloneFrom(s.args[i], clones);
      used.add(i);
      return s.args[i];
    };
    const terms = ks.map((k) => {
      const coef = multinomial(n, k);
      const fs = coef === 1n ? [] : [num(coef.toString())];
      k.forEach((ki, i) => {
        if (ki === 0) return;
        const base = copyOf(i);
        fs.push(ki === 1 ? base : fn('Power', base, num(ki)));
      });
      return fs.length === 1 ? fs[0] : fn('Multiply', ...fs);
    });
    const result = withArgs(s, terms);
    const label = s.args.length === 2 ? msg('step.binomial') : msg('step.multinomial');
    return { tree: place(tree, p, result), label, focus: result.id, hints: { clones } };
  });
}

// (a + b)^3 → (a + b)(a + b)(a + b)
function powerAsProduct(ctx) {
  return atFocusOrParent(ctx, (p) => {
    const { tree } = ctx;
    const P = getAt(tree, p);
    if (P.op !== 'Power') return null;
    const n = smallExponent(P.args[1], 12);
    if (!n) return null;
    const clones = {};
    const base = unparen(P.args[0]);
    const copies = [base, ...Array.from({ length: n - 1 }, () => cloneFrom(base, clones))];
    const prod = fn('Multiply', ...copies);
    return { tree: replaceAt(tree, p, prod), label: msg('step.asProduct'), focus: prod.id, hints: { clones } };
  });
}

// ------------------------------------------------- operações na equação

const BOTH_SIDES = {
  '+': (side, e) => (side.op === 'Add' ? withArgs(side, [...side.args, e]) : fn('Add', side, e)),
  '-': (side, e) => (side.op === 'Add' ? withArgs(side, [...side.args, fn('Negate', e)]) : fn('Add', side, fn('Negate', e))),
  '*': (side, e) => (side.op === 'Multiply' ? withArgs(side, [...side.args, e]) : fn('Multiply', side, e)),
  '/': (side, e) => fn('Divide', side, e),
  '^': (side, e) => fn('Power', side, e),
};

// Expressão digitada (ASCII ou LaTeX), sem sinal de igual.
function parseExpr(text) {
  try {
    const e = parseInput(text ?? '');
    return e.op === 'Equal' ? null : e;
  } catch {
    return null;
  }
}

// Entrada no formato "<op> <expressão>", ex.: "+ 3", "* 2", "/ (x+1)", "^2".
export function parseSidesInput(text) {
  const m = /^\s*([-+*/^·×÷−])\s*(.+)$/.exec(text ?? '');
  if (!m) return null;
  const op = { '·': '*', '×': '*', '÷': '/', '−': '-' }[m[1]] ?? m[1];
  const e = parseExpr(m[2]);
  return e && { op, e };
}

function bothSides(ctx) {
  const { tree } = ctx;
  if (tree.op !== 'Equal') return null;
  const parsed = parseSidesInput(ctx.input);
  if (!parsed) return null;
  const { op, e } = parsed;
  const clones = {};
  const e2 = cloneFrom(e, clones);
  const sides = [BOTH_SIDES[op](tree.args[0], e), BOTH_SIDES[op](tree.args[1], e2)];
  const sym = { '*': '·', '/': '÷', '-': '−' }[op] ?? op;
  return { tree: withArgs(tree, sides), label: msg('step.sides', { op: sym, e: toAscii(e) }) };
}

function swapSides(ctx) {
  const { tree } = ctx;
  if (tree.op !== 'Equal') return null;
  return { tree: withArgs(tree, [tree.args[1], tree.args[0]]), label: msg('step.swap') };
}

// ------------------------------------------------------------ substituir

// Troca a seleção (ou o foco) pelo que o usuário digitar. A equivalência é
// responsabilidade de quem usa: é o passo "pela definição", "pelo dado".
function substitute(ctx) {
  const { tree, targets } = ctx;
  const e = parseExpr(ctx.input);
  if (!e) return null;
  const clones = {};
  let t2 = tree;
  let focus = null;
  for (const [i, p] of targets.entries()) {
    const node = i === 0 ? e : cloneFrom(e, clones);
    focus ??= node.id;
    t2 = replaceAt(t2, p, node);
  }
  return { tree: t2, label: msg('step.subst', { e: toAscii(e) }), focus };
}

// ------------------------------------------------------ somar e subtrair

// Acrescenta + q − q à subexpressão selecionada (ou em foco). O valor não
// muda; é o primeiro passo de completar quadrados. Se a seleção é uma soma,
// o par entra no fim dela; se é um ou mais termos de uma soma, logo depois
// do último; senão a subexpressão vira a soma (s + q − q).
function addSubtract(ctx) {
  const { tree, targets } = ctx;
  const q = parseExpr(ctx.input);
  if (!q) return null;
  const pair = [q, fn('Negate', cloneFrom(q, {}))];
  const label = msg('step.addsub', { q: toAscii(q) });

  if (targets.length > 1) {
    const idx = siblingsOf(targets);
    const sp = parentPath(targets[0]);
    const S = idx && getAt(tree, sp);
    if (S?.op !== 'Add') return null;
    const args = S.args.slice();
    args.splice(idx[idx.length - 1] + 1, 0, ...pair);
    return { tree: replaceAt(tree, sp, withArgs(S, args)), label, focus: q.id };
  }

  const p = targets[0];
  const n = getAt(tree, p);
  if (n.op === 'Equal') return null;
  const parent = parentOf(tree, p);
  let t2;
  if (n.op === 'Add') {
    t2 = replaceAt(tree, p, withArgs(n, [...n.args, ...pair]));
  } else if (parent?.op === 'Add') {
    const args = parent.args.slice();
    args.splice(lastIndex(p) + 1, 0, ...pair);
    t2 = replaceAt(tree, parentPath(p), withArgs(parent, args));
  } else {
    t2 = replaceAt(tree, p, fn('Add', n, ...pair));
  }
  return { tree: t2, label, focus: q.id };
}

// ------------------------------------------------------------------ nomes

const NAME_RE = /^[A-Za-z](_[A-Za-z0-9]+)?$/;
const isNamed = (n) => n.op === 'Symbol' && n.named;

function nameIt(ctx) {
  const { tree, targets } = ctx;
  if (targets.length !== 1) return null;
  const name = (ctx.input ?? '').trim();
  if (!NAME_RE.test(name) || ctx.definitions?.[name]) return null;
  const n = getAt(tree, targets[0]);
  if (n.op === 'Equal' || isNamed(n)) return null;
  const chip = { ...sym(name), named: true };
  return {
    tree: replaceAt(tree, targets[0], chip),
    label: msg('step.name', { name }),
    focus: chip.id,
    action: { type: 'define', name, def: n, chipId: chip.id },
  };
}

function expandName(ctx) {
  const { tree, focus } = ctx;
  const n = getAt(tree, focus);
  const def = isNamed(n) && ctx.definitions?.[n.name];
  if (!def) return null;
  const node = cloneFrom(def, {});
  return { tree: replaceAt(tree, focus, node), label: msg('step.expand', { name: n.name }), focus: node.id };
}

function openName(ctx) {
  const n = getAt(ctx.tree, ctx.focus);
  if (!isNamed(n) || !ctx.definitions?.[n.name]) return null;
  return { label: msg('step.open', { name: n.name }), action: { type: 'open', name: n.name } };
}

export const RULES = [
  { id: 'calc', key: 'c', run: calculate },
  { id: 'dist', key: 'd', run: distribute },
  { id: 'factor', key: 'e', run: factorOut },
  { id: 'cancel', key: 'x', run: cancel },
  { id: 'neutral', key: 'n', run: neutral },
  { id: 'signs', key: 'r', run: signs },
  { id: 'parens', key: 'p', run: removeParens },
  { id: 'wrap', key: '(', run: wrapParens },
  { id: 'group', key: 'g', run: group },
  { id: 'join', key: 'j', run: joinFractions },
  { id: 'split', key: 'f', run: splitFraction },
  { id: 'powers', key: 'o', run: powers },
  { id: 'binomial', key: 'b', run: expandPower },
  { id: 'asproduct', key: 'm', run: powerAsProduct },
  { id: 'aspower', key: 'u', run: asPower },
  { id: 'like', key: 'l', run: likeTerms },
  { id: 'expand', key: 'k', run: expandName },
  { id: 'open', key: 'w', run: openName },
  {
    id: 'addsub', key: 'q', run: addSubtract,
    input: true,
    available: (ctx) => ctx.targets.every((p) => getAt(ctx.tree, p).op !== 'Equal'),
  },
  {
    id: 'subst', key: 's', run: substitute,
    input: true,
    available: (ctx) => ctx.targets.length > 0,
  },
  {
    id: 'name', key: 'a', run: nameIt,
    input: true,
    available: (ctx) => ctx.targets.length === 1 && getAt(ctx.tree, ctx.targets[0]).op !== 'Equal',
  },
  {
    id: 'sides', key: '=', run: bothSides,
    input: true,
    available: (ctx) => ctx.tree.op === 'Equal',
  },
  { id: 'swap', key: 't', run: swapSides },
];

// Regras aplicáveis ao contexto, já com o resultado (prévia).
export function applicable(ctx) {
  const out = [];
  for (const rule of RULES) {
    if (rule.input) {
      if (rule.available(ctx)) out.push({ rule, result: null });
      continue;
    }
    let result = null;
    try {
      result = rule.run(ctx);
    } catch (err) {
      console.error(`[Manip] regra ${rule.id}`, err);
    }
    if (result) out.push({ rule, result });
  }
  return out;
}
