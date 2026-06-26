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
- Historial de versiones visible en el panel admin.
- Eventos de preservacion visibles en el panel admin.
- Validacion de contenido real para PDF/DOCX.
- Politica inicial de formatos aceptados.
- Foco visible global y soporte `prefers-reduced-motion` en la UI.
- Checklist inicial de calidad/accesibilidad por OA.
- Campos estructurados de accesibilidad en admin, ficha publica y LRMI.
- Reporte de calidad calculado por OA en admin.
- Bloqueos y advertencias de calidad conectados al flujo de publicacion.
- Guia administrativa de versionado, preservacion y calidad.
- Enlace global para saltar al contenido principal.
- Analitica minima de uso: vistas, descargas y lanzamientos LTI.
- Descargas servidas por endpoint trazable.
- Resumen de uso visible en el panel administrativo.
- Registro administrativo inicial de plataformas LTI.
- Validacion real de launches LTI con `id_token` firmado contra JWKS registrado.
- Deep Linking LTI para seleccionar OA publicados desde un LMS.
- Eventos LTI enriquecidos con plataforma, curso/contexto, usuario y roles.
- Dashboard admin de analitica con filtros por periodo/origen, tendencia diaria y desgloses por OA, fuente, plataforma y curso.

## Historial de cierres

### Cierre del 14 de junio de 2026

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

Punto exacto documentado en ese cierre:

- Fase 4, OAI-PMH, quedo implementada y validada en backend.
- Fase 5 quedo iniciada con version actual, checksum SHA-256, snapshots, historial visible y eventos de preservacion en admin.
- El siguiente paso recomendado entonces era preparar Fase 6 de accesibilidad y calidad.

### Cierre del 26 de junio de 2026

Ultimo commit registrado al cierre:

- `0f00cc0 Update roadmap closure status`

Trabajo completado desde el cierre anterior:

- `bf8f20b Show learning object version history`: se completo el historial de versiones visible en admin.
- `0c4982c Add preservation event audit trail`: se agrego registro auditable de eventos de preservacion.
- `25f9849 Validate uploaded resource file content`: se valido contenido real de PDF/DOCX antes de registrar archivos.
- `8ee440a Document OAI-PMH harvesting`: se documento la cosecha OAI-PMH.
- `019b762 Add accessibility quality checklist`: se agrego checklist inicial de accesibilidad/calidad.
- `2ad4674 Add accessibility metadata fields`: se agregaron campos estructurados de accesibilidad.
- `7817a17 Add learning object quality report`: se agrego reporte de calidad por OA.
- `7f739c8 Enforce quality checks before publishing`: se conectaron bloqueos de calidad al flujo de publicacion.
- `0cbf70d Document admin quality workflow`: se documento el flujo admin de calidad.
- `378dc82 Add skip link for keyboard navigation`: se agrego enlace global para saltar al contenido.
- `3d6d122 Add usage analytics tracking`: se implemento analitica minima y descargas trazables.
- `27a63ba Add LTI platform registry`: se agrego registro administrativo de plataformas LTI.
- `a623936 Validate LTI launch tokens`: se valido `id_token` LTI contra JWKS registrado y se guardo contexto LMS.
- `915734e Add LTI deep linking flow`: se agrego flujo Deep Linking para seleccionar OA desde LMS.
- `069c8cc Add advanced analytics dashboard`: se agrego dashboard admin con filtros y desgloses de analitica.

Validaciones ejecutadas durante esta etapa:

- `npm.cmd --prefix backend run build`
- `npm.cmd --prefix backend run lint`
- `npm.cmd --prefix backend test -- --runInBand`
- `npm.cmd --prefix frontend run lint`
- `npm.cmd --prefix frontend run build`
- Prueba HTTP de `GET /learning-objects` con respuesta `200`.
- Prueba HTTP de `POST /analytics/events` con respuesta `201`.
- Prueba HTTP de `GET /analytics/summary?days=30&source=all` con token admin y datos de resumen.
- Prueba HTTP de `GET /lti/platforms` sin token con respuesta `401`.
- Prueba CRUD real de plataforma LTI temporal: crear, listar y eliminar.
- Prueba HTTP legacy de `POST /lti/launch` con `custom_object_id` y redireccion `302`.
- Prueba HTTP de `/lti/deep-link` con respuesta `200`.
- Prueba HTTP de `POST /lti/deep-linking-response` sin payload con respuesta `400`.

Migraciones aplicadas localmente:

- `scripts/collections_migration.sql`
- `scripts/versioning_preservation_migration.sql`
- `scripts/usage_analytics_migration.sql`
- `scripts/lti_platforms_migration.sql`
- `scripts/persistent_identifiers_migration.sql`

