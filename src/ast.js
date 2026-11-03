// Modelo interno da expressão.
// Todo nó é um objeto imutável { id, op, ... }:
//   { op: 'Number', value }        { op: 'Symbol', name }
//   { op: <operador>, args: [...] } com operadores no vocabulário MathJSON
//   (Equal, Add, Multiply, Divide, Power, Negate, Sqrt, Delimiter, Sin, ...)
// O id é estável: um nó movido mantém o id, o que permite animá-lo.
// Propriedades visuais opcionais (ex.: color) viajam junto com o nó.

let nextId = 1;
export const newId = () => 'n' + nextId++;

export const num = (value) => ({ id: newId(), op: 'Number', value: String(value) });
export const sym = (name) => ({ id: newId(), op: 'Symbol', name });
export const fn = (op, ...args) => ({ id: newId(), op, args });

export const isLeaf = (n) => n.op === 'Number' || n.op === 'Symbol';
export const children = (n) => n.args ?? [];

// Copia o nó trocando os argumentos (mesmo id).
export const withArgs = (n, args) => ({ ...n, args });

export function getAt(tree, path) {
  let n = tree;
  for (const i of path) n = n.args[i];
  return n;
}

export function replaceAt(tree, path, node) {
  if (path.length === 0) return node;
  const [i, ...rest] = path;
  const args = tree.args.slice();
  args[i] = replaceAt(args[i], rest, node);
  return withArgs(tree, args);
}

export function findPath(tree, id, path = []) {
  if (tree.id === id) return path;
  const cs = children(tree);
  for (let i = 0; i < cs.length; i++) {
    const p = findPath(cs[i], id, [...path, i]);
    if (p) return p;
  }
  return null;
}

export function walk(tree, f, path = []) {
  f(tree, path);
  children(tree).forEach((c, i) => walk(c, f, [...path, i]));
}

// Clona a árvore com ids novos (para inserir cópias de um nó).
export function cloneFresh(n) {
  const c = { ...n, id: newId() };
  if (n.args) c.args = n.args.map(cloneFresh);
  return c;
}

// Árvore sem ids, para salvar; cloneFresh() a traz de volta com ids novos.
export function strip(n) {
  const { id, ...rest } = n;
  if (n.args) rest.args = n.args.map(strip);
  return rest;
}

// Igualdade estrutural (ignora ids e propriedades visuais).
export function same(a, b) {
  if (a.op !== b.op) return false;
  if (a.op === 'Number') return a.value === b.value;
  if (a.op === 'Symbol') return a.name === b.name;
  const x = children(a), y = children(b);
  return x.length === y.length && x.every((c, i) => same(c, y[i]));
}

// Funções de uma variável reconhecidas (nome ASCII → operador MathJSON).
export const FUNCTIONS = {
  sin: 'Sin', cos: 'Cos', tan: 'Tan', sec: 'Sec', csc: 'Csc', cot: 'Cot',
  arcsin: 'Arcsin', arccos: 'Arccos', arctan: 'Arctan',
  sinh: 'Sinh', cosh: 'Cosh', tanh: 'Tanh',
  ln: 'Ln', log: 'Log', exp: 'Exp', abs: 'Abs', sqrt: 'Sqrt', root: 'Root',
};
export const FUNCTION_NAMES = Object.fromEntries(
  Object.entries(FUNCTIONS).map(([k, v]) => [v, k]),
);

// Grafias brasileiras aceitas na entrada (sen x, tg x, \\sen...).
Object.assign(FUNCTIONS, {
  sen: 'Sin', tg: 'Tan', cotg: 'Cot', cossec: 'Csc',
  arcsen: 'Arcsin', arctg: 'Arctan', senh: 'Sinh', tgh: 'Tanh',
});

export const GREEK = [
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota',
  'kappa', 'lambda', 'mu', 'nu', 'xi', 'pi', 'rho', 'sigma', 'tau', 'upsilon',
  'phi', 'chi', 'psi', 'omega', 'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi',
  'Sigma', 'Phi', 'Psi', 'Omega',
];
