# Manip

Manipulação algébrica visual de equações, pelo teclado, pensada para professores.

O professor digita uma equação (ou inequação, ou sistema) e a transforma passo a
passo: move termos de um lado para o outro, distribui, põe em evidência, junta
frações, completa quadrados… **Nada é simplificado automaticamente**: cada passo é
uma escolha explícita, com animação, e fica registrado no histórico.

**Use online:** <https://vinicius-mello.github.io/manip/>

## Recursos

- Entrada em ASCII (`2x + 3 = 7`, `sqrt(x)`, `x^(n+1)`) ou LaTeX (`\frac{1}{2}`, `\sqrt[3]{x}`), com teclado matemático na tela.
- Navegação e seleção pelo teclado; movimento de termos com animação (o termo "pula" o sinal de igual).
- Menu de operações contextuais agrupado por assunto, com busca: calcular, distribuir, pôr em evidência, cancelar, termos semelhantes, frações, potências, binômio de Newton, produtos notáveis, somar e subtrair (completar quadrados), substituir, operar nos dois lados.
- Inequações (o sentido inverte ao multiplicar por negativo; multiplicar por letra é recusado) e a operação "Estimar" (`A = B → A ≤ C`).
- Números complexos: aritmética exata, conjugado, `z·z̄ ↔ |z|²`, `z ± z̄ ↔ 2Re(z) / 2i·Im(z)`, multiplicar pelo conjugado.
- Sistemas de equações: somar e subtrair equações, substituir uma variável nas outras.
- Nomes para subexpressões, com áreas de trabalho próprias.
- Notas em cada passo e roteiro de aula: as animações ficam gravadas e se repetem no modo apresentação.
- Exportação em LaTeX (passos em `aligned`), MathJSON e arquivo `.json`.
- Português e inglês; temas claro, escuro, quadro verde, papel e alto contraste.

## Principais teclas

| Tecla | Ação |
|---|---|
| ← → ↑ ↓ | navegar pela expressão |
| Ctrl + ← → | mover o termo / passar para o outro lado |
| Shift + ← → | selecionar termos vizinhos |
| Espaço | selecionar |
| Enter | operações (`/` busca pelo nome) |
| ( | pôr entre parênteses |
| S · N · O | substituir · dar nome · nota do passo |
| Ctrl + Z | desfazer |
| PgUp PgDn Home End | percorrer os passos |
| P · K | apresentação · teclado na tela |
| ? | todos os atalhos |

## Desenvolvimento

HTML, CSS e JavaScript puros, sem dependências nem etapa de build. O motor
simbólico é próprio (pasta `src/rules/`); MathJSON é usado como formato de troca.

```sh
npm start   # servidor local sem cache em http://127.0.0.1:8765
npm test    # testes (node --test)
npm run publish -- "descrição"   # envia ao GitHub e atualiza o site
```
