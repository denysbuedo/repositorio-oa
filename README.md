# Repositorio de Objetos de Aprendizaje

Aplicacion web para gestionar objetos de aprendizaje, cargar recursos PDF/DOCX, generar metadatos IEEE LOM con IA local y exponer recursos mediante un flujo LTI inicial.

## Stack

- Backend: NestJS, TypeORM, PostgreSQL, Ollama, LTI 1.3 prototipo.
- Frontend: Next.js App Router, React.
- Base de datos: PostgreSQL.

## Requisitos

- Node.js 20 o superior.
- npm.
- PostgreSQL escuchando en `localhost:5432`.
- Ollama opcional para generacion de metadatos. Si no esta disponible, el backend usa metadata fallback.

## Configuracion

Backend:

```bash
cd backend
copy .env.example .env
```

Variables principales:

- `PORT`: puerto del backend, por defecto `3001`.
- `CORS_ORIGIN`: origen permitido del frontend.
- `FRONTEND_URL`: URL usada por LTI para redirigir al visor.
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`: conexion PostgreSQL.
- `DB_SYNC`: usar `true` solo en desarrollo local.
- `OLLAMA_URL`, `OLLAMA_MODEL`: configuracion de IA local.
- `LTI_CLIENT_ID`: client id usado en el login OIDC LTI.

Frontend:

```bash
cd frontend
copy .env.example .env.local
```

- `NEXT_PUBLIC_API_URL`: URL publica del backend.

## Instalacion

```bash
npm --prefix backend install
npm --prefix frontend install
```

## Desarrollo

Desde la raiz:

```bash
npm run dev
```

URLs locales:

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Simulador LTI: http://localhost:3000/simulator

Logs generados por `npm run dev`:

- `C:\tmp\roa-backend.log`
- `C:\tmp\roa-frontend.log`

Tambien puedes iniciar servicios por separado:

```bash
npm run backend:dev
npm run frontend:dev
```

## Verificacion

```bash
npm run verify
```

Este comando ejecuta lint, tests y build del backend, y lint/build del frontend.

## Ramas

- `main`: version estable publicada.
- `dev`: rama de desarrollo activa.

## Notas De Seguridad

- No subir archivos `.env`.
- No subir `node_modules`, `dist`, `.next` ni `uploads`.
- `DB_SYNC=true` es solo para desarrollo local; en despliegue deben usarse migraciones.
- El flujo LTI actual es prototipo: todavia falta validar `id_token`, `issuer`, `audience`, `state` y `nonce`.
