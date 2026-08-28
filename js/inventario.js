import { ref, onValue, push } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";
import { get, set } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { auth, db } from "./firebase-config.js";

const userEmailEl = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");
const statusBadge = document.getElementById("status-badge");

const formEquipo = document.getElementById("form-equipo");
const inputBusqueda = document.getElementById("input-busqueda");
const tbodyInventario = document.querySelector("#tabla-inventario tbody");
const tbodyStock = document.querySelector("#tabla-stock tbody");
const pcIdInput = document.getElementById("pc-id");

let listaEquipos = [];

onAuthStateChanged(auth, async (user) => {
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

onValue(ref(db, "inventario/equipos"), (snapshot) => {
  listaEquipos = [];
  snapshot.forEach((child) => {
    const valor = child.val();
    if (valor && typeof valor === "object") {
      listaEquipos.push(valor);
    }
  });
  listaEquipos.sort((a, b) => (a["ID"] ?? 0) - (b["ID"] ?? 0));
  asignarProximoId();
  llenarTabla(listaEquipos, tbodyInventario);
});

function asignarProximoId() {
  const maxId = listaEquipos.reduce((max, e) => Math.max(max, parseInt(e["ID"]) || 0), 0);
  pcIdInput.value = maxId + 1;
}

inputBusqueda.addEventListener("input", () => {
  const filtro = inputBusqueda.value.toUpperCase().trim();

  if (filtro === "") {
    llenarTabla(listaEquipos, tbodyInventario);
    return;
  }

  const filtrados = listaEquipos.filter((p) => {
    const area = p["Área Asignación"] ? String(p["Área Asignación"]).toUpperCase() : "";
    const base = p["BASE"] ? String(p["BASE"]).toUpperCase() : "";
    return area.includes(filtro) || base.includes(filtro);
  });

  llenarTabla(filtrados, tbodyInventario);
});

document.getElementById("btn-clear-form").addEventListener("click", () => {
  formEquipo.reset();
  document.getElementById("pc-tipo").value = "ESCRITORIO";
  adaptarPorTipo("ESCRITORIO");
  asignarProximoId();
});

adaptarPorTipo("ESCRITORIO");

formEquipo.addEventListener("submit", async (e) => {
  e.preventDefault();
  const currentId = pcIdInput.value;
  const tipoSel = (document.getElementById("pc-tipo").value || "ESCRITORIO").toUpperCase();
  const esNotebook = tipoSel === "NOTEBOOK";
  const esAiO = tipoSel === "ALL-IN-ONE";
  const ocultarMonitor = esNotebook || esAiO;

  const equipoPayload = {
    "ID": parseInt(currentId),
    "Tipo": tipoSel,
    "Marca": document.getElementById("pc-marca").value.toUpperCase(),
    "Modelo": document.getElementById("pc-modelo").value,
    "Procesador": document.getElementById("pc-procesador").value,
    "Motherboard": document.getElementById("pc-motherboard").value || "S/D",
    "N° de Serie": document.getElementById("pc-n-serie").value,
    "Monitor": ocultarMonitor ? "INTEGRADO" : (document.getElementById("pc-monitor").value.toUpperCase()),
    "Marca Monitor": ocultarMonitor ? "INTEGRADO" : (document.getElementById("pc-marca-monitor").value || "NO"),
    "Modelo Monitor": ocultarMonitor ? "INTEGRADO" : (document.getElementById("pc-modelo-monitor").value || "NO"),
    "N° de Serie Monitor": ocultarMonitor ? "N/A" : (document.getElementById("pc-serie-monitor").value || "NO"),
    "Disco": document.getElementById("pc-disco").value,
    "Disco 2": document.getElementById("pc-disco2").value || "NO",
    "Ram": document.getElementById("pc-ram").value,
    "Parlantes": esNotebook ? "INTEGRADOS" : (document.getElementById("pc-parlantes").value.toUpperCase()),
    "Placa Wifi": esNotebook ? "INTEGRADA" : (document.getElementById("pc-wifi").value.toUpperCase()),
    "Batería": esNotebook ? document.getElementById("pc-bateria").value : "",
    "Cargador": esNotebook ? document.getElementById("pc-cargador").value : "",
    "Pantalla": esNotebook ? document.getElementById("pc-pantalla").value : "",
    "Área Asignación": document.getElementById("pc-area").value.toUpperCase(),
    "BAC": document.getElementById("pc-bac").value || "S/N",
    "MAC": document.getElementById("pc-mac").value.toUpperCase(),
    "BASE": document.getElementById("pc-base").value.toUpperCase()
  };

  try {
    await set(ref(db, `inventario/equipos/${currentId}`), equipoPayload);
    alert(`¡Equipo N° ${currentId} procesado de manera exitosa!`);
    formEquipo.reset();
    inputBusqueda.value = "";
    llenarTabla(listaEquipos, tbodyInventario);
    asignarProximoId();
    activarPanel("inventario");
  } catch (err) {
    alert("Error al guardar en Firebase: " + err.message);
  }
});

document.getElementById("form-stock").addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    await push(ref(db, "inventario/ingresos_stock"), {
      origen: "BASE PIEDRAS/SISTEMAS",
      producto: document.getElementById("stock-producto").value,
      cantidad: parseInt(document.getElementById("stock-cantidad").value),
      nomenclatura: document.getElementById("stock-nomenclatura").value.toUpperCase(),
      area: document.getElementById("stock-area").value.toUpperCase(),
      base_comuna: document.getElementById("stock-base-comuna").value.toUpperCase(),
      fecha: new Date().toLocaleString("es-AR")
    });

    alert("¡Ingreso y asignación de stock guardados exitosamente!");
    e.target.reset();
  } catch (err) {
    alert("Error al guardar movimiento de stock en Firebase: " + err.message);
  }
});