Estado local conocido:

- La rama activa de trabajo es `dev`.
- Los cambios fueron subidos a `origin/dev`.
- Quedan sin versionar `start-backend.bat` y `start-frontend.bat`; se mantienen locales.
- Backend y frontend quedaron funcionales durante las pruebas en `http://localhost:3001` y `http://localhost:3000`.

Punto exacto para retomar:

- Fase 7 esta funcionalmente completa: analitica, plataformas LTI, validacion de launch, Deep Linking y dashboard.
- Siguiente paso recomendado: cerrar Fase 7 con documentacion operativa LTI y checklist de pruebas Moodle/Canvas.
- Despues de documentar LTI, evaluar inicio de una nueva fase centrada en identificadores persistentes externos, auditoria editorial avanzada o despliegue/operacion.

## Brechas principales

### 1. Perfil formal de metadatos

Actualmente se almacena `lomMetadata` como JSON flexible y ya existe un perfil ROA minimo para publicar. La brecha real es formalizarlo como perfil institucional versionado:

- Campos obligatorios.
- Campos opcionales.
- Vocabularios controlados.
- Reglas de validacion.
- Correspondencia entre IEEE LOM, Dublin Core y LRMI.

Campos ya priorizados en el sistema:

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

Pendientes reales:

- Convertir el perfil minimo en una especificacion institucional versionada.
- Definir vocabularios controlados oficiales por campo.
- Documentar el mapeo completo IEEE LOM -> Dublin Core -> LRMI.
- Evaluar validacion estructural mas estricta sobre `lomMetadata`.

### 2. Validacion antes de publicar

El backend ya bloquea la publicacion si faltan datos criticos y el admin muestra completitud, bloqueos y advertencias.

Campos minimos exigidos para publicar:

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

Pendientes reales:

- Agregar responsable/revisor editorial.
- Guardar comentarios formales de revision.
- Registrar fecha de aprobacion y decision editorial.

### 3. Licenciamiento y derechos

Cada OA ya puede declarar licencia y derechos. Esto es clave para reutilizacion academica y OER.

Opciones sugeridas:

- CC BY.
- CC BY-SA.
- CC BY-NC.
- CC BY-NC-SA.
- Dominio publico.
- Uso institucional restringido.
- Copyright reservado.

El sistema muestra la licencia en catalogo, admin, ficha publica, vista LTI y exportaciones.

Pendientes reales:

- Normalizar licencias como vocabulario controlado institucional.
- Evaluar exposicion de URIs oficiales de Creative Commons cuando aplique.

### 4. Dublin Core y LRMI

Ademas de LOM, el repositorio ya expone metadatos en formatos ampliamente usados en repositorios y web semantica.

Implementaciones completadas:

- Endpoint JSON Dublin Core por OA.
- Endpoint LRMI/schema.org JSON-LD por OA.
- Marcado JSON-LD en la pagina publica del recurso.
- Mapeo interno LOM -> Dublin Core -> LRMI.

Pendientes reales:

- Completar documentacion formal del mapeo.
- Evaluar exportacion LOM XML si se requiere interoperabilidad con plataformas que no consumen JSON.

### 5. OAI-PMH

Para interoperabilidad con recolectores externos, el repositorio ya implementa OAI-PMH basico.

Endpoints implementados:

- `Identify`
- `ListMetadataFormats`
- `ListSets`
- `ListIdentifiers`
- `ListRecords`
- `GetRecord`

Formatos actuales y pendientes:

- `oai_dc`
- Pendiente: `lom` XML.
- Pendiente: `lrmi` o JSON-LD equivalente si se define como extension.

### 6. Identificadores persistentes

El UUID interno no es suficiente como identificador academico. Ya existe URL publica estable; queda pendiente evaluar un identificador persistente externo o institucional.

Opciones:

- URL canonica permanente: `/objects/{id}`.
- Handle.
- DOI.
- ARK.

Implementado:

- Crear URL publica estable por OA.
- Exponerla en metadatos y exportaciones.

Pendientes reales:

- Guardar `canonicalUrl` como campo persistido si se requiere independencia de configuracion.
- Evaluar DOI, Handle o ARK segun soporte institucional.
- Definir politica de citacion para versiones especificas.

### 7. Versionado de OA

Un recurso publicado ya no cambia silenciosamente: existe version visible, snapshots y eventos de preservacion.

Implementado:

- Version visible: `1.0`, `1.1`, `2.0`.
- Fecha de version.
- Autor del cambio.
- Motivo del cambio.
- Historial de metadatos.
- Historial de archivo.

Pendientes reales:

- Autor humano del cambio cuando exista sesion de editor/revisor.
- Motivo del cambio capturado desde UI.
- Posibilidad de citar una version especifica.

