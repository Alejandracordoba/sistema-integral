import { ref, onValue, push, remove, set } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { auth, db } from "./firebase-config.js";
import { escapeHtml, copiarAlPortapapeles, avisar } from "./utils-red.js";

const SEED = [
  {
    id: "dvr-base-ocampo",
    nombre: "Base Ocampo",
    ip: "172.17.5.252",
    credenciales: [{ etiqueta: "", usuario: "Admin", clave: "transito99" }]
  },
  {
    id: "dvr-base-cochabamba",
    nombre: "Base Cochabamba",
    ip: "192.168.104.120",
    credenciales: [{ etiqueta: "", usuario: "admin", clave: "chaca123" }]
  },
  {
    id: "dvr-piedras-agentes",
    nombre: "Base Piedras (Agentes)",
    ip: "10.68.9.198",
    credenciales: [{ etiqueta: "", usuario: "sebas", clave: "123456" }]
  },
  {
    id: "dvr-piedras-bici",
    nombre: "Base Piedras (Bici)",
    ip: "10.68.9.199",
    credenciales: [
      { etiqueta: "Usuario 1", usuario: "admin", clave: "las4piedras*" },
      { etiqueta: "Usuario 2", usuario: "agentes", clave: "12345678+" }
    ]
  },
  {
    id: "dvr-seguridad-vial",
    nombre: "Seguridad Vial",
    ip: "10.68.4.254",
    credenciales: [
      { etiqueta: "Admin", usuario: "admin", clave: "las4piedras*" },
      { etiqueta: "Taller", usuario: "taller", clave: "transito99" },
      { etiqueta: "Marcelo", usuario: "marcelo", clave: "12345678+" },
      { etiqueta: "Nico", usuario: "Nico", clave: "12345678+" }
    ]
  }
];

const userEmailEl = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");
const statusBadge = document.getElementById("status-badge");
const contenedor = document.getElementById("lista-dvrs");
const estadoEl = document.getElementById("estado-dvrs");
const formNuevo = document.getElementById("form-nuevo-dvr");

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

let semillaVerificada = false;

onValue(ref(db, "dvrs"), async (snapshot) => {
  render(snapshot);

  if (semillaVerificada) return;
  semillaVerificada = true;

  try {
    await asegurarSemilla(snapshot);
  } catch (err) {
    alert("No se pudieron cargar los DVRs precargados: " + err.message);
  }
});

function normalizar(texto) {
  return String(texto || "").trim().toLowerCase();
}

async function asegurarSemilla(snapshot) {
  const vistos = new Map();
  const duplicados = [];

  snapshot.forEach((child) => {
    const nombre = normalizar(child.child("nombre").val());
    if (vistos.has(nombre)) {
      duplicados.push(child.key);
    } else {
      vistos.set(nombre, child.key);
    }
  });

  for (const id of duplicados) {
    await remove(ref(db, `dvrs/${id}`));
  }

  const faltantes = SEED.filter((dvr) => !vistos.has(normalizar(dvr.nombre)));

  for (const dvr of faltantes) {
    const { id, ...datos } = dvr;
    await set(ref(db, `dvrs/${id}`), datos);
  }

  if (duplicados.length > 0 && faltantes.length > 0) {
    avisar(`Se quitaron ${duplicados.length} duplicado(s) y se restauraron ${faltantes.length} DVR(s).`);
  } else if (duplicados.length > 0) {
    avisar(`Se quitaron ${duplicados.length} DVR(s) duplicado(s).`);
  } else if (faltantes.length > 0) {
    avisar(`Se restauraron ${faltantes.length} DVR(s) precargado(s).`);
  }
}

function render(snapshot) {
  const dvrs = [];
  snapshot.forEach((child) => {
    const valor = child.val();
    if (valor && typeof valor === "object") {
      dvrs.push({ id: child.key, ...valor });
    }
  });
  dvrs.sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));

  if (estadoEl) {
    estadoEl.textContent = `Equipos en la base: ${dvrs.length} de 5 precargados. `;
  }

  if (dvrs.length === 0) {
    contenedor.innerHTML = '<div class="empty-state">No hay DVRs cargados.</div>';
    return;
  }

  contenedor.innerHTML = dvrs
    .map((dvr) => {
      try {
        return renderDvr(dvr);
      } catch (err) {
        console.error("Error dibujando el DVR", dvr.id, err);
        return `
          <div class="panel">
            <h3>⚠️ ${escapeHtml(dvr.nombre || dvr.id)}</h3>
            <p class="hint">Este equipo tiene datos con un formato inesperado: ${escapeHtml(err.message)}</p>
          </div>`;
      }
    })
    .join("");
}

