# Guia administrativa: versionado, preservacion y calidad

Esta guia resume el flujo operativo para administrar Objetos de Aprendizaje en el repositorio.

## Flujo general

1. Crear o cargar un OA.
2. Subir archivo PDF o DOCX.
3. Validar procesamiento y metadatos generados.
4. Completar perfil ROA minimo.
5. Revisar accesibilidad y calidad.
6. Publicar solo cuando no existan bloqueos.
7. Mantener historial, checksum y eventos de preservacion.

## Perfil ROA minimo

Antes de publicar, el recurso debe tener:

- Titulo.
- Descripcion.
- Autor.
- Archivo.
- Coleccion.
- Idioma.
- Palabras clave.
- Tipo de recurso.
- Nivel de dificultad.
- Nivel educativo.
- Audiencia.
- Licencia.

Si falta alguno, el backend bloquea la publicacion.

## Validacion de archivo

El repositorio acepta inicialmente:

- PDF.
- DOCX.

La validacion usa tres niveles:

- MIME declarado por el navegador.
- Extension del archivo.
- Firma o estructura real del contenido.

Si el archivo no coincide con la politica, se elimina la carga y no se actualiza el OA.

Referencia: `docs/politica-formatos-aceptados.md`.

## Versionado

Cada OA tiene una version visible.

- Antes de publicar, la version inicial es `0.1`.
- Al publicar por primera vez, se genera `1.0`.
- Si un OA publicado cambia metadatos o archivo, se incrementa version menor: `1.1`, `1.2`, etc.

El historial queda disponible en el panel admin como snapshot de:

- Titulo.
- Descripcion.
- Autor.
- Metadatos.
- Archivo.
- Tamano.
- MIME.
- Checksum SHA-256.
- Fecha del snapshot.

Endpoint admin:

```text
GET /learning-objects/{id}/versions
```

## Preservacion

Cada archivo aceptado genera checksum SHA-256.

El sistema registra eventos de preservacion para:

- Checksum calculado.
- Snapshot versionado creado.
- Archivo reemplazado.

Endpoint admin:

```text
GET /learning-objects/{id}/preservation-events
```

Los eventos permiten auditar que el archivo fue verificado y que los cambios relevantes quedaron trazados.

## Calidad y accesibilidad

El panel admin muestra un reporte de calidad por OA.

Endpoint admin:

```text
GET /learning-objects/{id}/quality-report
```

El reporte calcula:

- Score de calidad.
- Bloqueos.
- Advertencias.
- Chequeos superados.

Categorias evaluadas:

- Metadatos.
- Archivo.
- Preservacion.
- Accesibilidad.

Referencia: `docs/checklist-calidad-accesibilidad-oa.md`.

## Campos de accesibilidad

El admin debe revisar:

- Texto seleccionable.
- Encabezados estructurados.
- Texto alternativo.
- Orden de lectura.
- Contraste suficiente.
- Subtitulos o transcripcion.
- Observaciones de accesibilidad.

Estos campos se guardan en:

```text
lomMetadata.accessibility
```

Tambien se exponen en la ficha publica y en LRMI/schema.org.

## Publicacion

Al intentar publicar:

- Los bloqueos impiden la publicacion.
- Las advertencias muestran confirmacion editorial.
- Si no hay bloqueos ni advertencias criticas, el OA puede publicarse.

El backend vuelve a validar calidad antes de aceptar `status=published`, por lo que no depende solo del frontend.

## Recomendaciones operativas

- Revisar el reporte de calidad antes de publicar.
- No publicar OA con accesibilidad sin revisar salvo decision editorial explicita.
- Mantener observaciones claras cuando un criterio no aplica.
- Reemplazar archivos solo cuando sea necesario, porque genera nueva version.
- Usar colecciones para mantener cosecha OAI-PMH organizada por set.

## Pendientes de mejora

- Registrar responsable/revisor editorial.
- Guardar comentarios formales de revision.
- Validar PDF y DOCX con analizadores estructurales mas profundos.
- Agregar reporte agregado de calidad por coleccion.
- Incorporar analitica de uso y descargas.
