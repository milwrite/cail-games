import { cp, mkdir, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('public', 'dist', { recursive: true });
await mkdir('dist/src', { recursive: true });
await cp('src/styles.css', 'dist/src/styles.css');
await cp('index.html', 'dist/index.html');
console.log('Built static arcade in dist');
