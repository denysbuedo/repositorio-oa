# Guia de despliegue y operacion

Esta guia define una base operativa para ejecutar el Repositorio OA en un entorno institucional. No sustituye las politicas de infraestructura de la institucion, pero deja claros los puntos minimos que deben controlarse antes de produccion.

## Componentes

- Frontend Next.js: interfaz publica, ficha del OA, administracion y vistas LTI.
- Backend NestJS: API, autenticacion, metadatos, LTI, analitica y archivos.
- PostgreSQL: base de datos transaccional.
- Carpeta `uploads`: archivos originales de los objetos de aprendizaje.

## Variables de entorno criticas

Backend:

- `PORT`: puerto de API, por defecto `3001`.
- `DB_HOST`: host de PostgreSQL.
- `DB_PORT`: puerto de PostgreSQL.
- `DB_USERNAME`: usuario de base de datos.
- `DB_PASSWORD`: contrasena de base de datos.
- `DB_DATABASE`: nombre de base de datos.
- `DB_SYNC`: debe estar en `false` en produccion.
- `JWT_SECRET`: secreto fuerte para tokens administrativos.
- `CORS_ORIGIN`: origenes permitidos separados por coma.
- `MAX_UPLOAD_SIZE_BYTES`: tamano maximo permitido para archivos.
- `PUBLIC_FRONTEND_URL`: URL publica del frontend para URLs canonicas.

Frontend:

- `NEXT_PUBLIC_API_URL`: URL publica del backend.

## Preparacion de produccion

1. Crear la base de datos PostgreSQL y un usuario con permisos limitados.
2. Configurar `.env` del backend con `DB_SYNC=false`.
3. Ejecutar las migraciones SQL disponibles en `scripts/` en orden historico.
4. Crear la carpeta persistente `uploads` con permisos de lectura/escritura para el backend.
5. Configurar `JWT_SECRET` con un valor unico y robusto.
6. Configurar `CORS_ORIGIN` solo con los dominios autorizados.
7. Configurar HTTPS en el proxy o balanceador institucional.
8. Validar el endpoint `GET /health`.
9. Ejecutar pruebas funcionales basicas: login admin, carga de OA, publicacion, descarga, OAI-PMH y LTI.

## Migraciones actuales

Ejecutar si la base no tiene esos cambios:

- `scripts/collections_migration.sql`
- `scripts/versioning_preservation_migration.sql`
- `scripts/usage_analytics_migration.sql`
- `scripts/lti_platforms_migration.sql`
- `scripts/persistent_identifiers_migration.sql`

## Salud del sistema

Endpoint:

- `GET /health`

Respuesta esperada:

```json
{
  "status": "ok",
  "service": "repositorio-oa-backend",
  "timestamp": "2026-06-26T00:00:00.000Z",
  "checks": {
    "database": {
      "status": "ok"
    },
    "uploads": {
      "status": "ok"
    }
  }
}
```

Interpretacion:

- `ok`: backend, base de datos y carpeta de archivos responden.
- `degraded`: el backend responde, pero algun chequeo esta en advertencia o error.
- `database.status=error`: revisar conexion, credenciales, red o disponibilidad de PostgreSQL.
- `uploads.status=warning`: revisar existencia y permisos de la carpeta `uploads`.

## Checklist posterior al despliegue

- El frontend carga sin errores en navegador.
- `GET /health` devuelve `status=ok`.
- El panel admin permite iniciar sesion.
- Se puede crear un OA en borrador.
- Se puede subir un PDF/DOCX valido.
- El reporte de calidad se calcula correctamente.
- Se puede publicar un OA con metadatos completos.
- La ficha publica `/objects/{id}` abre correctamente.
- La descarga se sirve desde `GET /learning-objects/{id}/download`.
- `GET /learning-objects/{id}/metadata` devuelve Dublin Core y LRMI.
- `GET /oai?verb=Identify` responde correctamente.
- Si se usa LMS, una plataforma LTI registrada puede lanzar y seleccionar OA.

## Operacion diaria

- Revisar `GET /health` periodicamente.
- Revisar logs del backend ante errores `500`.
- Revisar capacidad de disco de `uploads`.
- Revisar crecimiento de la base de datos y tabla de analitica.
- Mantener copia externa de base de datos y archivos.
- Probar restauracion de backups con una frecuencia definida por la institucion.

## Criterio de listo para piloto institucional

El sistema puede considerarse listo para piloto si:

- Tiene HTTPS y dominio institucional.
- Usa `DB_SYNC=false`.
- Tiene backups activos y restauracion probada.
- Tiene usuario admin institucional.
- Tiene al menos una prueba completa de carga, publicacion, descarga y cosecha OAI-PMH.
- Tiene una prueba LTI con LMS real si ese canal se usara en el piloto.
