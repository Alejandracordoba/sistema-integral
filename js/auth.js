import { onAuthStateChanged, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { auth } from "./firebase-config.js";

const form = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const errorBox = document.getElementById("error");
const submitBtn = document.getElementById("submit-btn");

const MESSAGES = {
  "auth/invalid-email": "El formato del correo no es válido.",
  "auth/missing-password": "Ingresá tu contraseña.",
  "auth/invalid-credential": "Correo o contraseña incorrectos.",
  "auth/user-not-found": "Correo o contraseña incorrectos.",
  "auth/wrong-password": "Correo o contraseña incorrectos.",
  "auth/too-many-requests": "Demasiados intentos fallidos. Probá de nuevo en unos minutos.",
  "auth/network-request-failed": "Error de conexión. Verificá tu internet.",
  "auth/configuration-not-found": "El login por correo no está habilitado en Firebase. Revisá el README."
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "app.html";
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();
  setLoading(true);
  try {
    await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
    window.location.href = "app.html";
  } catch (err) {
    showError(MESSAGES[err.code] || "Ocurrió un error inesperado. Intentá de nuevo.");
    setLoading(false);
  }
});

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.add("visible");
}

function hideError() {
  errorBox.classList.remove("visible");
}

function setLoading(loading) {
  submitBtn.disabled = loading;
  submitBtn.textContent = loading ? "Ingresando..." : "Ingresar";
}
