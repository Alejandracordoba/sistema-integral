import { ref, onValue, update, push, remove, get, set } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { auth, db } from "./firebase-config.js";

const userEmailEl = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");
const statusBadge = document.getElementById("status-badge");

const comboRegistrar = document.getElementById("combo-codigos-1");
const comboAjustar = document.getElementById("combo-codigos-2");
const vistaStock1 = document.getElementById("vista-stock-1");
const vistaStock2 = document.getElementById("vista-stock-2");
const tablaHistorial = document.getElementById("tabla-historial");
const tablaPedidos = document.getElementById("tabla-pedidos");
const numStock = document.getElementById("num-stock");
const txtArea = document.getElementById("txt-area");
const txtBase = document.getElementById("txt-base");
const bannerPedido = document.getElementById("banner-pedido");

const URL_PROVEEDOR = "https://dcgservicios.com.ar/Account/Login?ReturnUrl=%2f";
const UMBRAL_PEDIDO = 7;

let stockLocal = {};
let usoTotal = 0;
let bloquesPedidos = 0;
let configPedido = {};

const tabButtons = document.querySelectorAll(".tab-btn[data-tab]");
tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => b.classList.toggle("active", b === btn));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    document.getElementById(`panel-${btn.dataset.tab}`).classList.add("active");
  });
});

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

onValue(ref(db, "toners/stock"), (snap) => {
  stockLocal = snap.val() || {};
  renderTodoStock();
  renderConfigPedido();
});

onValue(ref(db, "toners/uso"), (snap) => {
  if (!snap.exists() && !analisisInicial) {
    usoTotal = 0;
    inicializarContadorGlobal();
  } else {
    usoTotal = snap.val() ?? usoTotal;
  }
  renderTodoStock();
  sincronizarPedidos();
});

onValue(ref(db, "toners/pedidos_hechos"), (snap) => {
  bloquesPedidos = snap.val() ?? 0;
});

onValue(ref(db, "toners/pedido_config"), (snap) => {
  configPedido = snap.val() || {};
  renderConfigPedido();
  sincronizarPedidos();
});

function renderTodoStock() {
  const codigos = Object.keys(stockLocal).sort();

  comboRegistrar.innerHTML = "";
  comboAjustar.innerHTML = "";

  let htmlStock = "";
  codigos.forEach((codigo) => {
    const cantidad = stockLocal[codigo] ?? 0;
    comboRegistrar.appendChild(crearOpcion(codigo));
    comboAjustar.appendChild(crearOpcion(codigo));
    htmlStock += `${codigo.padEnd(12, " ")} | ${cantidad} unidades\n`;
  });

  let htmlUso = "\n";
  if (codigos.length > 0) {
    const resto = usoTotal % UMBRAL_PEDIDO;
    htmlUso += `Gasto total acumulado: ${usoTotal} tóners\n`;
    htmlUso +=
      resto === 0
        ? `→ ¡Completaste ${UMBRAL_PEDIDO}! Registrá el pedido.\n`
        : `Próximo pedido de ${UMBRAL_PEDIDO} en: ${UMBRAL_PEDIDO - resto} usados\n`;
  }

  const textoTotal = (htmlStock || "Sin códigos cargados.") + htmlUso;
  vistaStock1.textContent = textoTotal;
  vistaStock2.textContent = textoTotal;
  actualizarInputNumerico();
}

let analisisInicial = false;

async function inicializarContadorGlobal() {
  if (analisisInicial) return;
  analisisInicial = true;

  try {
    const histSnap = await get(ref(db, "toners/historial"));
    let total = 0;
    histSnap.forEach((child) => {
      const reg = child.val();
      if (reg && reg.codigo) total++;
    });
    await set(ref(db, "toners/uso"), total);
    usoTotal = total;
    renderTodoStock();
  } catch (err) {
    console.error("No se pudo analizar el historial:", err);
  }
}

