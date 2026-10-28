// Sirve la copia estable (.stable/) en http://localhost:4321. Si no existe, la crea primero.
import { execSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const port = Number(process.env.PORT || 4321);

// Si el puerto está ocupado, se avisa en lugar de saltar a otro puerto en silencio.
const free = await new Promise((res) => {
  const s = createServer().once('error', () => res(false)).once('listening', () => s.close(() => res(true)));
  s.listen(port, '::');
});
if (!free) {
  console.error(`\n[!] El puerto ${port} ya está en uso. Cierra la otra ventana del servidor y vuelve a ejecutar "npm run stable".\n`);
  process.exit(1);
}

if (!existsSync(join(root, '.stable', 'index.html'))) execSync('node scripts/publish-local.mjs', { cwd: root, stdio: 'inherit' });

const child = spawn('npx', ['astro', 'preview', '--port', String(port)], { cwd: root, stdio: 'inherit', shell: true, env: { ...process.env, NF_STABLE: '1' } });
child.on('exit', (code) => process.exit(code ?? 0));
