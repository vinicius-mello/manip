// Textos da interface em português e inglês.
//
// t(chave, parâmetros) devolve o texto no idioma atual. Rótulos que ficam
// guardados (passos do histórico) são salvos como msg(chave, parâmetros) e
// só viram texto na hora de mostrar, com fmt(), para que trocar de idioma
// traduza também o que já foi feito.

const STRINGS = {
  pt: {
    // interface fixa (index.html)
    'ui.input': 'Equação',
    'ui.input.ph': 'Digite uma equação em ASCII ou LaTeX, ex.: 2x + 3 = 7',
    'ui.settings': 'Ajustes',
    'ui.speed': 'Animação',
    'ui.speed.normal': 'normal',
    'ui.speed.slow': 'aula (lenta)',
    'ui.speed.off': 'desligada',
    'ui.theme': 'Tema',
    'theme.auto': 'automático',
    'theme.light': 'claro',
    'theme.dark': 'escuro',
    'theme.chalk': 'quadro verde',
    'theme.paper': 'papel',
    'theme.contrast': 'alto contraste',
    'ui.lang': 'Idioma',
    'ui.long': 'Expressões longas',
    'long.wrap': 'quebrar linhas',
    'long.scroll': 'rolar',
    'keys.zoom': 'tamanho',
    'keys.more': 'todos os atalhos',
    'keys.less': 'menos atalhos',
    'toast.zoom': 'Tamanho da fórmula: {pct}%',
    'ui.keyboard': 'Teclado',
    'ui.keyboard.title': 'Teclado matemático (K)',
    'ui.export': 'Exportar',
    'ui.export.latex': 'Copiar LaTeX dos passos',
    'ui.export.mathjson': 'Copiar MathJSON',
    'ui.export.save': 'Salvar arquivo .json',
    'ui.export.open': 'Abrir arquivo .json',
    'ui.tabs': 'Áreas de trabalho',
    'ui.stage': 'Equação: use as setas para navegar',
    'ui.names': 'Nomes',
    'ui.steps': 'Passos',
    'ui.kbd': 'Teclado matemático',
    'keys.nav': 'navegar',
    'keys.move': 'mover / passar para o outro lado',
    'keys.group': 'sair / entrar no grupo',
    'keys.extend': 'selecionar vizinhos',
    'keys.space': 'Espaço',
    'keys.select': 'selecionar',
    'keys.ops': 'operações',
    'keys.subst': 'substituir',
    'keys.name': 'dar nome',
    'keys.tabs': 'áreas de trabalho',
    'keys.color': 'colorir',
    'keys.edit': 'editar',
    'keys.latex': 'copiar LaTeX',
    'keys.present': 'apresentação',
    'keys.keyboard': 'teclado',
    'keys.undo': 'desfazer',

    // mensagens
    'tab.main': 'Principal',
    'names.open': 'Abrir {name}',
    'toast.copied': '{what} copiado',
    'what.latex': 'LaTeX',
    'what.latexSteps': 'LaTeX dos passos',
    'what.mathjson': 'MathJSON',
    'toast.presenting': 'Apresentação: P ou Esc para sair · PgUp/PgDn percorrem os passos',
    'toast.noOps': 'Nenhuma operação se aplica aqui',
    'toast.opened': 'Aberto: {name}',
    'toast.openFail': 'Não foi possível abrir: {err}',
    'err.invalidFile': 'arquivo inválido',
    'menu.enterToType': 'Enter para digitar',
    'kb.preview': 'prévia da fórmula',
    'kb.left': 'cursor para a esquerda',
    'kb.right': 'cursor para a direita',
    'kb.back': 'apagar',
    'kb.next': 'próximo campo (Tab)',
    'kb.enter': 'confirmar',

    // erros de leitura
    'err.unexpectedChar': 'Caractere inesperado “{c}”',
    'err.subNoVar': 'Subscrito sem variável',
    'err.badSub': 'Subscrito inválido',
    'err.unknownCmd': 'Comando “\\{name}” desconhecido',
    'err.unknownFn': 'Função desconhecida',
    'err.missing': 'Faltou “{t}”',
    'err.expected': 'Esperava “{t}”',
    'err.arity': 'Esperava {n} argumento(s)',
    'err.incomplete': 'Expressão incompleta',
    'err.unexpected': '“{t}” inesperado',

    // operações do menu
    'rule.calc': 'Calcular',
    'rule.dist': 'Distribuir',
    'rule.factor': 'Pôr em evidência',
    'rule.cancel': 'Cancelar',
    'rule.neutral': 'Remover elemento neutro',
    'rule.signs': 'Regra de sinais',
    'rule.parens': 'Remover parênteses',
    'rule.group': 'Agrupar seleção',
    'rule.join': 'Juntar frações',
    'rule.split': 'Separar fração',
    'rule.powers': 'Propriedade de potências',
    'rule.binomial': 'Expandir potência (binômio / multinomial)',
    'rule.asproduct': 'Escrever potência como produto',
    'rule.expand': 'Expandir o nome',
    'rule.open': 'Abrir em área de trabalho',
    'rule.addsub': 'Somar e subtrair…',
    'rule.addsub.ph': 'quantidade, ex.: 9   (b/2)^2',
    'rule.addsub.hint': 'a quantidade (ASCII ou LaTeX)',
    'rule.subst': 'Substituir por…',
    'rule.subst.ph': 'nova expressão, ex.: 2a + 1   \\frac{1}{2}',
    'rule.subst.hint': 'expressão (ASCII ou LaTeX)',
    'rule.name': 'Dar nome…',
    'rule.name.ph': 'nome, ex.: K   A_1',
    'rule.name.hint': 'uma letra (com subscrito opcional) ainda não usada',
    'rule.sides': 'Operar nos dois lados…',
    'rule.sides.ph': 'ex.: + 3   − x   · 2   / (x + 1)   ^ 2',
    'rule.sides.hint': 'operador seguido de uma expressão',
    'rule.swap': 'Trocar os lados',

    // passos do histórico
    'step.input': 'entrada',
    'step.color': 'mudou a cor',
    'step.definition': 'definição',
    'step.reorder': 'reordenou',
    'step.transposeSide': 'passou o lado inteiro',
    'step.transposeTerm': 'passou o termo para o outro lado',
    'step.transposeFactor': 'passou o fator dividindo',
    'step.transposeDen': 'passou o denominador multiplicando',
    'step.ungroup': 'tirou do grupo',
    'step.intoGroup': 'colocou no grupo',
    'step.calc': 'calculou',
    'step.distSign': 'distribuiu o sinal',
    'step.dist': 'distribuiu',
    'step.factor': 'pôs em evidência',
    'step.cancelTerms': 'cancelou termos opostos',
    'step.cancelFactors': 'cancelou fatores iguais',
    'step.neutral': 'removeu elemento neutro',
    'step.parens': 'removeu parênteses',
    'step.group': 'agrupou',
    'step.join': 'juntou as frações',
    'step.split': 'separou a fração',
    'step.doubleNeg': 'menos com menos dá mais',
    'step.signs': 'regra de sinais',
    'step.expAdd': 'somou os expoentes',
    'step.expSub': 'subtraiu os expoentes',
    'step.powPow': 'potência de potência',
    'step.binomial': 'binômio de Newton',
    'step.multinomial': 'expansão multinomial',
    'step.asProduct': 'escreveu a potência como produto',
    'step.sides': '{op} {e} nos dois lados',
    'step.swap': 'trocou os lados',
    'step.subst': 'substituiu por {e}',
    'step.addsub': 'somou e subtraiu {q}',
    'step.name': 'chamou de {name}',
    'step.expand': 'expandiu {name}',
    'step.open': 'abrir {name}',
  },

  en: {
    'ui.input': 'Equation',
    'ui.input.ph': 'Type an equation in ASCII or LaTeX, e.g. 2x + 3 = 7',
    'ui.settings': 'Settings',
    'ui.speed': 'Animation',
    'ui.speed.normal': 'normal',
    'ui.speed.slow': 'classroom (slow)',
    'ui.speed.off': 'off',
    'ui.theme': 'Theme',
    'theme.auto': 'automatic',
    'theme.light': 'light',
    'theme.dark': 'dark',
    'theme.chalk': 'chalkboard',
    'theme.paper': 'paper',
    'theme.contrast': 'high contrast',
    'ui.lang': 'Language',
    'ui.long': 'Long expressions',
    'long.wrap': 'wrap lines',
    'long.scroll': 'scroll',
    'keys.zoom': 'size',
    'keys.more': 'all shortcuts',
    'keys.less': 'fewer shortcuts',
    'toast.zoom': 'Formula size: {pct}%',
    'ui.keyboard': 'Keyboard',
    'ui.keyboard.title': 'Math keyboard (K)',
    'ui.export': 'Export',
    'ui.export.latex': 'Copy LaTeX of the steps',
    'ui.export.mathjson': 'Copy MathJSON',
    'ui.export.save': 'Save .json file',
    'ui.export.open': 'Open .json file',
    'ui.tabs': 'Workspaces',
    'ui.stage': 'Equation: use the arrow keys to navigate',
    'ui.names': 'Names',
    'ui.steps': 'Steps',
    'ui.kbd': 'Math keyboard',
    'keys.nav': 'navigate',
    'keys.move': 'move / take to the other side',
    'keys.group': 'leave / enter group',
    'keys.extend': 'select neighbors',
    'keys.space': 'Space',
    'keys.select': 'select',
    'keys.ops': 'operations',
    'keys.subst': 'substitute',
    'keys.name': 'name',
    'keys.tabs': 'workspaces',
    'keys.color': 'color',
    'keys.edit': 'edit',
    'keys.latex': 'copy LaTeX',
    'keys.present': 'present',
    'keys.keyboard': 'keyboard',
    'keys.undo': 'undo',

    'tab.main': 'Main',
    'names.open': 'Open {name}',
    'toast.copied': '{what} copied',
    'what.latex': 'LaTeX',
    'what.latexSteps': 'LaTeX of the steps',
    'what.mathjson': 'MathJSON',
    'toast.presenting': 'Presentation: P or Esc to leave · PgUp/PgDn go through the steps',
    'toast.noOps': 'No operation applies here',
    'toast.opened': 'Opened: {name}',
    'toast.openFail': 'Could not open: {err}',
    'err.invalidFile': 'invalid file',
    'menu.enterToType': 'Enter to type',
    'kb.preview': 'formula preview',
    'kb.left': 'cursor left',
    'kb.right': 'cursor right',
    'kb.back': 'delete',
    'kb.next': 'next slot (Tab)',
    'kb.enter': 'confirm',

    'err.unexpectedChar': 'Unexpected character “{c}”',
    'err.subNoVar': 'Subscript without a variable',
    'err.badSub': 'Invalid subscript',
    'err.unknownCmd': 'Unknown command “\\{name}”',
    'err.unknownFn': 'Unknown function',
    'err.missing': 'Missing “{t}”',
    'err.expected': 'Expected “{t}”',
    'err.arity': 'Expected {n} argument(s)',
    'err.incomplete': 'Incomplete expression',
    'err.unexpected': 'Unexpected “{t}”',

    'rule.calc': 'Calculate',
    'rule.dist': 'Distribute',
    'rule.factor': 'Factor out',
    'rule.cancel': 'Cancel',
    'rule.neutral': 'Remove identity element',
    'rule.signs': 'Sign rule',
    'rule.parens': 'Remove parentheses',
    'rule.group': 'Group selection',
    'rule.join': 'Combine fractions',
    'rule.split': 'Split fraction',
    'rule.powers': 'Power rule',
    'rule.binomial': 'Expand power (binomial / multinomial)',
    'rule.asproduct': 'Write power as a product',
    'rule.expand': 'Expand the name',
    'rule.open': 'Open in workspace',
    'rule.addsub': 'Add and subtract…',
    'rule.addsub.ph': 'quantity, e.g. 9   (b/2)^2',
    'rule.addsub.hint': 'the quantity (ASCII or LaTeX)',
    'rule.subst': 'Substitute with…',
    'rule.subst.ph': 'new expression, e.g. 2a + 1   \\frac{1}{2}',
    'rule.subst.hint': 'expression (ASCII or LaTeX)',
    'rule.name': 'Name it…',
    'rule.name.ph': 'name, e.g. K   A_1',
    'rule.name.hint': 'one letter (optional subscript) not yet used',
    'rule.sides': 'Apply to both sides…',
    'rule.sides.ph': 'e.g. + 3   − x   · 2   / (x + 1)   ^ 2',
    'rule.sides.hint': 'an operator followed by an expression',
    'rule.swap': 'Swap sides',

    'step.input': 'input',
    'step.color': 'changed color',
    'step.definition': 'definition',
    'step.reorder': 'reordered',
    'step.transposeSide': 'moved the whole side',
    'step.transposeTerm': 'moved the term to the other side',
    'step.transposeFactor': 'moved the factor as a divisor',
    'step.transposeDen': 'moved the denominator as a factor',
    'step.ungroup': 'took out of the group',
    'step.intoGroup': 'put into the group',
    'step.calc': 'calculated',
    'step.distSign': 'distributed the sign',
    'step.dist': 'distributed',
    'step.factor': 'factored out',
    'step.cancelTerms': 'cancelled opposite terms',
    'step.cancelFactors': 'cancelled equal factors',
    'step.neutral': 'removed identity element',
    'step.parens': 'removed parentheses',
    'step.group': 'grouped',
    'step.join': 'combined the fractions',
    'step.split': 'split the fraction',
    'step.doubleNeg': 'minus times minus is plus',
    'step.signs': 'sign rule',
    'step.expAdd': 'added the exponents',
    'step.expSub': 'subtracted the exponents',
    'step.powPow': 'power of a power',
    'step.binomial': 'binomial theorem',
    'step.multinomial': 'multinomial expansion',
    'step.asProduct': 'wrote the power as a product',
    'step.sides': '{op} {e} on both sides',
    'step.swap': 'swapped sides',
    'step.subst': 'substituted with {e}',
    'step.addsub': 'added and subtracted {q}',
    'step.name': 'called it {name}',
    'step.expand': 'expanded {name}',
    'step.open': 'open {name}',
  },
};

