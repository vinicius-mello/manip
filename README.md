# Manip

Manipulação algébrica visual de equações, pelo teclado, pensada para professores.

O professor digita uma equação (ou inequação, ou sistema) e a transforma passo a
passo: move termos de um lado para o outro, distribui, põe em evidência, junta
frações, completa quadrados… **Nada é simplificado automaticamente**: cada passo é
uma escolha explícita, com animação, e fica registrado no histórico.

**Use online:** <https://vinicius-mello.github.io/manip/>

## Recursos

- Entrada em ASCII (`2x + 3 = 7`, `sqrt(x)`, `x^(n+1)`, `log_2 x`, `sin^2 x`, `n!`, `binom(n, k)`, `sum_(k=1)^n k^2`, `prod_(k=1)^n k`) ou LaTeX (`\frac{1}{2}`, `\sqrt[3]{x}`, `\log_2 x`, `\sin^2 x`, `\binom{n}{k}`, `\sum_{k=1}^{n}`), com teclado matemático na tela.
- Navegação e seleção pelo teclado; movimento de termos com animação (o termo "pula" o sinal de igual).
- Menu de operações contextuais agrupado por assunto, com busca: calcular, distribuir, pôr em evidência, cancelar, termos semelhantes, frações, potências, binômio de Newton, produtos notáveis, radicais e racionalização, logaritmos e exponenciais, identidades trigonométricas, fatorial e número binomial, somatórios e produtórios, somar e subtrair (completar quadrados), substituir, operar nos dois lados.
- Inequações (o sentido inverte ao multiplicar por negativo; multiplicar por letra é recusado) e a operação "Estimar" (`A = B → A ≤ C`).
- Números complexos: aritmética exata, conjugado, `z·z̄ ↔ |z|²`, `z ± z̄ ↔ 2Re(z) / 2i·Im(z)`, multiplicar pelo conjugado.
- Sistemas de equações: somar e subtrair equações, substituir uma variável nas outras.
- Nomes para subexpressões, com áreas de trabalho próprias.
- Notas em cada passo e roteiro de aula: as animações ficam gravadas e se repetem no modo apresentação.
- Gravação da apresentação em vídeo (MP4 ou WebM) com a voz do professor pelo microfone, avanço manual ou automático e título de abertura.
- Exportação em LaTeX (passos em `aligned`), MathJSON e arquivo `.json`.
- Português e inglês; temas claro, escuro, quadro verde, papel e alto contraste.

## Teclas

