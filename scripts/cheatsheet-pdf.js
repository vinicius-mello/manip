// Gera os PDFs da folha de atalhos (docs/) com o Chrome sem janela.
// Uso: npm run cheatsheet   (sobe um servidor local temporário)

import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = 8799;
const chrome = process.env.CHROME ?? 'google-chrome-stable';
const server = spawn(process.execPath, [join(root, 'scripts', 'serve.js'), String(port)], { stdio: 'ignore' });
const profile = mkdtempSync(join(tmpdir(), 'manip-pdf-'));

try {
  await new Promise((r) => setTimeout(r, 500));
  for (const [lang, name] of [['pt', 'manip-atalhos'], ['en', 'manip-cheatsheet']]) {
    execFileSync(chrome, [
      '--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${profile}`,
      '--no-pdf-header-footer', '--virtual-time-budget=8000',
      `--print-to-pdf=${join(root, 'docs', `${name}.pdf`)}`,
      `http://127.0.0.1:${port}/cheatsheet.html?lang=${lang}`,
    ], { stdio: 'ignore' });
    console.log(`docs/${name}.pdf`);
  }
} finally {
  server.kill();
  rmSync(profile, { recursive: true, force: true });
}
