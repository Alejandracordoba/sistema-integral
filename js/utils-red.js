export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

export function slug(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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

export function descargarBat(nombre, ip) {
  const contenido = [
    "@echo off",
    `title Diagnostico de conectividad - ${nombre}`,
    "echo ============================================",
    `echo   TEST DE CONECTIVIDAD: ${nombre}`,
    `echo   IP: ${ip}`,
    "echo ============================================",
    "echo.",
    `ping -n 4 ${ip}`,
    "echo.",
    'set /p continuar="Desea hacer tracert a esta IP? (S/N): "',
    'if /i "%continuar%"=="S" tracert ' + ip,
    "echo.",
    "pause"
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + contenido], { type: "application/x-bat" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `test-${slug(nombre)}.bat`;
  a.click();
  URL.revokeObjectURL(url);

  avisar(`Se descargó test-${slug(nombre)}.bat. Abrilo con doble clic para ver el cmd en tu PC.`);
}

export function avisar(mensaje) {
  const toast = document.createElement("div");
  toast.textContent = mensaje;
  toast.style.cssText =
    "position: fixed; bottom: 24px; right: 24px; background: #0f172a; color: #fff; padding: 12px 18px; border-radius: 10px; font-size: 0.88rem; box-shadow: 0 6px 20px rgba(0,0,0,.25); z-index: 999; max-width: 380px;";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}
