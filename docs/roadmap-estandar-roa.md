# Hoja de ruta para un ROA de nivel internacional

Este documento resume la ruta de desarrollo para convertir el Repositorio de Objetos de Aprendizaje en una plataforma interoperable, gobernable y alineada con practicas internacionales.

## Objetivo

Construir un repositorio que no solo almacene OA, sino que pueda ser usado, citado, cosechado, integrado y preservado por sistemas academicos externos.

## Estado actual

- Catalogo publico de OA publicados.
- Panel administrativo para revisar, aprobar, archivar y eliminar recursos.
- Subida de archivos PDF/DOCX.
- Extraccion y generacion inicial de metadatos con IA.
- Metadatos IEEE LOM parciales.
- Colecciones para agrupar OA.
- Busqueda por texto, tipo, dificultad y coleccion.
- Integracion LTI inicial.
- Perfil ROA minimo con validacion editorial antes de publicar.
- Licencia, derechos, idioma, nivel educativo y audiencia en el flujo admin.
- URL publica estable por OA: `/objects/{id}`.
- Ficha publica del OA con metadatos academicos, licencia, derechos y palabras clave.
- Exportacion publica de metadatos por OA en JSON: Dublin Core y LRMI/schema.org.
- JSON-LD LRMI/schema.org embebido en la ficha publica.
- Endpoint OAI-PMH publico para cosecha externa.
- Version visible por OA.
- Checksum SHA-256 del archivo preservado.
- Snapshot versionado al publicar o actualizar un OA publicado.

## Estado al cierre del 14 de junio de 2026

Ultimo commit registrado al cierre:

- `606bcc5 Add learning object versioning and checksums`

Trabajo completado en esta sesion de estabilizacion:

- `9669382 Add collections for learning objects`: se creo el modulo de colecciones, relacion con OA, filtro publico/admin y asignacion desde revision.
- `56dd4a5 Add international ROA roadmap`: se creo esta hoja de ruta.
- `33ee711 Add ROA profile publication validation`: se agrego el perfil ROA minimo y el bloqueo backend para impedir publicar recursos incompletos.
- `b43352d Add public object detail pages`: se creo la ficha publica estable `/objects/{id}` y se hizo visible la licencia en catalogo/LTI.
- `ae2e42e Add metadata export endpoint`: se agrego el endpoint publico de exportacion Dublin Core/LRMI y JSON-LD en la ficha publica.
- `fe3e5f9 Update ROA roadmap progress`: se documento el estado de avance y el punto exacto para retomar.
- `39405a5 Add OAI-PMH harvesting endpoint`: se implemento el endpoint publico de cosecha OAI-PMH con `oai_dc` y sets por coleccion.
- `606bcc5 Add learning object versioning and checksums`: se inicio Fase 5 con versionado, checksum SHA-256, snapshots y visualizacion basica en admin/ficha publica.

Validaciones ejecutadas durante el cierre y fases posteriores:

- `npm.cmd --prefix backend run build`
- `npm.cmd --prefix backend run lint`
- `npm.cmd --prefix frontend run lint`
- `npm.cmd --prefix frontend run build`
- Prueba HTTP del endpoint `/learning-objects/{id}/metadata` con respuesta `200`.
- Prueba HTTP de la ficha `/objects/{id}` con respuesta `200`.
- Pruebas HTTP OAI-PMH basicas con respuesta `200`.
- `npm.cmd --prefix backend test -- --runInBand`

Estado local conocido:

- La rama activa de trabajo es `dev`.
- Los cambios principales fueron subidos a `origin/dev`.
- Quedan sin versionar `start-backend.bat` y `start-frontend.bat`; no forman parte de los commits recientes.
- La base local ya tiene aplicada la migracion de colecciones usando `scripts/collections_migration.sql`.
- Para Fase 5 existe la migracion `scripts/versioning_preservation_migration.sql`; debe aplicarse si `DB_SYNC` no esta activo.

Punto exacto para retomar:

- Fase 4, OAI-PMH, quedo implementada y validada en backend.
- Fase 5 quedo iniciada con version actual, checksum SHA-256 y snapshots.
- Siguiente paso recomendado: endpoint admin para listar versiones de un OA y mostrar el historial en el panel admin.

## Brechas principales

### 1. Perfil formal de metadatos

Actualmente se almacena `lomMetadata` como JSON flexible. Para un repositorio estandar se necesita definir un perfil institucional de metadatos:

- Campos obligatorios.
- Campos opcionales.
- Vocabularios controlados.
- Reglas de validacion.
- Correspondencia entre IEEE LOM, Dublin Core y LRMI.

Campos prioritarios:

