# Manip

Manipulação algébrica visual de equações, pelo teclado, pensada para professores.

O professor digita uma equação (ou inequação, ou sistema) e a transforma passo a
passo: move termos de um lado para o outro, distribui, põe em evidência, junta
frações, completa quadrados… **Nada é simplificado automaticamente**: cada passo é
uma escolha explícita, com animação, e fica registrado no histórico.

**Use online:** <https://vinicius-mello.github.io/manip/>

## Recursos

- Entrada em ASCII (`2x + 3 = 7`, `sqrt(x)`, `x^(n+1)`, `log_2 x`, `sin^2 x`, `n!`, `binom(n, k)`, `sum_(k=1)^n k^2`, `prod_(k=1)^n k`, `lim_(x->0^+) 1/x`, `d/dx (x^2)`, `int_0^1 x^2 dx`, `[F]_a^b`, `f(x)`, `f'(x)`, `oo`, `a + ... + c`) ou LaTeX (`\frac{1}{2}`, `\sqrt[3]{x}`, `\log_2 x`, `\sin^2 x`, `\binom{n}{k}`, `\sum_{k=1}^{n}`, `\lim_{x\to 0}`, `\frac{d}{dx}`, `\int_0^1 … \,dx`, `\left. F \right|_a^b`, `\infty`, `\cdots`), com teclado matemático na tela.
- Navegação e seleção pelo teclado; movimento de termos com animação (o termo "pula" o sinal de igual).
- Menu de operações contextuais agrupado por assunto, com busca: calcular, distribuir, pôr em evidência, cancelar, termos semelhantes, frações, potências, binômio de Newton, produtos notáveis, radicais e racionalização, logaritmos e exponenciais, identidades trigonométricas, fatorial e número binomial, somatórios e produtórios, limites, derivadas, integrais, somar e subtrair (completar quadrados), substituir, operar nos dois lados.
- Reticências em somas e produtos (`a + … + c`, `a·…·c`): as operações termo a termo passam pelo `…` (`a(b + … + c) = ab + … + ac`, `ab + … + ac = a(b + … + c)`, `ln(a·…·c) = ln a + … + ln c`, derivada, integral e limite de `f + … + g`), e nada separa o `…` do termo ao lado dele. Com a tecla `m`, o app deduz o termo geral (`1 + 2 + … + n`, `a₁ + a₂ + … + aₙ`, `1 + r + … + rⁿ`, `1 + 1/2 + 1/3 + …`) e passa para Σ e de volta, escreve mais um termo ou o penúltimo, mostra o termo geral, inverte a ordem e soma duas sequências termo a termo (a soma de Gauss: `2S = (n + 1) + … + (n + 1) = n(n + 1)`). O passo livre confere numericamente as contas com reticências.
- Inequações (o sentido inverte ao multiplicar por negativo; multiplicar por letra é recusado) e a operação "Estimar" (`A = B → A ≤ C`).
- Números complexos: aritmética exata, conjugado, `z·z̄ ↔ |z|²`, `z ± z̄ ↔ 2Re(z) / 2i·Im(z)`, multiplicar pelo conjugado.
- Sistemas de equações: somar e subtrair equações, substituir uma variável nas outras.
- Hipóteses ("seja …"): `A in M(2, 3)`, `A, B in M(n)`, `v in R^3`, `n in N`, `seja x > 0` (LaTeX `A \in M_{2\times 3}`). Matrizes não comutam (nenhum passo troca AB por BA: os passos com matrizes são conferidos numericamente), dimensões incompatíveis são recusadas, `A^(-1) *` no `=` multiplica à esquerda; com `x > 0`, multiplicar uma inequação por x é aceito ("usando x > 0") e √(x²) → x.
- Matrizes (`[1, 2; 3, 4]`) e determinantes (`|1, 2; 3, 4|`, `det A`, LaTeX `pmatrix`/`vmatrix`): desenvolver por uma linha ou coluna (Laplace) ou por Sarrus, fator comum de uma linha ou coluna, Lⱼ ← Lⱼ ± k·Lᵢ, trocar linhas ou colunas (com troca de sinal), transpor, número vezes matriz; `c` calcula determinantes numéricos e as entradas. Soma (`j`) e produto linha × coluna (`#`) de matrizes, transposta `[…]^T`; escalonamento com `∼` (Lⱼ ← Lⱼ ± k·Lᵢ, Lᵢ ← k·Lᵢ, trocar linhas), mostrando A ∼ A′; sistema linear ↔ matriz aumentada [A | b] (`#`). Inversa `A^(-1)`: fórmula 2×2, Gauss-Jordan em [A | I] e, para AX = B, A⁻¹A = I (`x`) e IX = X (`0`); identidade `Id`. Vetores `(1, 2, 3)` e `vec v`: produto escalar, produto vetorial pelo determinante |i⃗ j⃗ k⃗; u; v|, norma, a·i⃗ + b·j⃗ + c·k⃗ ↔ (a, b, c).
- Nomes para subexpressões, com áreas de trabalho próprias; definições auxiliares digitadas (`K := x^2 + 1`) em abas novas; derivada parcial em relação a uma variável (os dois membros de uma igualdade), com `∂ₓK` para nomes e a expansão que calcula a derivada; busca reversa (a seleção que é a definição de um nome vira o nome).
- Modo apresentação com os passos anteriores empilhados e a justificativa de cada um ("↓ regra da cadeia") entre os passos.
- Notas em cada passo e roteiro de aula: as animações ficam gravadas e se repetem no modo apresentação.
- Gravação da apresentação em vídeo (MP4 ou WebM) com a voz do professor pelo microfone, avanço manual ou automático e título de abertura.
- Exportação em LaTeX (passos em `aligned`), MathJSON e arquivo `.json`.
- Português e inglês; temas claro, escuro, quadro verde, papel e alto contraste.