### 8. Accesibilidad

La plataforma ya tiene avances iniciales hacia WCAG 2.2 AA.

Implementado o iniciado:

- Contraste.
- Navegacion por teclado.
- Etiquetas ARIA cuando apliquen.
- Estados de foco visibles.
- Textos alternativos.

Pendientes reales:

- Auditoria formal WCAG 2.2 AA con evidencias.
- PDFs accesibles.
- Documentos DOCX con estructura.
- Videos con subtitulos si se soportan.

### 9. LTI completo

La integracion LTI ya incluye registro de plataformas, validacion de `id_token`, contexto LMS, Deep Linking y analitica.

Implementado:

- Registro de plataformas LMS.
- Validacion completa de claims.
- Deep Linking.
- Roles.
- Contexto de curso.
- Logs de lanzamientos.
- Seguridad por plataforma.
- Configuracion admin por consumidor LTI.

Pendientes reales:

- Documentacion operativa Moodle/Canvas.
- Pruebas guiadas contra un LMS real.
- Manejo persistente de nonce/state si se endurece el flujo OIDC.
- Soporte de multiples llaves de herramienta con rotacion.

### 10. Preservacion digital

El repositorio ya calcula checksum, valida formato real y registra eventos de preservacion. Queda avanzar hacia politicas institucionales de preservacion.

Implementado:

- Checksum SHA-256 por archivo.
- Validacion de MIME real.
- Politica de formatos aceptados.
- Registro de eventos de preservacion.

Pendientes reales:

- Auditoria de integridad.
- Copias de seguridad.
- Metadatos de preservacion compatibles con PREMIS en fases posteriores.

### 11. Calidad editorial

La publicacion ya tiene bloqueo por calidad y reporte por OA. La brecha real es trazabilidad editorial humana completa.

Pendientes:

- Rúbrica de evaluacion.
- Estado de revision.
- Revisor asignado.
- Fecha de aprobacion.
- Comentarios editoriales.
- Historial de decisiones.
- Indicador de completitud de metadatos.

### 12. Analitica y uso

Para gestion profesional, el repositorio ya mide uso e impacto basico y avanzado en admin.

Indicadores implementados:

- Descargas.
- Visualizaciones.
- Lanzamientos LTI.
- OA mas usados.
- Plataforma LTI.
- Curso/contexto.
- Origen.
- Tendencia diaria.

Pendientes reales:

- Colecciones mas consultadas.
- Filtros mas usados.
- Recursos con baja completitud.
- Exportacion CSV/Excel de analitica.

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
- [x] Documentar endpoint de cosecha para administradores externos.

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

Documentacion:

- `docs/oai-pmh-cosecha.md`

### Fase 5: Versionado y preservacion

- [x] Crear entidad de versiones.
- [x] Registrar snapshots al publicar o actualizar un OA publicado.
- [x] Calcular checksum SHA-256 al subir archivos.
- [x] Mostrar version y checksum en admin.
- [x] Mostrar version y checksum en ficha publica.
- [x] Preparar migracion SQL inicial.
- [x] Crear vista historica completa de versiones.
- [x] Guardar eventos de preservacion independientes.
- [x] Validar MIME real por contenido, no solo por declaracion del navegador.
- [x] Preparar politica de formatos aceptados.

Implementacion inicial:

- Campo `currentVersion` en cada OA.
- Campo `fileChecksumSha256` en cada OA.
- Entidad `LearningObjectVersion` con snapshot de metadatos, archivo y checksum.
- Endpoint admin `GET /learning-objects/{id}/versions`.
- Entidad `LearningObjectPreservationEvent` con eventos auditables.
- Endpoint admin `GET /learning-objects/{id}/preservation-events`.
- Validacion real de contenido para PDF y DOCX antes de registrar el archivo.
- Documento `docs/politica-formatos-aceptados.md`.
- Version `1.0` al publicar por primera vez.
- Incremento menor automatico para actualizaciones de archivo o metadatos en OA ya publicados.
- Script disponible: `scripts/versioning_preservation_migration.sql`.

### Fase 6: Accesibilidad y calidad de recursos

- [x] Auditoria inicial WCAG 2.2 AA de la UI.
- [x] Foco visible global para navegacion por teclado.
- [x] Enlace global para saltar al contenido principal.
- [x] Soporte basico para usuarios con movimiento reducido.
- [x] Checklist de accesibilidad por archivo.
- [x] Campos de accesibilidad en metadatos.
- [x] Reporte de calidad por OA.

Documentacion:

- `docs/checklist-calidad-accesibilidad-oa.md`
- `docs/guia-admin-versionado-preservacion-calidad.md`

Campos iniciales:

