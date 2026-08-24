import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { ref, push, remove, onValue, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";
import { auth, db } from "./firebase-config.js";

const userEmailEl = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");
const statusBadge = document.getElementById("status-badge");
const navItems = document.querySelectorAll(".nav-item[data-section]");
const sections = document.querySelectorAll(".section");
const sectionTitle = document.getElementById("section-title");

const avisoForm = document.getElementById("aviso-form");
const avisoTexto = document.getElementById("aviso-texto");
const avisosList = document.getElementById("avisos-list");

let currentUser = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUser = user;
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

navItems.forEach((item) => {
  item.addEventListener("click", () => activateSection(item.dataset.section, item.textContent.trim()));
});

function activateSection(id, title) {
  navItems.forEach((i) => i.classList.toggle("active", i.dataset.section === id));
  sections.forEach((s) => s.classList.toggle("active", s.id === `section-${id}`));
  sectionTitle.textContent = title;
}

const avisosRef = query(ref(db, "avisos"), orderByChild("creado"), limitToLast(50));

onValue(avisosRef, (snapshot) => {
  const avisos = [];
  snapshot.forEach((child) => {
    avisos.push({ id: child.key, ...child.val() });
  });
  renderAvisos(avisos.reverse());
});

avisoForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const texto = avisoTexto.value.trim();
  if (!texto || !currentUser) return;
  avisoTexto.value = "";
  await push(ref(db, "avisos"), {
    texto,
    autor: currentUser.email,
    creado: Date.now()
  });
});

avisosList.addEventListener("click", async (e) => {
  const btn = e.target.closest(".btn-delete");
  if (!btn) return;
  await remove(ref(db, `avisos/${btn.dataset.id}`));
});

function renderAvisos(avisos) {
  if (avisos.length === 0) {
    avisosList.innerHTML = '<div class="empty-state">No hay avisos publicados.</div>';
    return;
  }
  avisosList.innerHTML = avisos
    .map((a) => {
      const fecha = new Date(a.creado).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
      return `
        <div class="aviso-item">
          <div>
            <div class="aviso-texto">${escapeHtml(a.texto)}</div>
            <div class="aviso-meta">${escapeHtml(a.autor)} · ${fecha}</div>
          </div>
          <button class="btn-delete" data-id="${a.id}">Eliminar</button>
        </div>`;
    })
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
