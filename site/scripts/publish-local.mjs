// Compila el sitio y lo copia a .stable/, la carpeta que sirve el servidor estable.
// Si el build falla, .stable/ no se toca: la versión que estás viendo sigue funcionando.
import { execSync } from 'node:child_process';
import { cpSync, existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const dist = join(root, 'dist'), stable = join(root, '.stable');

console.log('> Compilando…');
execSync('npx astro build', { cwd: root, stdio: 'inherit', env: { ...process.env, NF_STABLE: '' } });

// Copia encima (sobrescribe) y borra lo que ya no existe, sin vaciar la carpeta de golpe.
console.log('> Publicando en .stable/');
cpSync(dist, stable, { recursive: true, force: true });
const walk = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? [p, ...walk(p)] : [p]; });
for (const p of walk(stable).reverse()) {
  if (!existsSync(join(dist, relative(stable, p)))) rmSync(p, { recursive: true, force: true });
}
console.log('> Listo. Recarga el navegador (F5).');