## Teclas

Folha de atalhos para imprimir, com um exemplo de cada operação:
[português](https://vinicius-mello.github.io/manip/cheatsheet.html?lang=pt) ·
[English](https://vinicius-mello.github.io/manip/cheatsheet.html?lang=en) ·
PDF: [atalhos](docs/manip-atalhos.pdf) · [cheat sheet](docs/manip-cheatsheet.pdf)

Manual completo da aplicação (todos os recursos, com exemplos calculados pelo app):
[português](https://vinicius-mello.github.io/manip/manual.html?lang=pt) ·
[English](https://vinicius-mello.github.io/manip/manual.html?lang=en) ·
PDF: [manual](docs/manip-manual.pdf) · [user manual](docs/manip-manual-en.pdf)

As teclas seguem a ideia de um editor modal: **minúsculas, dígitos e símbolos
aplicam operações direto na fórmula** (as mesmas teclas valem no menu do Enter),
e **maiúsculas (Shift) são comandos** da interface. **?** (ou o botão Ajuda) abre a ajuda, com uma aba de atalhos e outra com a sintaxe completa da entrada.

| Tecla | Ação |
|---|---|
| ← → ↑ ↓ | navegar pela expressão |
| Ctrl + ← → / ↑ ↓ | mover o termo, passar para o outro lado / sair ou entrar no grupo |
| Shift + ← → | selecionar termos vizinhos |
| Shift + ↑ ↓ | selecionar uma coluna (matriz ou determinante) |
| Espaço · Esc | selecionar · limpar a seleção |
| Enter | menu de operações (com prévia; `/` busca pelo nome) |
| Ctrl + Z · Ctrl + Shift + Z | desfazer · refazer |
| PgUp PgDn Home End | percorrer os passos |

**Operações:**
`c` calcular ↔ fatorar o número (12 ↔ 2²·3) · `l` termos semelhantes · `x` cancelar (opostos; fatores iguais selecionados em cima e embaixo, mesmo em frações diferentes de um produto) · `0` elemento neutro e zero (x + 0, 1·x → x; 0·x, 0/x → 0; x⁰ → 1; 1ᵏ → 1) · `r` regra de sinais ↔ sinal num fator (−ab ↔ (−a)b) · `-` trocar os sinais (A(B + C) → −A(−B − C); a − (b + c) ↔ a + (−b − c); a − ∫ f dx ↔ a + ∫ −f dx; a − Σ f ↔ a + Σ −f) ·
`d` distribuir · `e` pôr em evidência · `(` pôr entre parênteses · `p` remover parênteses · `g` agrupar ·
`q` somar e subtrair… · `o` passo livre: digitar a nova forma do foco, como no quadro; o app confere numericamente (expressão: mesmo valor em vários pontos, com um contraexemplo se não for; equação: proporcional à original, então vale mover termos, trocar os lados e multiplicar por número; inequação: com o sentido certo) e marca "não conferida" quando não dá para calcular · `s` substituir… ·
`j` frações: a/c + b/c ↔ (a + b)/c e (a/b)(c/d) ↔ ac/(bd) (com seleção: (ab)/(cd), a e c marcados → (a/c)(b/d)) ·
`*` multiplicar em cima e embaixo… (sugere o fator que racionaliza: √2, 1 − √2) ·
`^` potências e raízes: aa ↔ a², xᵃxᵇ ↔ x^(a+b), aⁿbⁿ ↔ (ab)ⁿ, (xᵃ)ᵇ ↔ x^(ab), xⁿ → x·x·…·x (expoentes numéricos já calculados), √a√b ↔ √(ab), √(a/b) ↔ √a/√b, (√a)² → a, √(a²) → |a|, √x ↔ x^(1/2) ·
`f` funções: log(ab) ↔ log a + log b, log(a/b) ↔ log a − log b, log aⁿ ↔ n log a, ln eˣ → x, e^(ln x) → x, logₐ a → 1, mudança de base; valores notáveis de sen, cos, tg, sec, cossec e cotg nos múltiplos de π/6 e π/4 (sen(π/6) → 1/2, cos(2π/3) → −1/2, tg(π/2) recusada) e de arcsen, arccos e arctg (arcsen(1/2) → π/6); sen² + cos² = 1, tg = sen/cos, paridade, arco duplo e soma de arcos (nos dois sentidos) ·
`b` binômio/multinômio ↔ produto notável; (a + b)ⁿ ↔ Σ C(n, k) aⁿ⁻ᵏ bᵏ ·
`!` fatorial e binomial: n! ↔ n·(n − 1)!, 5! ↔ 5·4·3·2·1, n! → Π k, C(n, k) ↔ n!/(k!(n − k)!), simetria C(n, k) ↔ C(n, n − k), Stifel C(n − 1, k − 1) + C(n − 1, k) ↔ C(n, k), C(n, 0) = C(n, n) = 1 ·
`m` somatório e produtório: escrever os termos, fórmulas (Σk, Σk², Σk³, PG, ΣC(n, k) = 2ⁿ, Πk = n!), termo constante, constante para fora ↔ para dentro, Σ(f + g) ↔ Σf + Σg, telescópica, separar o último/primeiro termo ↔ incluir, juntar intervalos, deslocar o índice (`c` calcula com limites numéricos) ·
`'` derivadas: (f + g)′, constante para fora ↔ para dentro, potência, produto, quociente, cadeia (deixa d/dx u por fazer), exponencial, tabela (sen, cos, tg, ln, log, √, arcos…), f(x) → f′(x) ↔ d/dx f(x), ordem superior, definição pelo limite ·
`a` limites: substituição direta (recusada em 0/0, divisão por zero e pontos infinitos), limite de constante, propriedades (soma, constante, produto, quociente com denominador ≠ 0, potência), limites notáveis (sen u/u, (eᵘ − 1)/u, (1 + k/x)ˣ → eᵏ…), c/xⁿ → 0 no infinito, L'Hôpital em 0/0 e ∞/∞ (deixa as derivadas por fazer), troca de variável (x = a + h, x = 1/t), lim (f(x + h) − f(x))/h → d/dx f ·
`u` integrais: tabela de primitivas (o `+ C` entra quando não sobra integral indefinida), linearidade nos dois sentidos, ∫ₐᵇ f → [F]ₐᵇ → F(b) − F(a), ∫ₐᵃ = 0, juntar intervalos; sem nenhuma dessas formas, pede a substituição `u = g(x)` (conferida numericamente; na definida os limites viram g(a) e g(b)); no menu, por partes (`u = …`, ∫ u dv = uv − ∫ v du), inverter os limites e soma de Riemann; d/dx ∫ₐ^g(x) f(t) dt pelo teorema fundamental (tecla `'`) ·
`z` conjugado · `~` z ↔ z̄̄ · `h` z·z̄ ↔ |z|² · `v` z ± z̄ · `y` multiplicar pelo conjugado ·
`=` operar nos dois lados… · `t` trocar os lados · `i` estimar… · `+` `-` somar/subtrair equações (duas selecionadas) ·
`>` substituir a variável isolada ·
matrizes e determinantes: `d` desenvolver (linha em foco, coluna selecionada; num 2×2, ad − bc; repetindo, Sarrus) e k·[…] → entradas multiplicadas · `e` fator comum (linha, coluna ou matriz inteira) · `+` `-` Lⱼ ± k·Lᵢ… (duas linhas selecionadas) · Ctrl + ↑ ↓ / ← → trocar linhas / colunas (o determinante troca de sinal) · `#` transpor (det A = det Aᵀ, […]^T), produto linha × coluna, sistema ↔ matriz aumentada, inversa (2×2 ou Gauss-Jordan) · `x` A⁻¹A = I · `0` IX = X · vetores com `#`: produto escalar e vetorial, norma, coordenadas ↔ base · `j` soma de matrizes ↔ separar · `*` Lᵢ ← k·Lᵢ… · `c` calcular as entradas (linha ou matriz) · numa matriz sozinha, as operações de linha mostram A ∼ A′ · `n` dar nome… / expandir o nome (num nome) · `w` abrir área de trabalho

Teclas de equivalência (`j`, `^`, `b`, …) funcionam nos dois sentidos: o app escolhe pela forma do que está em foco.
Quando há mais de uma forma possível, a tecla aplica a primeira e, repetida logo em seguida, troca o passo pela próxima.
No menu (Enter), cada forma aparece como um item.
As operações reconhecem o padrão também quando escrito de outro jeito equivalente como polinômio (`ab + ba` → `2ab`, `a/(bc) + d/(cb)` → `(a + d)/(bc)`, `(n − k)·(−1 − k + n)!` → `(n − k)!`); nesse caso o passo mostra a igualdade usada ("usando cb = bc"), e o professor decide se reorganiza antes.

**Comandos:**
`C` cor · `E` editar · `Y` copiar a expressão (texto) · `L` copiar LaTeX · `P` apresentação · `K` teclado na tela · `O` nota do passo ·
`R` gravar vídeo · `[` `]` `\` tamanho da fórmula · `?` ajuda (atalhos e sintaxe da entrada, também no botão Ajuda)

## Desenvolvimento

HTML, CSS e JavaScript puros, sem dependências nem etapa de build. O motor
simbólico é próprio (pasta `src/rules/`); MathJSON é usado como formato de troca.

```sh
npm start   # servidor local sem cache em http://127.0.0.1:8765
npm test    # testes (node --test)
npm run cheatsheet   # regenera os PDFs da folha de atalhos (usa o Chrome)
npm run manual       # regenera os PDFs do manual (usa o Chrome)
npm run publish -- "descrição"   # envia ao GitHub e atualiza o site
```

## Licença

[MIT](LICENSE) © 2026 Vinicius Mello