- Titulo.
- Descripcion.
- Autor o creador.
- Idioma.
- Tipo de recurso.
- Nivel de dificultad.
- Nivel educativo.
- Audiencia.
- Palabras clave.
- Formato tecnico.
- Tamano.
- Version.
- Fecha de creacion y publicacion.
- Licencia.
- Derechos.
- Coleccion.
- Relaciones con otros OA.

### 2. Validacion antes de publicar

Un OA no debe publicarse si faltan datos criticos. El admin debe mostrar una lista clara de bloqueos o advertencias.

Campos minimos para publicar:

- Titulo.
- Descripcion.
- Autor.
- Archivo disponible.
- Tipo de recurso.
- Dificultad.
- Idioma.
- Licencia.
- Palabras clave.
- Coleccion o clasificacion tematica.

### 3. Licenciamiento y derechos

Cada OA debe declarar su condicion de uso. Esto es clave para reutilizacion academica y OER.

Opciones sugeridas:

- CC BY.
- CC BY-SA.
- CC BY-NC.
- CC BY-NC-SA.
- Dominio publico.
- Uso institucional restringido.
- Copyright reservado.

El sistema debe mostrar la licencia en el catalogo, admin, vista LTI y exportaciones.

### 4. Dublin Core y LRMI

Ademas de LOM, el repositorio debe poder exponer metadatos en formatos ampliamente usados en repositorios y web semantica.

Implementaciones recomendadas:

- Endpoint JSON Dublin Core por OA.
- Endpoint LRMI/schema.org JSON-LD por OA.
- Marcado JSON-LD en la pagina publica del recurso.
- Mapeo interno LOM -> Dublin Core -> LRMI.

### 5. OAI-PMH

Para interoperabilidad con recolectores externos, el repositorio debe implementar OAI-PMH.

Endpoints requeridos:

- `Identify`
- `ListMetadataFormats`
- `ListSets`
- `ListIdentifiers`
- `ListRecords`
- `GetRecord`

Formatos iniciales:

- `oai_dc`
- `lom`
- `lrmi` o JSON-LD equivalente si se define como extension.

### 6. Identificadores persistentes

El UUID interno no es suficiente como identificador academico. Se necesita una URL publica estable y, si el contexto institucional lo permite, un identificador persistente.

Opciones:

- URL canonica permanente: `/objects/{id}`.
- Handle.
- DOI.
- ARK.

Primera fase recomendada:

- Crear URL publica estable por OA.
- Guardar `canonicalUrl`.
- Exponerla en metadatos y exportaciones.

### 7. Versionado de OA

Un recurso publicado no debe cambiar silenciosamente. Debe existir historial.

Requisitos:

- Version visible: `1.0`, `1.1`, `2.0`.
- Fecha de version.
- Autor del cambio.
- Motivo del cambio.
- Historial de metadatos.
- Historial de archivo.
- Posibilidad de citar una version especifica.

### 8. Accesibilidad

La plataforma debe avanzar hacia WCAG 2.2 AA.

Areas a cubrir:

- Contraste.
- Navegacion por teclado.
- Etiquetas ARIA cuando apliquen.
- Estados de foco visibles.
- Textos alternativos.
- PDFs accesibles.
- Documentos DOCX con estructura.
- Videos con subtitulos si se soportan.

### 9. LTI completo

La integracion LTI actual debe madurar hacia un flujo mas robusto.

Pendientes:

- Registro de plataformas LMS.
- Validacion completa de claims.
- Deep Linking.
- Roles.
- Contexto de curso.
- Logs de lanzamientos.
- Seguridad por plataforma.
- Configuracion admin por consumidor LTI.

### 10. Preservacion digital

El repositorio debe garantizar que los archivos sean verificables y preservables.

Pendientes:

- Checksum SHA-256 por archivo.
- Validacion de MIME real.
- Politica de formatos aceptados.
- Registro de eventos de preservacion.
- Auditoria de integridad.
- Copias de seguridad.
- Metadatos de preservacion compatibles con PREMIS en fases posteriores.

### 11. Calidad editorial

La publicacion debe tener una trazabilidad clara.

Pendientes:

- Rúbrica de evaluacion.
- Estado de revision.
- Revisor asignado.
- Fecha de aprobacion.
- Comentarios editoriales.
- Historial de decisiones.
- Indicador de completitud de metadatos.

### 12. Analitica y uso

Para gestion profesional, el repositorio debe medir uso e impacto.

Indicadores:

- Descargas.
- Visualizaciones.
- Lanzamientos LTI.
- OA mas usados.
- Colecciones mas consultadas.
- Filtros mas usados.
- Recursos con baja completitud.

## Plan de desarrollo por fases