function renderDvr(dvr) {
  const credenciales = [];
  if (dvr.credenciales && typeof dvr.credenciales === "object") {
    Object.entries(dvr.credenciales).forEach(([id, cred]) => {
      if (cred) credenciales.push({ id, ...cred });
    });
  }

  return `
    <div class="panel">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 14px;">
        <div>
          <h3 style="margin-bottom: 4px;">📹 ${escapeHtml(dvr.nombre)}</h3>
          <span class="badge badge-gray">${escapeHtml(dvr.ip)}</span>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-inline btn-secondary" data-accion="copiar-ip" data-ip="${escapeHtml(dvr.ip)}">📋 Copiar IP</button>
          <a class="btn btn-inline btn-secondary" href="http://${escapeHtml(dvr.ip)}" target="_blank" rel="noopener">🌐 Abrir</a>
          <button class="btn-delete" data-accion="eliminar-dvr" data-id="${dvr.id}" data-nombre="${escapeHtml(dvr.nombre)}">Eliminar DVR</button>
        </div>
      </div>
      ${renderCredenciales(dvr.id, credenciales)}
    </div>`;
}

function renderCredenciales(dvrId, credenciales) {
  if (credenciales.length === 0) {
    return '<p class="hint">Sin credenciales cargadas para este equipo.</p>';
  }

  return `
    <table class="data-table">
      <thead>
        <tr><th>Perfil</th><th>Usuario</th><th>Contraseña</th><th style="width: 150px;">Acciones</th></tr>
      </thead>
      <tbody>
        ${credenciales
          .map(
            (c) => `
            <tr>
              <td>${escapeHtml(c.etiqueta) || '<span class="muted-cell">—</span>'}</td>
              <td><strong>${escapeHtml(c.usuario)}</strong></td>
              <td>
                <code class="clave-oculta" data-clave="${escapeHtml(c.clave)}">••••••••••</code>
                <button class="btn-delete" data-accion="toggle-pass" title="Mostrar / ocultar">👁</button>
              </td>
              <td>
                <div style="display: flex; gap: 6px;">
                  <button class="btn btn-inline btn-secondary" data-accion="copiar-usuario" data-usuario="${escapeHtml(c.usuario)}">Copiar usuario</button>
                  <button class="btn btn-inline btn-secondary" data-accion="copiar-clave" data-clave="${escapeHtml(c.clave)}">Copiar clave</button>
                </div>
              </td>
            </tr>`
          )
          .join("")}
      </tbody>
    </table>
    <input type="hidden" value="${dvrId}">`;
}

document.addEventListener("click", async (e) => {
  const toggle = e.target.closest('[data-accion="toggle-pass"]');
  if (toggle) {
    const code = toggle.parentElement.querySelector("code");
    const visible = code.classList.toggle("clave-visible");
    code.textContent = visible ? code.dataset.clave : "••••••••••";
    return;
  }

  const btn = e.target.closest("[data-accion]");
  if (!btn) return;

  try {
    switch (btn.dataset.accion) {
      case "copiar-ip":
        await copiarAlPortapapeles(btn.dataset.ip, `IP ${btn.dataset.ip} copiada.`);
        break;
      case "copiar-usuario":
        await copiarAlPortapapeles(btn.dataset.usuario, `Usuario "${btn.dataset.usuario}" copiado.`);
        break;
      case "copiar-clave":
        await copiarAlPortapapeles(btn.dataset.clave, "Contraseña copiada al portapapeles.");
        break;
      case "eliminar-dvr":
        await eliminarDvr(btn.dataset.id, btn.dataset.nombre);
        break;
    }
  } catch (err) {
    alert("Ocurrió un error: " + err.message);
  }
});

formNuevo.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = document.getElementById("dvr-nombre").value.trim();
  const ip = document.getElementById("dvr-ip").value.trim();
  const etiqueta = document.getElementById("dvr-etiqueta").value.trim();
  const usuario = document.getElementById("dvr-usuario").value.trim();
  const clave = document.getElementById("dvr-clave").value;
  const btn = formNuevo.querySelector('button[type="submit"]');

  if (!nombre || !ip || !usuario || !clave) {
    alert("Completá nombre, IP, usuario y contraseña.");
    return;
  }

  btn.disabled = true;

  try {
    const nuevaRef = push(ref(db, "dvrs"));
    await set(nuevaRef, {
      nombre,
      ip,
      credenciales: { [`${nuevaRef.key}-c1`]: { etiqueta, usuario, clave } }
    });

    formNuevo.reset();
    avisar(`DVR "${nombre}" agregado correctamente.`);
  } catch (err) {
    alert("No se pudo guardar el DVR. Motivo: " + (err.message || err.code));
  } finally {
    btn.disabled = false;
  }
});

async function eliminarDvr(id, nombre) {
  if (!confirm(`¿Eliminar el DVR "${nombre}" con todas sus credenciales?`)) return;
  await remove(ref(db, `dvrs/${id}`));
}
