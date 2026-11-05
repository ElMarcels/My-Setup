# My Setup

Comparte tu escritorio, abre un hilo y descubre los espacios de la comunidad.

Cada publicación admite varias fotos y abre automáticamente un hilo de comentarios sin límite de mensajes. Para publicar o comentar hace falta una cuenta; el feed y los perfiles son públicos.

## Stack

- React 19 + Vite 8 + Tailwind CSS 4
- Express 5 empaquetado como función serverless en Vercel
- PostgreSQL (Neon en producción) con el cliente `postgres`
- Vercel Blob para las imágenes
- Sesiones propias con cookie `httpOnly` y contraseñas con bcrypt

## Requisitos

- Node.js 22 o superior
- npm
- PostgreSQL local para desarrollo (o una base remota)
- Un Blob store de Vercel con su `BLOB_READ_WRITE_TOKEN`

## Variables de entorno

Crea un `.env.local` en la raíz:

| Variable                | Obligatoria | Descripción                                                        |
| ----------------------- | ----------- | ------------------------------------------------------------------ |
| `DATABASE_URL`          | sí          | Cadena de conexión PostgreSQL. En Neon, la URL con pooling.         |
| `BLOB_READ_WRITE_TOKEN` | sí          | Token de lectura/escritura del Blob store de Vercel.                |
| `PORT`                  | no          | Puerto del servidor Express local. Por defecto `4000`.              |
| `COOKIE_SECURE`         | no          | `1` para enviar la cookie solo por HTTPS.                           |
| `TRUST_PROXY`           | no          | `1` si está detrás de un proxy inverso.                             |

Ejemplo para desarrollo local:

```bash
DATABASE_URL=postgres://tu_usuario@localhost:5432/my_setup_dev
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

Las tablas se crean automáticamente al arrancar la API.

## Desarrollo

```bash
npm install
npm run dev
```

Esto arranca a la vez:

- Web (Vite): <http://localhost:5173>
- API (Express): <http://localhost:4000>

Abre **la URL de la web**, no el archivo `dist/index.html`. Vite reenvía `/api` al puerto 4000. Las imágenes se suben directamente desde el navegador a Vercel Blob.

## Producción local

```bash
npm run build
npm start
```

La web y la API se sirven desde el mismo origen: <http://localhost:4000>.

## Despliegue en Vercel

1. Importa el repositorio en Vercel (framework **Vite**).
2. Añade un proyecto de **Neon Postgres** desde el Marketplace y conéctalo al proyecto. Vercel inyecta `DATABASE_URL`.
3. Crea un **Blob store** y conéctalo al proyecto. Vercel inyecta `BLOB_READ_WRITE_TOKEN`.
4. Despliega. `vercel.json` compila la web en `dist/` y expone Express mediante `api/[...path].ts`.

No hace falta configurar el directorio de salida ni el comando de build: están definidos en `vercel.json`.

### Subidas de imágenes

Las fotos no pasan por la función de Vercel (límite de 4,5 MB por petición). El navegador pide un token a `/api/blob/upload` y sube el archivo directamente a Vercel Blob. Después, `POST /api/setups` guarda las URLs públicas en PostgreSQL.

## Datos

- Usuarios, setups, imágenes (URLs), comentarios y likes: PostgreSQL.
- Archivos de imagen: Vercel Blob, bajo el prefijo `setups/`.

Para vaciar una base de datos **local**:

```bash
npm run db:reset
```

El script se niega a vaciar bases remotas salvo que se ejecute con `ALLOW_REMOTE_RESET=1`.

## Scripts

- `npm run dev`: API con recarga + Vite
- `npm run build`: compila la web en `dist/`
- `npm start`: servidor de producción
- `npm run typecheck`: comprueba TypeScript (cliente y servidor)
- `npm run db:reset`: vacía la base de datos local