onValue(ref(db, "inventario/ingresos_stock"), (snapshot) => {
  const movimientos = [];
  snapshot.forEach((child) => {
    movimientos.push(child.val());
  });
  movimientos.reverse();
  renderStock(movimientos);
});

function renderStock(movimientos) {
  if (movimientos.length === 0) {
    tbodyStock.innerHTML = '<tr><td colspan="7" class="empty-state">No hay movimientos de stock registrados aún.</td></tr>';
    return;
  }

  tbodyStock.innerHTML = movimientos
    .map(
      (item) => `
      <tr>
        <td><span class="badge badge-gray">${escapeHtml(item.origen)}</span></td>
        <td><strong>${escapeHtml(item.producto)}</strong></td>
        <td>${item.cantidad ?? 0}</td>
        <td>${escapeHtml(item.nomenclatura)}</td>
        <td>${escapeHtml(item.area)}</td>
        <td>${escapeHtml(item.base_comuna)}</td>
        <td class="muted-cell">${escapeHtml(item.fecha)}</td>
      </tr>`
    )
    .join("");
}

const COLUMNAS = [
  ["ID"], ["Tipo"], ["Marca"], ["Modelo"], ["Procesador"], ["Motherboard"],
  ["N° de Serie"], ["Monitor"], ["Marca Monitor"], ["Modelo Monitor"],
  ["N° de Serie Monitor"], ["Disco"], ["Disco 2"], ["Ram"], ["Parlantes"],
  ["Placa Wifi"], ["Batería"], ["Cargador"], ["Pantalla"],
  ["Área Asignación"], ["BAC"], ["MAC"], ["BASE"]
];

function ocultarCampo(id, oculto) {
  const wrap = document.getElementById(id);
  if (wrap) wrap.classList.toggle("hidden", oculto);
}

function adaptarPorTipo(tipo) {
  tipo = (tipo || "ESCRITORIO").toUpperCase();
  const esNotebook = tipo === "NOTEBOOK";
  const esAiO = tipo === "ALL-IN-ONE";
  const esPortatil = esNotebook || esAiO;

  ocultarCampo("wrap-parlantes", esNotebook);
  ocultarCampo("wrap-wifi", esNotebook);
  ocultarCampo("wrap-bateria", !esNotebook);
  ocultarCampo("wrap-cargador", !esNotebook);
  ocultarCampo("wrap-pantalla", !esPortatil);
  ocultarCampo("wrap-monitor", esPortatil);
  ocultarCampo("wrap-marca-monitor", esPortatil);
  ocultarCampo("wrap-modelo-monitor", esPortatil);
  ocultarCampo("wrap-serie-monitor", esPortatil);

  document.getElementById("monitor-titulo").textContent =
    esNotebook ? "Pantalla integrada" : (esAiO ? "Pantalla integrada (All-in-One)" : "Monitor asociado");
}

