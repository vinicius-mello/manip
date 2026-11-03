// Publica o Manip: envia este repositório ao GitHub e atualiza a cópia no
// site pessoal (vinicius-mello.github.io/manip/).
//
// Uso: npm run publish -- "descrição curta da mudança"
//
// Exige que o Manip esteja todo commitado (a cópia publicada corresponde a
// um commit) e que o repositório do site esteja limpo.

import { execFileSync } from 'node:child_process';
import { cpSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const site = process.env.MANIP_SITE ?? join(homedir(), 'code', 'vinicius-mello.github.io');
const dest = join(site, 'manip');
const FILES = ['index.html', 'cheatsheet.html', 'style.css', 'src', 'docs'];
const today = new Date().toISOString().slice(0, 10);

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const fail = (msg) => {
  console.error(`publish: ${msg}`);
  process.exit(1);
};

const description = process.argv.slice(2).join(' ').trim()
  || git(root, 'log', '-1', '--format=%s');

if (!existsSync(join(site, '.git'))) fail(`repositório do site não encontrado em ${site}`);
if (git(root, 'status', '--porcelain')) fail('há mudanças não commitadas no Manip');
if (git(site, 'status', '--porcelain')) fail('há mudanças não commitadas no site');

// 1. Manip → GitHub
git(root, 'push', '-q', 'origin', 'HEAD');
const sha = git(root, 'rev-parse', '--short', 'HEAD');

// 2. Cópia dos arquivos do app (src/ é recriada: arquivos removidos somem)
git(site, 'pull', '-q', '--ff-only');
for (const dir of ['src', 'docs']) rmSync(join(dest, dir), { recursive: true, force: true });
for (const f of FILES) cpSync(join(root, f), join(dest, f), { recursive: true });

// 3. Data no sitemap
const sitemapPath = join(site, 'sitemap.xml');
const sitemap = readFileSync(sitemapPath, 'utf8').replace(
  /(<loc>https:\/\/vinicius-mello\.github\.io\/manip\/<\/loc><lastmod>)[^<]*(<\/lastmod>)/,
  `$1${today}$2`,
);
writeFileSync(sitemapPath, sitemap);

// 4. Commit e envio do site
git(site, 'add', 'manip', 'sitemap.xml');
if (!git(site, 'status', '--porcelain')) {
  console.log(`publish: o site já estava atualizado (manip@${sha})`);
  process.exit(0);
}
git(site, 'commit', '-q', '-m', `Manip: ${description} (manip@${sha})`);
git(site, 'push', '-q', 'origin', 'HEAD');
console.log(`publish: manip@${sha} enviado ao GitHub e ao site — https://vinicius-mello.github.io/manip/`);
