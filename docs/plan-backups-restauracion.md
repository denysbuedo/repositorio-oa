# Plan de backups, restauracion e integridad

Este plan define el minimo operativo para proteger los objetos de aprendizaje, sus metadatos, las versiones, la analitica y los archivos preservados.

## Alcance

Respaldar siempre dos elementos:

- Base de datos PostgreSQL.
- Carpeta persistente `uploads`.

Un backup de solo base de datos no es suficiente, porque los archivos originales de los OA viven fuera de PostgreSQL.

## Frecuencia recomendada

- Base de datos: backup diario.
- `uploads`: backup diario incremental o sincronizacion versionada.
- Backup completo: semanal.
- Prueba de restauracion: mensual durante piloto, trimestral en operacion estable.

## Retencion sugerida

- Diarios: 14 dias.
- Semanales: 8 semanas.
- Mensuales: 12 meses.

La institucion puede ajustar estos valores segun normativa interna.

## Procedimiento de backup

1. Registrar fecha, hora y responsable.
2. Ejecutar backup de PostgreSQL con `pg_dump`.
3. Comprimir y copiar la carpeta `uploads`.
4. Guardar ambos respaldos en almacenamiento externo al servidor.
5. Verificar que los archivos de respaldo no esten vacios.
6. Registrar resultado del proceso.

Ejemplo de base de datos:

```powershell
pg_dump -h DB_HOST -p DB_PORT -U DB_USERNAME -d DB_DATABASE -Fc -f roa-db.dump
```

Ejemplo de archivos:

```powershell
Compress-Archive -Path uploads -DestinationPath roa-uploads.zip
```

## Procedimiento de restauracion

1. Detener backend y tareas programadas relacionadas.
2. Restaurar PostgreSQL desde el dump validado.
3. Restaurar la carpeta `uploads` en la misma ruta usada por el backend.
4. Revisar permisos de lectura/escritura.
5. Iniciar backend.
6. Validar `GET /health`.
7. Probar una ficha publica y una descarga real.
8. Registrar fecha, responsable y resultado.

Ejemplo de restauracion de base:

```powershell
pg_restore -h DB_HOST -p DB_PORT -U DB_USERNAME -d DB_DATABASE --clean --if-exists roa-db.dump
```

## Auditoria de integridad

El repositorio guarda checksum SHA-256 de archivos publicados. La auditoria debe comparar:

- Archivo existente en `uploads`.
- Checksum calculado del archivo.
- Checksum almacenado en el OA y en sus versiones.

Resultado esperado:

- Si el checksum coincide, el archivo se considera integro.
- Si el archivo falta, el OA debe marcarse para revision.
- Si el checksum no coincide, se debe investigar posible corrupcion o reemplazo no autorizado.

Endpoint disponible:

- `GET /learning-objects/admin/integrity-audit`
- `POST /learning-objects/admin/recalculate-checksums`

Documentacion especifica:

- `docs/auditoria-integridad.md`

## Incidentes

Ante perdida o corrupcion:

1. No sobrescribir respaldos existentes.
2. Congelar cambios en el repositorio si el incidente afecta archivos publicados.
3. Identificar OA afectados.
4. Restaurar desde el ultimo backup integro.
5. Registrar evento de preservacion y decision editorial.

## Pendientes de automatizacion

- Script institucional de backup.
- Programacion institucional de la auditoria de checksums.
- Alerta automatica si `/health` devuelve `degraded`.
- Alerta por bajo espacio en disco.
- Exportacion de reporte de integridad.