async function sincronizarPedidos() {
  const bloquesCompletos = Math.floor(usoTotal / UMBRAL_PEDIDO);
  if (bloquesCompletos <= bloquesPedidos) return;

  const pendientes = bloquesCompletos - bloquesPedidos;
  const claves = Object.keys(configPedido || {}).filter((c) => configPedido[c] > 0);

  if (claves.length === 0) {
    bannerPedido.classList.remove("hidden");
    bannerPedido.innerHTML = `📦 Tenés <strong>${pendientes} pedido(s) de 7 pendientes</strong> de registrar. Definí la composición del pedido en la pestaña "Ajustar / Cargar stock".`;
    return;
  }

  const items = claves.map((codigo) => ({ codigo, cantidad: configPedido[codigo] }));
  const ajustes = {};
  for (let i = 0; i < pendientes; i++) {
    const key = push(ref(db, "toners/pedidos")).key;
    ajustes[`toners/pedidos/${key}`] = {
      fecha: new Date().toLocaleString("es-AR"),
      items,
      total: items.reduce((s, it) => s + it.cantidad, 0),
      motivo: "cada 7 usados (total)",
      url: URL_PROVEEDOR,
      estado: "pendiente"
    };
  }
  ajustes["toners/pedidos_hechos"] = bloquesCompletos;
  await update(ref(db), ajustes);

  bannerPedido.classList.remove("hidden");
  bannerPedido.innerHTML = `📦 Se registraron <strong>${pendientes} pedido(s)</strong> de ${UMBRAL_PEDIDO} tóners. <a href="${URL_PROVEEDOR}" target="_blank" rel="noopener" class="btn btn-secondary">Ir a dcgservicios.com.ar</a>`;
}

function crearOpcion(codigo) {
  const opt = document.createElement("option");
  opt.value = codigo;
  opt.textContent = codigo;
  return opt;
}

comboAjustar.addEventListener("change", actualizarInputNumerico);

function actualizarInputNumerico() {
  const seleccionado = comboAjustar.value;
  if (seleccionado && stockLocal[seleccionado] !== undefined) {
    numStock.value = stockLocal[seleccionado];
  }
}

document.getElementById("btn-registrar").addEventListener("click", async () => {
  const area = txtArea.value.trim();
  const base = txtBase.value.trim();
  const codigo = comboRegistrar.value;

  if (!area || !base) {
    alert("Completa los campos de Área y Base.");
    return;
  }

  const cant = stockLocal[codigo];
  if (!cant || cant <= 0) {
    alert(`¡Alerta! Sin stock para el modelo ${codigo}`);
    return;
  }

  await update(ref(db, "toners/stock"), { [codigo]: cant - 1 });
  await push(ref(db, "toners/historial"), {
    fecha: new Date().toLocaleString("es-AR"),
    area,
    base,
    codigo,
    remanente: cant - 1
  });

  const nuevoTotal = usoTotal + 1;
  await set(ref(db, "toners/uso"), nuevoTotal);
  usoTotal = nuevoTotal;
  renderTodoStock();
  await sincronizarPedidos();

  txtArea.value = "";
});

document.getElementById("btn-guardar-stock").addEventListener("click", async () => {
  const codigo = comboAjustar.value;
  const llegada = parseInt(numStock.value);

  if (isNaN(llegada) || llegada < 0) {
    alert("Por favor ingresa una cantidad válida.");
    return;
  }

  const actual = stockLocal[codigo] ?? 0;
  const nuevo = actual + llegada;

  await update(ref(db, "toners/stock"), { [codigo]: nuevo });
  await push(ref(db, "toners/ingresos"), {
    fecha: new Date().toLocaleString("es-AR"),
    codigo,
    llegada,
    stockResultante: nuevo
  });
  alert(`Llegada de ${llegada} tóners de ${codigo} registrada. El stock quedó en ${nuevo} unidades (${actual} + ${llegada}).`);
});

tablaHistorial.addEventListener("click", async (e) => {
  const btn = e.target.closest(".btn-delete");
  if (!btn) return;

  const { id, codigo } = btn.dataset;
  if (!confirm("¿Estás segura de que querés borrar este registro? Se devolverá 1 unidad al stock.")) return;

  await remove(ref(db, `toners/historial/${id}`));

  if (stockLocal[codigo] !== undefined) {
    await update(ref(db, "toners/stock"), { [codigo]: stockLocal[codigo] + 1 });
  }
});