document.getElementById("pc-tipo").addEventListener("change", (e) => {
  adaptarPorTipo(e.target.value);
});

function tipoDe(p) {
  const t = (p["Tipo"] || "").toUpperCase();
  if (t === "NOTEBOOK" || t === "ALL-IN-ONE") return t;
  return "ESCRITORIO";
}

function llenarTabla(datos, tbody) {
  tbody.innerHTML = "";

  if (datos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="23" class="empty-state">No se encontraron registros.</td></tr>';
    return;
  }

  datos.forEach((p) => {
    const row = document.createElement("tr");
    row.style.cursor = "pointer";
    row.title = "Hacé clic para editar este equipo";

    row.innerHTML = COLUMNAS.map(([clave]) => `<td>${escapeHtml(p[clave])}</td>`).join("");

    row.addEventListener("click", () => {
      cargarEnFormulario(p);
      activarPanel("ingreso");
    });

    tbody.appendChild(row);
  });
}

function cargarEnFormulario(p) {
  const tipo = tipoDe(p);
  document.getElementById("pc-tipo").value = p["Tipo"] === "ALL-IN-ONE" ? "ALL-IN-ONE" : tipo;
  adaptarPorTipo(tipo);

  document.getElementById("pc-id").value = p["ID"] ?? "";
  document.getElementById("pc-marca").value = p["Marca"] ?? "";
  document.getElementById("pc-modelo").value = p["Modelo"] ?? "";
  document.getElementById("pc-procesador").value = p["Procesador"] ?? "";
  document.getElementById("pc-motherboard").value = p["Motherboard"] === "S/D" ? "" : (p["Motherboard"] ?? "");
  document.getElementById("pc-n-serie").value = p["N° de Serie"] ?? "";
  document.getElementById("pc-monitor").value = p["Monitor"] === "INTEGRADO" ? "" : (p["Monitor"] ?? "");
  document.getElementById("pc-marca-monitor").value = (p["Marca Monitor"] === "NO" || p["Marca Monitor"] === "INTEGRADO") ? "" : (p["Marca Monitor"] ?? "");
  document.getElementById("pc-modelo-monitor").value = (p["Modelo Monitor"] === "NO" || p["Modelo Monitor"] === "INTEGRADO") ? "" : (p["Modelo Monitor"] ?? "");
  document.getElementById("pc-serie-monitor").value = (p["N° de Serie Monitor"] === "NO" || p["N° de Serie Monitor"] === "N/A") ? "" : (p["N° de Serie Monitor"] ?? "");
  document.getElementById("pc-disco").value = p["Disco"] ?? "";
  document.getElementById("pc-disco2").value = p["Disco 2"] === "NO" ? "" : (p["Disco 2"] ?? "");
  document.getElementById("pc-ram").value = p["Ram"] ?? "";
  document.getElementById("pc-parlantes").value = p["Parlantes"] === "INTEGRADOS" ? "" : (p["Parlantes"] ?? "");
  document.getElementById("pc-wifi").value = p["Placa Wifi"] === "INTEGRADA" ? "" : (p["Placa Wifi"] ?? "");
  document.getElementById("pc-bateria").value = p["Batería"] || "BUENA";
  document.getElementById("pc-cargador").value = p["Cargador"] || "SI";
  document.getElementById("pc-pantalla").value = p["Pantalla"] ?? "";
  document.getElementById("pc-area").value = p["Área Asignación"] ?? "";
  document.getElementById("pc-bac").value = p["BAC"] === "S/N" ? "" : (p["BAC"] ?? "");
  document.getElementById("pc-mac").value = p["MAC"] ?? "";
  document.getElementById("pc-base").value = p["BASE"] ?? "";
}

const menuButtons = document.querySelectorAll(".menu-btn[data-panel]");
menuButtons.forEach((btn) => {
  btn.addEventListener("click", () => activarPanel(btn.dataset.panel));
});

function activarPanel(id) {
  menuButtons.forEach((b) => b.classList.toggle("active", b.dataset.panel === id));
  document.querySelectorAll(".window-panel").forEach((p) => p.classList.toggle("active", p.id === `panel-${id}`));
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