export const LANGS = { pt: 'Português', en: 'English' };

// Nomes de funções como se escrevem em cada idioma (no Brasil: sen, tg...).
const FUNCTION_LABELS = {
  pt: {
    Sin: 'sen', Tan: 'tg', Cot: 'cotg', Csc: 'cossec',
    Arcsin: 'arcsen', Arctan: 'arctg', Sinh: 'senh', Tanh: 'tgh',
  },
  en: {},
};

const LANG_KEY = 'manip.lang';

function detect() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved in STRINGS) return saved;
  } catch { /* sem armazenamento */ }
  const nav = globalThis.navigator?.language ?? 'pt';
  return nav.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

let lang = detect();
const listeners = [];

export const getLang = () => lang;

export function setLang(next) {
  if (!(next in STRINGS) || next === lang) return;
  lang = next;
  try { localStorage.setItem(LANG_KEY, next); } catch { /* sem armazenamento */ }
  if (globalThis.document) document.documentElement.lang = next === 'pt' ? 'pt-BR' : 'en';
  listeners.forEach((f) => f(lang));
}

export const onLangChange = (f) => listeners.push(f);

export function t(key, params = {}) {
  const s = STRINGS[lang][key] ?? STRINGS.pt[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? '');
}

export const msg = (key, params) => (params ? { key, params } : { key });
export const fmt = (m) => (typeof m === 'string' ? m : t(m.key, m.params));

export const functionLabel = (op, fallback) => FUNCTION_LABELS[lang][op] ?? fallback;

// Traduz os elementos marcados no HTML: data-i18n (texto),
// data-i18n-placeholder, data-i18n-title e data-i18n-aria (aria-label).
export function translateDom(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((e) => { e.textContent = t(e.dataset.i18n); });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((e) => { e.placeholder = t(e.dataset.i18nPlaceholder); });
  root.querySelectorAll('[data-i18n-title]').forEach((e) => { e.title = t(e.dataset.i18nTitle); });
  root.querySelectorAll('[data-i18n-aria]').forEach((e) => e.setAttribute('aria-label', t(e.dataset.i18nAria)));
}
