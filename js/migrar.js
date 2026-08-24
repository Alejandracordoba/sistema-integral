import { ref, get, set } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { auth, db } from "./firebase-config.js";

const OLD_TONERS = "https://controltonersweb-default-rtdb.firebaseio.com";
const OLD_INVENTARIO = "https://inventario-c0800-default-rtdb.firebaseio.com";

const userEmailEl = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");
const statusBadge = document.getElementById("status-badge");
const logEl = document.getElementById("log");

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

onValueGuarded();

function onValueGuarded() {
  import("https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js").then(({ ref, onValue }) => {
    onValue(ref(db, ".info/connected"), (snap) => {
      statusBadge.classList.toggle("online", snap.val() === true);
      statusBadge.textContent = snap.val() === true ? "En línea" : "Sin conexión";
    });
  });
}

document.getElementById("btn-import-toners").addEventListener("click", () => importarToners());
document.getElementById("btn-import-inventario").addEventListener("click", () => importarInventario());
document.getElementById("btn-backup").addEventListener("click", descargarBackup);

function log(mensaje, esError = false) {
  const linea = document.createElement("div");
  linea.textContent = `${new Date().toLocaleTimeString("es-AR")} · ${mensaje}`;
  linea.style.color = esError ? "#dc2626" : "";
  logEl.prepend(linea);
}

async function traerJson(url) {
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error(`No se pudo leer la base vieja (${respuesta.status})`);
  return respuesta.json();
}

async function importarToners() {
  try {
    deshabilitar(true);
    log("Descargando datos de Control Tóners desde la base vieja...");
    const data = await traerJson(`${OLD_TONERS}/.json`);

    if (!data || (!data.stock && !data.historial)) {
      throw new Error("La base vieja no tiene stock ni historial.");
    }

    const existente = await get(ref(db, "toners"));
    if (existente.exists()) {
      const seguir = confirm(
        `Ya hay datos de tóners en el sistema (${Object.keys(existente.val().stock || {}).length} códigos). ¿Querés reemplazarlos con los de la base vieja?`
      );
      if (!seguir) {
        log("Importación de tóners cancelada.");
        return;
      }
    }

    await set(ref(db, "toners"), { stock: data.stock || {}, historial: data.historial || {} });

    const cantStock = Object.keys(data.stock || {}).length;
    const cantHist = Object.keys(data.historial || {}).length;
    log(`Tóners importados: ${cantStock} códigos de stock y ${cantHist} registros de historial.`);
  } catch (err) {
    log(`Error importando tóners: ${err.message}`, true);
  } finally {
    deshabilitar(false);
  }
}

async function importarInventario() {
  try {
    deshabilitar(true);
    log("Descargando datos de Inventario PC desde la base vieja...");
    const data = await traerJson(`${OLD_INVENTARIO}/.json`);

    if (!data) throw new Error("La base vieja está vacía o no accesible.");

    const equipos = {};
    let ingresos = {};
    Object.entries(data).forEach(([clave, valor]) => {
      if (clave === "ingresos_stock") {
        ingresos = valor || {};
      } else if (valor && typeof valor === "object") {
        equipos[clave] = valor;
      }
    });

    const existente = await get(ref(db, "inventario/equipos"));
    if (existente.exists()) {
      const seguir = confirm(
        `Ya hay ${Object.keys(existente.val()).length} equipos en el sistema. ¿Querés reemplazarlos con los ${Object.keys(equipos).length} de la base vieja?`
      );
      if (!seguir) {
        log("Importación de inventario cancelada.");
        return;
      }
    }

    await set(ref(db, "inventario"), { equipos, ingresos_stock: ingresos });

    log(`Inventario importado: ${Object.keys(equipos).length} equipos y ${Object.keys(ingresos).length} movimientos de stock.`);
  } catch (err) {
    log(`Error importando inventario: ${err.message}`, true);
  } finally {
    deshabilitar(false);
  }
}

async function descargarBackup() {
  try {
    deshabilitar(true);
    const snapshot = await get(ref(db, "/"));
    const fecha = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(snapshot.val(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-sistema-${fecha}.json`;
    a.click();
    URL.revokeObjectURL(url);
    log("Backup descargado correctamente.");
  } catch (err) {
    log(`Error generando backup: ${err.message}`, true);
  } finally {
    deshabilitar(false);
  }
}

function deshabilitar(deshabilitado) {
  ["btn-import-toners", "btn-import-inventario", "btn-backup"].forEach((id) => {
    document.getElementById(id).disabled = deshabilitado;
  });
}
