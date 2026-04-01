# 🌸 Katty Floristería — Guía Completa v5.0

## Estructura del Proyecto

```
katty_floreria/
├── server.js                 ← Backend Node.js (Express + Supabase)
├── package.json
├── .env                      ← Credenciales (NO subir a GitHub)
├── .gitignore
├── supabase_schema.sql       ← SQL para crear tablas
└── public/                   ← Frontend (todo lo que ven los clientes)
    ├── index.html            ← Página principal
    ├── catalogo.html         ← Catálogo completo (mismo diseño)
    ├── admin.html            ← Panel de administración
    ├── config.js             ← Configuración compartida (API URL + funciones)
    ├── funciones.js          ← JavaScript del frontend (sin duplicados)
    ├── stylo.css             ← Estilos principales
    └── catalogo.css          ← Estilos extra del catálogo
```

---

## ¿Cómo funcionan las 3 páginas juntas?

```
admin.html  ──guarda──►  localStorage['kf_products']
                                    │
              ┌─────────────────────┴──────────────────────┐
              ▼                                             ▼
         index.html                                  catalogo.html
    (muestra resumen por                        (muestra TODO el catálogo
     categoría, max 10)                          con filtros y búsqueda)
```

- **`config.js`** es el puente. Contiene `kf_getProducts()` y `kf_renderProductCard()` que usan las tres páginas.
- Cuando guardas un producto en **admin**, se guarda en `localStorage` y el catálogo lo muestra automáticamente (sin recargar si está en otra pestaña).
- Las imágenes se guardan como **base64 en localStorage** si no hay servidor, o en **Supabase Storage** si el servidor está corriendo.

---

## PASO 1 — Probar en tu computadora (LOCAL)

```bash
# 1. Instalar dependencias
npm install

# 2. El .env ya tiene las credenciales configuradas

# 3. Iniciar el servidor
npm run dev

# 4. Abrir en el navegador
http://localhost:3000          ← Tienda principal
http://localhost:3000/catalogo.html  ← Catálogo completo
http://localhost:3000/admin.html     ← Panel admin
```

**Credenciales del admin:**
- Usuario: `admin`
- Contraseña: `katty2025`

---

## PASO 2 — Configurar Supabase (base de datos + imágenes)

