import { ref, onValue, update, push, remove } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";
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
const numStock = document.getElementById("num-stock");
const txtArea = document.getElementById("txt-area");
const txtBase = document.getElementById("txt-base");

let stockLocal = {};

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

  vistaStock1.textContent = htmlStock || "Sin códigos cargados.";
  vistaStock2.textContent = htmlStock || "Sin códigos cargados.";
  actualizarInputNumerico();
});

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

  txtArea.value = "";
});

document.getElementById("btn-guardar-stock").addEventListener("click", async () => {
  const codigo = comboAjustar.value;
  const nuevaCantidad = parseInt(numStock.value);

  if (isNaN(nuevaCantidad) || nuevaCantidad < 0) {
    alert("Por favor ingresa una cantidad válida.");
    return;
  }

  await update(ref(db, "toners/stock"), { [codigo]: nuevaCantidad });
  alert(`Stock de ${codigo} actualizado a ${nuevaCantidad} unidades exitosamente.`);
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
