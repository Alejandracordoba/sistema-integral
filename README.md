# Sistema Integral

Sistema con login centralizado para la oficina (5 usuarios), construido con HTML + JavaScript puro, Firebase Authentication y Realtime Database. Listo para desplegar en Vercel sin build.

## Estructura

```
├── index.html            Página de login
├── app.html              Inicio del sistema (avisos + accesos a módulos)
├── toners.html           Módulo Control de Tóners (stock, historial, IPs)
├── inventario.html       Módulo Inventario PC (equipos, búsqueda, stock)
├── migrar.html           Copia datos de las bases viejas al sistema nuevo
├── css/styles.css        Estilos compartidos
├── js/firebase-config.js Configuración de Firebase
├── js/auth.js            Lógica de inicio de sesión
├── js/app.js             Guardián de sesión + módulo de avisos
├── js/toners.js          Lógica del módulo de tóners
├── js/inventario.js      Lógica del módulo de inventario
├── js/migrar.js          Lógica de importación y backup
└── database.rules.json   Reglas de seguridad de Realtime Database
```

### Organización de los datos

```
toners/               ← venía de controltonersweb
├── stock             { código: cantidad }
└── historial         { registro: { fecha, area, base, codigo, remanente } }
inventario/           ← venía de inventario-c0800
├── equipos           { id: { Marca, Modelo, ..., BASE } }
└── ingresos_stock    { movimiento: { producto, cantidad, ... } }
avisos                { aviso: { texto, autor, creado } }
```

## Migración de los sistemas viejos

1. Iniciá sesión en el sistema.
2. Entrá a **Migración de datos** en el menú lateral.
3. Tocá **Descargar backup actual** (por seguridad).
4. Tocá **Importar tóners** y después **Importar inventario**.

Es una copia: las apps viejas (`control-toners-web` e `inventario-pc`) y sus bases
siguen funcionando intactas. Cuando verifiques que todo está en el sistema nuevo,
podés borrar esos deployments desde Vercel si querés.

## 1. Crear el proyecto en Firebase

1. Entrá a [console.firebase.google.com](https://console.firebase.google.com) y creá un proyecto.
2. En **Authentication → Sign-in method**, habilitá **Correo/contraseña**.
3. En **Authentication → Users**, agregá manualmente los 5 usuarios de la oficina (correo + contraseña).
4. En **Realtime Database → Create Database** (modo bloqueado), creala. Copiá la URL que termina en `.firebaseio.com` o `-rtdb.firebaseio.com`.
5. En **Configuración del proyecto → Tus apps**, agregá una app **Web** (`</>`) y copiá el objeto `firebaseConfig`.

## 2. Configurar las credenciales

Pegá los valores del `firebaseConfig` en `js/firebase-config.js`, reemplazando los placeholders. La línea `databaseURL` es obligatoria para Realtime Database.

## 3. Publicar las reglas de seguridad

En Firebase Console → **Realtime Database → Rules**, pegá el contenido de `database.rules.json` y publicá:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

Así solo los usuarios logueados pueden leer/escribir datos.

También podés agregar usuarios autorizados por dominio, por ejemplo solo correos de tu empresa:

```json
{
  "rules": {
    ".read": "auth != null && auth.token.email.matches(/.*@miempresa\\.com$/)",
    ".write": "auth != null && auth.token.email.matches(/.*@miempresa\\.com$/)"
  }
}
```

## 4. Probar en local

El SDK de Firebase por CDN requiere servir los archivos por HTTP (no abrir `index.html` directo desde el explorador):

```
npx serve .
```

Abrí `http://localhost:3000` e ingresá con uno de los usuarios creados.

## 5. Desplegar en Vercel

1. Subí el proyecto a un repositorio de Git:
   ```
   git init
   git add .
   git commit -m "Sistema integral: base con login"
   git remote add origin <URL_DE_TU_REPO>
   git push -u origin main
   ```
2. En [vercel.com](https://vercel.com) → **Add New Project** → importá el repo.
3. Framework preset: **Other** (no requiere configuración extra; es un sitio estático).
4. Deploy.

Cada `git push` a `main` actualizará automáticamente el sistema.

## Cómo agregar un módulo nuevo

1. En `app.html` agregá un ítem de navegación dentro del `<aside>`:
   ```html
   <a class="nav-item" data-section="clientes">Clientes</a>
   ```
2. Agregá la sección correspondiente:
   ```html
   <section id="section-clientes" class="section">
     <div class="panel">...</div>
   </section>
   ```
3. En `js/app.js`, leé/escribí datos bajo su propio nodo (`ref(db, "clientes")`) siguiendo el patrón del módulo Avisos.

## Costos

Todo funciona en el plan gratuito de Firebase (Spark) y Vercel (Hobby). Con 5 usuarios y pocos datos, no van a alcanzar los límites gratuitos.
