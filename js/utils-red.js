export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

export async function copiarAlPortapapeles(texto, mensaje) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    const aux = document.createElement("textarea");
    aux.value = texto;
    document.body.appendChild(aux);
    aux.select();
    document.execCommand("copy");
    aux.remove();
  }
  avisar(mensaje || `Copiado: ${texto}`);
}

export function avisar(mensaje) {
  const toast = document.createElement("div");
  toast.textContent = mensaje;
  toast.style.cssText =
    "position: fixed; bottom: 24px; right: 24px; background: #0f172a; color: #fff; padding: 12px 18px; border-radius: 10px; font-size: 0.88rem; box-shadow: 0 6px 20px rgba(0,0,0,.25); z-index: 999; max-width: 380px;";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}
