# My Setup

Comparte tu escritorio, abre un hilo y descubre los espacios de la comunidad.

Cada publicación admite varias fotos y abre automáticamente un hilo de comentarios sin límite de mensajes. Para publicar o comentar hace falta una cuenta; el feed y los perfiles son públicos.

## Stack

- React 19 + Vite 8 + Tailwind CSS 4
- Express 5 + `node:sqlite` (SQLite nativo de Node)
- Sesiones propias con cookie `httpOnly` y contraseñas con bcrypt

## Requisitos

- Node.js 22 o superior (usa `node:sqlite`)
- npm

## Desarrollo

```bash
npm install
npm run dev
```

Esto arranca a la vez:

- Web (Vite): <http://localhost:5173>
- API (Express): <http://localhost:4000>

Abre **la URL de la web**, no el archivo `dist/index.html`. Vite reenvía `/api` y `/media` al puerto 4000.

## Producción

```bash
npm run build
npm start
```

La web y la API se sirven desde el mismo origen: <http://localhost:4000>.

> Si abres la carpeta `dist` con un servidor estático (Live Server, `python -m http.server`, etc.) las peticiones a `/api` no llegarán a Express y el registro fallará. Usa siempre `npm run dev` o `npm start`.

## Datos

- Base de datos SQLite: `data/mysetup.db`
- Imágenes subidas: `data/uploads/`

Ambas rutas están excluidas de git. Para empezar de cero:

```bash
npm run db:reset
```

## Variables de entorno

| Variable       | Por defecto | Descripción                                      |
| -------------- | ----------- | ------------------------------------------------ |
| `PORT`         | `4000`      | Puerto del servidor Express                      |
| `DATA_DIR`     | `./data`    | Carpeta de base de datos e imágenes              |
| `COOKIE_SECURE`| desactivado | `1` para enviar la cookie solo por HTTPS         |
| `TRUST_PROXY`  | desactivado | `1` si está detrás de un proxy inverso           |

## Scripts

- `npm run dev`: API con recarga + Vite
- `npm run build`: compila la web en `dist/`
- `npm start`: servidor de producción
- `npm run typecheck`: comprueba TypeScript
- `npm run db:reset`: borra la base de datos y las subidas
