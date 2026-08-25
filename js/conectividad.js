import { ref, onValue, push, remove, set } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { auth, db } from "./firebase-config.js";

const SEED = [
  { nombre: "Base Piedras", ip: "10.68.8.2", grupo: "BASES" },
  { nombre: "Base Cochabamba", ip: "192.168.104.2", grupo: "BASES" },
  { nombre: "Base Luro", ip: "172.31.190.2", grupo: "BASES" },
  { nombre: "Base Nuñez", ip: "172.31.192.2", grupo: "BASES" },
  { nombre: "Base Ocampo", ip: "172.17.5.2", grupo: "BASES" },
  { nombre: "Seguridad Vial", ip: "10.68.4.2", grupo: "BASES" },
  { nombre: "CGM", ip: "10.50.9.2", grupo: "BASES" },
  { nombre: "Playa Tacuarí", ip: "172.31.90.2", grupo: "PLAYAS" },
  { nombre: "Playa 9 de Julio", ip: "10.42.13.3", grupo: "PLAYAS" },
  { nombre: "Playa Dakota", ip: "10.215.10.2", grupo: "PLAYAS" },
  { nombre: "Playa Libres del Sur", ip: "10.225.22.2", grupo: "PLAYAS" },
  { nombre: "Playa Quinquela", ip: "10.69.84.2", grupo: "PLAYAS" },
  { nombre: "Playa Sarmiento", ip: "172.30.110.2", grupo: "PLAYAS" },
  { nombre: "Pañol", ip: "10.62.0.2", grupo: "PLAYAS" },
  { nombre: "Playa Río IV", ip: "172.31.51.9", grupo: "PLAYAS" }
];

const userEmailEl = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");
const statusBadge = document.getElementById("status-badge");
const tbodyBases = document.querySelector("#tabla-bases tbody");
const tbodyPlayas = document.querySelector("#tabla-playas tbody");
const formNueva = document.getElementById("form-nueva");

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  userEmailEl.textContent = user.email;
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

onValue(ref(db, ".info/connected"), (snap) => {
  statusBadge.classList.toggle("online", snap.val() === true);
  statusBadge.textContent = snap.val() === true ? "En línea" : "Sin conexión";
});

let primeraCarga = true;

onValue(ref(db, "conectividad/equipos"), async (snapshot) => {
  if (primeraCarga) {
    primeraCarga = false;
    if (!snapshot.exists()) {
      await sembrarInicial();
      return;
    }
  }
  const equipos = [];
  snapshot.forEach((child) => equipos.push({ id: child.key, ...child.val() }));
  render(equipos);
});

async function sembrarInicial() {
  for (const equipo of SEED) {
    await push(ref(db, "conectividad/equipos"), equipo);
  }
}

function render(equipos) {
  const bases = equipos.filter((e) => e.grupo !== "PLAYAS").sort((a, b) => a.nombre.localeCompare(b.nombre));
  const playas = equipos.filter((e) => e.grupo === "PLAYAS").sort((a, b) => a.nombre.localeCompare(b.nombre));
  llenarTabla(tbodyBases, bases);
  llenarTabla(tbodyPlayas, playas);
}

function llenarTabla(tbody, equipos) {
  if (equipos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No hay sedes cargadas.</td></tr>';
    return;
  }

  tbody.innerHTML = equipos
    .map(
      (e) => `
      <tr>
        <td><strong>${escapeHtml(e.nombre)}</strong></td>
        <td><span class="badge badge-gray">${escapeHtml(e.ip)}</span></td>
        <td>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button class="btn btn-inline btn-secondary" data-accion="copiar" data-ip="${escapeHtml(e.ip)}">📋 Copiar IP</button>
            <a class="btn btn-inline btn-secondary" href="http://${escapeHtml(e.ip)}" target="_blank" rel="noopener">🌐 Abrir</a>
            <button class="btn btn-inline" data-accion="bat" data-nombre="${escapeHtml(e.nombre)}" data-ip="${escapeHtml(e.ip)}">🔍 Diagnóstico</button>
          </div>
        </td>
        <td><button class="btn-delete" data-accion="eliminar" data-id="${e.id}" data-nombre="${escapeHtml(e.nombre)}">Eliminar</button></td>
      </tr>`
    )
    .join("");
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-accion]");
  if (!btn) return;

  const { accion, id, ip, nombre } = btn.dataset;

  if (accion === "copiar") copiarAlPortapapeles(ip);

  if (accion === "bat") descargarBat(nombre, ip);

  if (accion === "eliminar") eliminarSede(id, nombre);
});

formNueva.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = document.getElementById("nueva-nombre").value.trim();
  const ip = document.getElementById("nueva-ip").value.trim();
  const grupo = document.getElementById("nueva-grupo").value;

  if (!nombre || !ip) return;

  await push(ref(db, "conectividad/equipos"), { nombre, ip, grupo });
  formNueva.reset();
});

async function copiarAlPortapapeles(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    avisar(`IP ${texto} copiada al portapapeles.`);
  } catch {
    const aux = document.createElement("textarea");
    aux.value = texto;
    document.body.appendChild(aux);
    aux.select();
    document.execCommand("copy");
    aux.remove();
    avisar(`IP ${texto} copiada al portapapeles.`);
  }
}

function descargarBat(nombre, ip) {
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

function slug(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function eliminarSede(id, nombre) {
  if (!confirm(`¿Eliminar "${nombre}" del panel de conectividad?`)) return;
  await remove(ref(db, `conectividad/equipos/${id}`));
}

function avisar(mensaje) {
  const toast = document.createElement("div");
  toast.textContent = mensaje;
  toast.style.cssText =
    "position: fixed; bottom: 24px; right: 24px; background: #0f172a; color: #fff; padding: 12px 18px; border-radius: 10px; font-size: 0.88rem; box-shadow: 0 6px 20px rgba(0,0,0,.25); z-index: 999; max-width: 380px;";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
