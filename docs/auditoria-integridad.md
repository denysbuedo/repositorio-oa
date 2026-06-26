# Auditoria de integridad de archivos

La auditoria de integridad verifica que los archivos almacenados en `uploads` sigan existiendo y que su checksum SHA-256 coincida con el valor registrado en la base de datos.

## Endpoint

- `GET /learning-objects/admin/integrity-audit`
- `POST /learning-objects/admin/recalculate-checksums`

Requiere token administrativo:

```http
Authorization: Bearer <token>
```

## Respuesta

```json
{
  "status": "ok",
  "generatedAt": "2026-06-26T00:00:00.000Z",
  "summary": {
    "total": 10,
    "ok": 8,
    "no_file": 1,
    "missing_file": 0,
    "missing_checksum": 1,
    "checksum_mismatch": 0
  },
  "items": []
}
```

## Estados

- `ok`: el archivo existe y el checksum coincide.
- `no_file`: el OA no tiene archivo asociado.
- `missing_file`: el OA apunta a un archivo que no existe en `uploads`.
- `missing_checksum`: el archivo existe, pero no hay checksum guardado.
- `checksum_mismatch`: el archivo existe, pero el checksum actual no coincide con el registrado.

## Reparacion de checksums faltantes

El endpoint `POST /learning-objects/admin/recalculate-checksums` calcula y guarda el SHA-256 de archivos existentes que no tienen checksum registrado.

La accion:

- Actualiza solo recursos con `missing_checksum`.
- No sobrescribe checksums existentes.
- No corrige `checksum_mismatch`, porque eso debe revisarse como posible incidente de integridad.
- Registra un evento de preservacion `checksum_calculated` por cada recurso actualizado.

Respuesta esperada:

```json
{
  "status": "ok",
  "summary": {
    "total": 2,
    "updated": 2,
    "skipped_no_file": 0,
    "skipped_missing_file": 0,
    "skipped_invalid_path": 0
  }
}
```

## Interpretacion operativa

El estado general sera:

- `ok`: no hay hallazgos criticos.
- `attention_required`: existe al menos un archivo faltante, checksum faltante o checksum diferente.

## Acciones recomendadas

Para `missing_file`:

- Revisar si el archivo fue eliminado manualmente.
- Restaurar desde backup si el OA estaba publicado.
- Registrar decision editorial si el recurso no puede recuperarse.

Para `missing_checksum`:

- Revisar si el OA fue creado antes de la etapa de preservacion.
- Ejecutar `POST /learning-objects/admin/recalculate-checksums` si el archivo existe.
- Reprocesar o reemplazar el archivo si no puede calcularse el checksum.

Para `checksum_mismatch`:

- No publicar ni reutilizar el archivo hasta revisar la causa.
- Comparar contra backup.
- Restaurar la version integra si corresponde.
- Registrar incidente de preservacion.

## Frecuencia recomendada

- Semanal durante piloto.
- Mensual en operacion estable.
- Inmediatamente despues de una restauracion.
- Antes de cierres academicos o auditorias institucionales.

## Relacion con backups

La auditoria no reemplaza los backups. Sirve para detectar problemas de integridad y confirmar que los archivos restaurados corresponden con los checksums registrados.