### 2.1 Crear las tablas
1. Ve a [supabase.com](https://supabase.com) → tu proyecto → **SQL Editor**
2. Copia el contenido de `supabase_schema.sql` y ejecútalo
3. Verifica que aparezcan las tablas `products` y `orders` ✅

### 2.2 Crear el bucket de imágenes
1. Supabase → **Storage** → **New bucket**
2. Nombre: `product-images`
3. ⚠️ **MARCAR "Public bucket"** ✅ (muy importante)
4. Click **Create bucket**

### 2.3 Subir tus fotos de productos
1. Storage → `product-images` → **Upload files**
2. Sube todas tus fotos (`.jpg`, `.png`, `.webp`)
3. La URL pública de cada imagen será:
   ```
   https://tiaguowrffjidtrphhaf.supabase.co/storage/v1/object/public/product-images/NOMBRE_FOTO.jpg
   ```
4. En admin → cuando agregas/editas un producto → selecciona la foto desde tu dispositivo

---

## PASO 3 — Subir a Railway (hosting gratuito)

### 3.1 Preparar el repositorio en GitHub
```bash
git init
git add .
git commit -m "Katty Floristería v5.0"
git branch -M main

# Crea un repo en github.com (sin README), luego:
git remote add origin https://github.com/TU_USUARIO/katty-floreria.git
git push -u origin main
```
> ⚠️ El `.env` está en `.gitignore` — **no se sube** a GitHub. Las credenciales van en Railway.

### 3.2 Desplegar en Railway
1. Ve a [railway.app](https://railway.app) → Sign up con GitHub
2. **New Project** → **Deploy from GitHub repo**
3. Selecciona `katty-floreria`
4. Railway detecta Node.js automáticamente y hace el deploy

### 3.3 Variables de entorno en Railway
Railway → tu proyecto → **Variables** → agrega:

| Variable | Valor |
|---|---|
| `SUPABASE_URL` | `https://tiaguowrffjidtrphhaf.supabase.co` |
| `SUPABASE_KEY` | `eyJhbGci...` (el anon key completo del .env) |
| `ALLOWED_ORIGINS` | `*` (por ahora; cambia cuando tengas dominio) |
| `PORT` | `3000` |

5. Railway hace redeploy automático → obtienes URL como:
   ```
   https://katty-floreria-production.up.railway.app
   ```

---

## PASO 4 — Comprar y conectar el dominio

### 4.1 Comprar el dominio
Recomendamos **Namecheap** (~$12/año para `.com`):
- `kattyfloreria.com`
- `kattyfloristeria.com`
- `kattyfloristeria.com.do`

### 4.2 Conectar dominio en Railway
1. Railway → tu proyecto → **Settings** → **Domains** → **Add Custom Domain**
2. Escribe: `kattyfloreria.com`
3. Railway te dará un registro CNAME, ejemplo:
   ```
   katty-floreria-production.up.railway.app
   ```

### 4.3 Configurar DNS en Namecheap
Namecheap → **Manage** → **Advanced DNS** → Agrega:

| Tipo | Host | Valor |
|---|---|---|
| `CNAME` | `www` | `katty-floreria-production.up.railway.app` |
| `CNAME` | `@` | `katty-floreria-production.up.railway.app` |

Los cambios tardan **15 minutos a 24 horas** en propagarse.

### 4.4 Actualizar ALLOWED_ORIGINS
Una vez funcione el dominio, en Railway → Variables:
```
ALLOWED_ORIGINS=https://kattyfloreria.com,https://www.kattyfloreria.com
```

---

## PASO 5 — Checklist final antes de lanzar

- [ ] `https://kattyfloreria.com` carga la página principal
- [ ] `https://kattyfloreria.com/catalogo.html` muestra todos los productos con filtros
- [ ] `https://kattyfloreria.com/admin.html` → login funciona
- [ ] Admin → agregar producto con foto → aparece en index y catálogo ✅
- [ ] Admin → el producto aparece en su categoría correcta ✅
- [ ] Al hacer clic en "Agregar al carrito" → carrito abre con el producto ✅
- [ ] Al finalizar compra → abre WhatsApp con el pedido completo ✅
- [ ] `https://kattyfloreria.com/api/status` → responde `{"status":"online"}` ✅

---

## Agregar productos desde el Admin

1. Ve a `admin.html` → **Productos** → **+ Nuevo Producto**
2. Llena: Nombre, Precio, Categoría, Descripción
3. Click en **Seleccionar foto** → elige la imagen desde tu dispositivo
   - Si tienes el servidor corriendo: la foto se sube a Supabase Storage ☁️
   - Si no tienes servidor: la foto se guarda localmente (funciona igual) 💾
4. Click **Guardar Producto** ✅
5. Ve a `catalogo.html` → el producto aparece en su sección automáticamente 🎉

### Categorías disponibles:
| Categoría | Dónde aparece |
|---|---|
| 💐 Por Tipo | index.html (sección "Por Tipo") + catalogo.html |
| 🎉 Por Ocasión | index.html (sección "Ocasión") + catalogo.html |
| 💎 Premium | index.html (sección "Premium") + catalogo.html |
| 🌸 Ofertas | index.html (sección "Ofertas") + catalogo.html |

---

## Soporte rápido

| Problema | Solución |
|---|---|
| Las imágenes no cargan | Verifica que el bucket `product-images` sea **público** en Supabase |
| Admin no guarda | Abre la consola del navegador (F12) y revisa el error |
| El deploy en Railway falla | Verifica que las variables de entorno estén todas configuradas |
| DNS no funciona | Usa [dnschecker.org](https://dnschecker.org) para ver si ya propagó |
| Productos no aparecen en catálogo | Abre catálogo.html y presiona F5 para recargar |