- Texto seleccionable.
- Encabezados estructurados.
- Texto alternativo.
- Orden de lectura.
- Contraste suficiente.
- Subtitulos o transcripcion.
- Observaciones de accesibilidad.

Reporte de calidad:

- Endpoint admin `GET /learning-objects/{id}/quality-report`.
- Score calculado por metadatos, archivo, preservacion y accesibilidad.
- Bloqueos y advertencias visibles en el panel admin.
- Los bloqueos impiden publicar.
- Las advertencias solicitan confirmacion editorial antes de publicar.

### Fase 7: LTI avanzado y analitica

- [x] Definir analitica minima: vistas, descargas y lanzamientos LTI.
- [x] Crear modelo de eventos de uso por OA.
- [x] Registrar descargas desde endpoint backend trazable.
- [x] Registrar vistas desde la ficha publica del OA.
- [x] Registrar lanzamientos LTI.
- [x] Mostrar resumen inicial de analitica en admin.
- [x] Mejorar configuracion LTI por plataforma LMS.
- [x] Validar launches LTI con `id_token` firmado contra JWKS registrado.
- [x] Extraer curso/contexto, usuario y roles del launch LTI.
- [x] Agregar Deep Linking.
- [x] Registrar uso por curso/plataforma.
- [x] Crear dashboard avanzado de analitica.

Implementacion inicial:

- Entidad `UsageEvent` sobre la tabla `learning_object_usage_events`.
- Endpoint publico `POST /analytics/events`.
- Endpoint admin `GET /analytics/summary`.
- Endpoint publico `GET /learning-objects/{id}/download?source={origen}`.
- Script disponible: `scripts/usage_analytics_migration.sql`.
- Entidad `LtiPlatform` sobre la tabla `lti_platforms`.
- Endpoint admin `GET/POST/PATCH/DELETE /lti/platforms`.
- Login OIDC con `clientId` y endpoint de autenticacion por plataforma registrada.
- Script disponible: `scripts/lti_platforms_migration.sql`.
- Validacion de `id_token` LTI con issuer, audience, expiracion/firma y deployment ID.
- Eventos `lti_launch` enriquecidos con plataforma, curso/contexto, usuario y roles.
- Endpoint `POST /lti/deep-linking-launch` para iniciar seleccion desde LMS.
- Endpoint `POST /lti/deep-linking-response` para firmar el recurso seleccionado.
- Vista `/lti/deep-link` para seleccionar OA publicados y devolver el content item al LMS.
- Dashboard admin con filtros de periodo/origen, tendencia diaria y desgloses por OA, fuente, plataforma y curso.
- Campos `canonicalUrl`, `persistentIdentifier` y `citationText` para citacion e interoperabilidad.
- Endpoint publico `GET /health` para verificacion operativa de backend, base de datos y carpeta de archivos.

### Fase 8: Operacion, documentacion e identificadores persistentes

- [x] Documentar configuracion operativa LTI para Moodle/Canvas.
- [x] Crear checklist de pruebas para launch, Deep Linking y analitica.
- [x] Definir estrategia institucional inicial de identificadores persistentes.
- [ ] Evaluar DOI, Handle o ARK.
- [x] Definir politica de citacion de OA y versiones.
- [x] Preparar guia de despliegue/operacion para entorno institucional.
- [x] Preparar plan de copias de seguridad y auditoria de integridad.

Resultado esperado:

- El repositorio queda listo para una prueba institucional con LMS real.
- Los administradores tienen instrucciones de configuracion y validacion.
- La institucion puede decidir el modelo de identificacion persistente antes de produccion.

## Prioridad inmediata

La siguiente tarea recomendada es ejecutar una prueba guiada con Moodle/Canvas real o avanzar hacia identificadores persistentes.

Orden sugerido:

1. Preparar datos de ejemplo para validar plataforma/curso.
2. Ejecutar checklist de `docs/guia-operativa-lti.md` contra un LMS real.
3. Registrar hallazgos de configuracion Moodle/Canvas.
4. Definir estrategia institucional de identificadores persistentes.

Documentacion disponible:

- `docs/guia-operativa-lti.md`
- `docs/politica-identificadores-citacion.md`
- `docs/guia-despliegue-operacion.md`
- `docs/plan-backups-restauracion.md`

## Referencias

- IEEE Learning Object Metadata / IEEE 1484.12.1.
- Dublin Core Metadata Initiative: DCMI Metadata Terms.
- LRMI: Learning Resource Metadata Initiative.
- OAI-PMH: Open Archives Initiative Protocol for Metadata Harvesting.
- 1EdTech LTI 1.3.
- W3C WCAG 2.2.
- Creative Commons / Open Educational Resources.
- PREMIS Preservation Metadata.