### Fase 1: Perfil de metadatos y validacion editorial

- [x] Definir perfil institucional ROA minimo.
- [x] Agregar campos faltantes al modelo mediante `lomMetadata` JSONB.
- [x] Actualizar formulario admin.
- [x] Crear validacion backend antes de publicar.
- [x] Mostrar completitud de metadatos.

Campos actualmente exigidos para publicar:

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

### Fase 2: Licencias, derechos e identificadores

- [x] Agregar licencias y derechos.
- [x] Mostrar licencia en catalogo.
- [x] Mostrar licencia en vista LTI.
- [x] Crear URL canonica por OA: `/objects/{id}`.
- [ ] Preparar identificador persistente externo o institucional.

Decision actual:

- El UUID sigue siendo el identificador interno.
- La URL canonica publica es el identificador estable operativo.
- Queda pendiente evaluar DOI, Handle o ARK si existe soporte institucional.

### Fase 3: Exportacion e interoperabilidad

- [x] Implementar mapeo LOM -> Dublin Core.
- [x] Implementar JSON-LD LRMI/schema.org.
- [x] Agregar endpoint publico de metadatos por OA.
- [x] Embebido JSON-LD en ficha publica del OA.
- [x] Preparar OAI-PMH.

Endpoint disponible:

- `GET /learning-objects/{id}/metadata`

Formatos devueltos:

- `dublinCore`
- `lrmi`

### Fase 4: OAI-PMH

- [x] Implementar verbos basicos OAI-PMH.
- [x] Exponer `oai_dc`.
- [x] Exponer sets por coleccion.
- [x] Validar respuestas basicas por HTTP.
- [ ] Documentar endpoint de cosecha para administradores externos.

Endpoint disponible:

- `GET /oai`

Verbos implementados:

- `Identify`
- `ListMetadataFormats`
- `ListSets`
- `ListIdentifiers`
- `ListRecords`
- `GetRecord`

Ejemplos:

- `/oai?verb=Identify`
- `/oai?verb=ListMetadataFormats`
- `/oai?verb=ListSets`
- `/oai?verb=ListRecords&metadataPrefix=oai_dc`
- `/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:repositorio-oa:{id}`

### Fase 5: Versionado y preservacion

- [x] Crear entidad de versiones.
- [x] Registrar snapshots al publicar o actualizar un OA publicado.
- [x] Calcular checksum SHA-256 al subir archivos.
- [x] Mostrar version y checksum en admin.
- [x] Mostrar version y checksum en ficha publica.
- [x] Preparar migracion SQL inicial.
- [ ] Crear vista historica completa de versiones.
- [ ] Guardar eventos de preservacion independientes.
- [ ] Validar MIME real por contenido, no solo por declaracion del navegador.

Implementacion inicial:

- Campo `currentVersion` en cada OA.
- Campo `fileChecksumSha256` en cada OA.
- Entidad `LearningObjectVersion` con snapshot de metadatos, archivo y checksum.
- Version `1.0` al publicar por primera vez.
- Incremento menor automatico para actualizaciones de archivo o metadatos en OA ya publicados.
- Script disponible: `scripts/versioning_preservation_migration.sql`.

### Fase 6: Accesibilidad y calidad de recursos

- Auditoria WCAG 2.2 AA de la UI.
- Checklist de accesibilidad por archivo.
- Campos de accesibilidad en metadatos.
- Reporte de calidad por OA.

### Fase 7: LTI avanzado y analitica

- Mejorar configuracion LTI.
- Agregar Deep Linking.
- Registrar uso por curso/plataforma.
- Crear dashboard de analitica.

## Prioridad inmediata

La siguiente tarea recomendada al retomar es completar la Fase 5 con historial visible y eventos de preservacion.

Orden sugerido:

1. Crear endpoint admin para listar versiones de un OA.
2. Mostrar historial de versiones en el panel admin.
3. Crear eventos de preservacion: checksum calculado, archivo reemplazado, metadata snapshot, auditoria futura.
4. Agregar validacion de MIME real por firma/contenido.
5. Preparar una politica de formatos aceptados.

Pendiente menor de Fase 4:

- Documentar formalmente para terceros la URL de cosecha OAI-PMH y ejemplos de uso.

## Referencias

- IEEE Learning Object Metadata / IEEE 1484.12.1.
- Dublin Core Metadata Initiative: DCMI Metadata Terms.
- LRMI: Learning Resource Metadata Initiative.
- OAI-PMH: Open Archives Initiative Protocol for Metadata Harvesting.
- 1EdTech LTI 1.3.
- W3C WCAG 2.2.
- Creative Commons / Open Educational Resources.
- PREMIS Preservation Metadata.