Folha de atalhos para imprimir, com um exemplo de cada operação:
[português](https://vinicius-mello.github.io/manip/cheatsheet.html?lang=pt) ·
[English](https://vinicius-mello.github.io/manip/cheatsheet.html?lang=en) ·
PDF: [atalhos](docs/manip-atalhos.pdf) · [cheat sheet](docs/manip-cheatsheet.pdf)

As teclas seguem a ideia de um editor modal: **minúsculas, dígitos e símbolos
aplicam operações direto na fórmula** (as mesmas teclas valem no menu do Enter),
e **maiúsculas (Shift) são comandos** da interface. **?** mostra todos os atalhos.

| Tecla | Ação |
|---|---|
| ← → ↑ ↓ | navegar pela expressão |
| Ctrl + ← → / ↑ ↓ | mover o termo, passar para o outro lado / sair ou entrar no grupo |
| Shift + ← → | selecionar termos vizinhos |
| Espaço · Esc | selecionar · limpar a seleção |
| Enter | menu de operações (com prévia; `/` busca pelo nome) |
| Ctrl + Z · Ctrl + Shift + Z | desfazer · refazer |
| PgUp PgDn Home End | percorrer os passos |

**Operações:**
`c` calcular ↔ fatorar o número (12 ↔ 2²·3) · `l` termos semelhantes · `x` cancelar (opostos; fatores iguais selecionados em cima e embaixo, mesmo em frações diferentes de um produto) · `0` elemento neutro e zero (x + 0, 1·x → x; 0·x, 0/x → 0; x⁰ → 1; 1ᵏ → 1) · `r` regra de sinais ↔ sinal num fator (−ab ↔ (−a)b) · `-` trocar os sinais (A(B + C) → −A(−B − C)) ·
`d` distribuir · `e` pôr em evidência · `(` pôr entre parênteses · `p` remover parênteses · `g` agrupar ·
`q` somar e subtrair… · `s` substituir… ·
`j` frações: a/c + b/c ↔ (a + b)/c e (a/b)(c/d) ↔ ac/(bd) (com seleção: (ab)/(cd), a e c marcados → (a/c)(b/d)) ·
`*` multiplicar em cima e embaixo… (sugere o fator que racionaliza: √2, 1 − √2) ·
`^` potências e raízes: aa ↔ a², xᵃxᵇ ↔ x^(a+b), aⁿbⁿ ↔ (ab)ⁿ, (xᵃ)ᵇ ↔ x^(ab), xⁿ → x·x·…·x (expoentes numéricos já calculados), √a√b ↔ √(ab), √(a/b) ↔ √a/√b, (√a)² → a, √(a²) → |a|, √x ↔ x^(1/2) ·
`f` funções: log(ab) ↔ log a + log b, log(a/b) ↔ log a − log b, log aⁿ ↔ n log a, ln eˣ → x, e^(ln x) → x, logₐ a → 1, mudança de base; sen² + cos² = 1, tg = sen/cos, paridade, arco duplo e soma de arcos (nos dois sentidos) ·
`b` binômio/multinômio ↔ produto notável; (a + b)ⁿ ↔ Σ C(n, k) aⁿ⁻ᵏ bᵏ ·
`!` fatorial e binomial: n! ↔ n·(n − 1)!, 5! ↔ 5·4·3·2·1, n! → Π k, C(n, k) ↔ n!/(k!(n − k)!), simetria C(n, k) ↔ C(n, n − k), Stifel C(n − 1, k − 1) + C(n − 1, k) ↔ C(n, k), C(n, 0) = C(n, n) = 1 ·
`m` somatório e produtório: escrever os termos, fórmulas (Σk, Σk², Σk³, PG, ΣC(n, k) = 2ⁿ, Πk = n!), termo constante, constante para fora ↔ para dentro, Σ(f + g) ↔ Σf + Σg, telescópica, separar o último/primeiro termo ↔ incluir, juntar intervalos, deslocar o índice (`c` calcula com limites numéricos) ·
`z` conjugado · `~` z ↔ z̄̄ · `h` z·z̄ ↔ |z|² · `v` z ± z̄ · `y` multiplicar pelo conjugado ·
`=` operar nos dois lados… · `t` trocar os lados · `i` estimar… · `+` `-` somar/subtrair equações (duas selecionadas) ·
`>` substituir a variável isolada · `n` dar nome… / expandir o nome (num nome) · `w` abrir área de trabalho

Teclas de equivalência (`j`, `^`, `b`, …) funcionam nos dois sentidos: o app escolhe pela forma do que está em foco.
Quando há mais de uma forma possível, a tecla aplica a primeira e, repetida logo em seguida, troca o passo pela próxima.
No menu (Enter), cada forma aparece como um item.
As operações reconhecem o padrão também quando escrito de outro jeito equivalente como polinômio (`ab + ba` → `2ab`, `a/(bc) + d/(cb)` → `(a + d)/(bc)`, `(n − k)·(−1 − k + n)!` → `(n − k)!`); nesse caso o passo mostra a igualdade usada ("usando cb = bc"), e o professor decide se reorganiza antes.

**Comandos:**
`C` cor · `E` editar · `Y` copiar a expressão (texto) · `L` copiar LaTeX · `P` apresentação · `K` teclado na tela · `O` nota do passo ·
`R` gravar vídeo · `[` `]` `\` tamanho da fórmula · `?` atalhos

## Desenvolvimento

HTML, CSS e JavaScript puros, sem dependências nem etapa de build. O motor
simbólico é próprio (pasta `src/rules/`); MathJSON é usado como formato de troca.

```sh
npm start   # servidor local sem cache em http://127.0.0.1:8765
npm test    # testes (node --test)
npm run cheatsheet   # regenera os PDFs da folha de atalhos (usa o Chrome)
npm run publish -- "descrição"   # envia ao GitHub e atualiza o site
```

## Licença

[MIT](LICENSE) © 2026 Vinicius Mello
