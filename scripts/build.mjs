import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { games } from '../src/games.js';
const escape = text => text.replace(/[&<>\"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
const shell = (title,content) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#1c1e20"><title>${escape(title)} — CAIL Games</title><link rel="icon" href="/assets/cail-logo-white.png"><link rel="stylesheet" href="/assets/suite-ui.css"><link rel="stylesheet" href="/src/styles.css"></head>
<body><a class="skip-link" href="#main">Skip to content</a><div class="grid-background" aria-hidden="true"></div><div class="site-shell"><header class="site-header"><a class="brand" href="/" aria-label="CAIL Games home"><img src="/assets/cail-logo-white.png" width="1154" height="259" alt="CUNY AI Lab"><span>Games</span></a><nav aria-label="CUNY account"><a class="login-link" href="/my-work/">CUNY Login</a></nav></header>${content}<footer class="site-footer"><a href="https://ailab.gc.cuny.edu/">CUNY AI Lab</a><span>Critical play with artificial intelligence</span></footer></div></body></html>`;
await rm('dist', { recursive: true, force: true });
await mkdir('dist/src', { recursive: true });
await cp('public', 'dist', { recursive: true });
await cp('src/styles.css', 'dist/src/styles.css');
const cards = games.map(game => `<a class="game accent-${game.accent}" href="/${game.id}/" aria-labelledby="${game.id}-title" aria-describedby="${game.id}-description"><h2 id="${game.id}-title">${escape(game.title)}</h2><p id="${game.id}-description">${escape(game.teaser)}</p><span class="game-action">View game <span class="arrow" aria-hidden="true">→</span></span></a>`).join('');
await writeFile('dist/index.html',shell('inference arcade',`<main id="main"><section class="intro"><h1>inference arcade</h1></section><section class="collection" aria-label="Game collection">${cards}</section></main>`));
for (const game of games) {
  await mkdir(`dist/${game.id}`,{recursive:true});
  await writeFile(`dist/${game.id}/index.html`,shell(game.title,`<main id="main" class="project accent-${game.accent}"><a class="back-link" href="/">All games</a><div class="project-grid"><header class="project-identity"><h1>${escape(game.title)}</h1><p class="project-author">By ${escape(game.author)}</p><a class="project-source" href="${game.github}">GitHub <span aria-hidden="true">↗</span></a><a class="launch" href="/play/${game.id}/">Play ${escape(game.title)} <span aria-hidden="true">↗</span></a>${game.note?`<p class="project-note">${escape(game.note)}</p>`:''}</header><div class="project-description">${game.paragraphs.map(p=>`<p>${escape(p)}</p>`).join('')}${game.credit?`<p class="project-credit">${escape(game.credit)}</p>`:''}</div></div></main>`));
}
// Keep the source preview identical to the built catalog.
await writeFile('index.html',await (await import('node:fs/promises')).readFile('dist/index.html','utf8'));
console.log('Built arcade and five project pages');
