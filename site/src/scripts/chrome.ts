// Controles comunes a todas las páginas: modo CRT / LEGIBLE.
const root = document.documentElement;
const bMode = document.getElementById('bMode') as HTMLButtonElement | null;
const isCasePage = root.dataset.readable === '1';

function paint() {
  if (!bMode) return;
  const crt = !root.classList.contains('legible');
  bMode.setAttribute('aria-pressed', String(crt));
  bMode.textContent = crt ? bMode.dataset.crt! : bMode.dataset.legible!;
}

bMode?.addEventListener('click', () => {
  const crt = root.classList.toggle('legible') === false;
  // En los casos el modo legible es el predeterminado: el cambio no se guarda.
  if (!isCasePage) {
    try { localStorage.setItem('nf-crt', crt ? '1' : '0'); } catch { /* sin almacenamiento */ }
  }
  paint();
  window.dispatchEvent(new CustomEvent('nf:crt', { detail: crt }));
});

paint();

// Botón MOV: la elección del visitante manda sobre la preferencia del sistema.
const bMotion = document.getElementById('bMotion') as HTMLButtonElement | null;
if (bMotion) {
  const moving = !root.classList.contains('rm');
  bMotion.setAttribute('aria-pressed', String(moving));
  bMotion.textContent = moving ? 'MOV' : 'MOV ✕';
  bMotion.addEventListener('click', () => {
    try { localStorage.setItem('nf-motion', moving ? 'off' : 'on'); } catch { /* sin almacenamiento */ }
    // La escena 3D y las animaciones se configuran al cargar: se recarga para aplicar el cambio.
    location.reload();
  });
}