onValue(ref(db, "toners/historial"), (snapshot) => {
  const registros = [];
  snapshot.forEach((child) => {
    registros.push({ id: child.key, ...child.val() });
  });
  renderHistorial(registros.reverse());
});

onValue(ref(db, "toners/pedidos"), (snapshot) => {
  const pedidos = [];
  snapshot.forEach((child) => {
    pedidos.push({ id: child.key, ...child.val() });
  });
  renderPedidos(pedidos.reverse());
});

function renderPedidos(pedidos) {
  if (pedidos.length === 0) {
    tablaPedidos.innerHTML = '<tr><td colspan="5" class="empty-state">Aún no hay pedidos registrados.</td></tr>';
    return;
  }

  tablaPedidos.innerHTML = pedidos
    .map((p) => {
      const detalle = p.items
        ? p.items.map((it) => `${it.codigo}:${it.cantidad}`).join(", ")
        : `${p.codigo}:${p.cantidad ?? ""}`;
      return `
        <tr>
          <td class="muted-cell">${escapeHtml(p.fecha)}</td>
          <td><span class="badge">${escapeHtml(detalle)}</span></td>
          <td>${p.total ?? ""} u.</td>
          <td>${escapeHtml(p.motivo)}</td>
          <td><a href="${escapeHtml(p.url || URL_PROVEEDOR)}" target="_blank" rel="noopener" class="btn btn-secondary">Pedir</a></td>
        </tr>`;
    })
    .join("");
}

function renderConfigPedido() {
  const cont = document.getElementById("config-pedido");
  if (!cont) return;
  const codigos = Object.keys(stockLocal).sort();
  if (codigos.length === 0) {
    cont.innerHTML = '<p class="hint">No hay códigos cargados todavía.</p>';
    return;
  }

  cont.innerHTML = codigos
    .map((codigo) => {
      const valor = configPedido[codigo] ?? 0;
      return `<div class="config-fila"><span>${escapeHtml(codigo)}</span><input type="number" min="0" max="7" value="${valor}" data-codigo="${escapeHtml(codigo)}"></div>`;
    })
    .join("");

  const total = Object.values(configPedido).reduce((a, b) => a + b, 0);
  const elTotal = document.getElementById("config-total");
  if (elTotal) {
    elTotal.textContent = `El pedido compone ${total} de ${UMBRAL_PEDIDO} unidades.`;
  }
}

document.getElementById("btn-guardar-config").addEventListener("click", async () => {
  const nuevoConfig = {};
  document.querySelectorAll("#config-pedido input").forEach((input) => {
    const cantidad = parseInt(input.value) || 0;
    if (cantidad > 0) nuevoConfig[input.dataset.codigo] = cantidad;
  });

  const total = Object.values(nuevoConfig).reduce((a, b) => a + b, 0);
  if (total !== UMBRAL_PEDIDO) {
    alert(`La composición debe sumar exactamente ${UMBRAL_PEDIDO} unidades. Actualmente suma ${total}.`);
    return;
  }

  await set(ref(db, "toners/pedido_config"), nuevoConfig);
  alert("Composición de pedido guardada.");
  bannerPedido.classList.add("hidden");
  await sincronizarPedidos();
});

function renderHistorial(registros) {
  if (registros.length === 0) {
    tablaHistorial.innerHTML = '<tr><td colspan="6" class="empty-state">No hay cambios registrados.</td></tr>';
    return;
  }

  tablaHistorial.innerHTML = registros
    .map(
      (r) => `
      <tr>
        <td class="muted-cell">${escapeHtml(r.fecha)}</td>
        <td><strong>${escapeHtml(r.area)}</strong></td>
        <td>${escapeHtml(r.base)}</td>
        <td><span class="badge">${escapeHtml(r.codigo)}</span></td>
        <td><span class="badge badge-gray">${r.remanente ?? ""} u.</span></td>
        <td><button class="btn-delete" data-id="${r.id}" data-codigo="${escapeHtml(r.codigo)}">Eliminar</button></td>
      </tr>`
    )
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
