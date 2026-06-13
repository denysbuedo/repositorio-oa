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

- Definir perfil institucional ROA.
- Agregar campos faltantes al modelo.
- Actualizar formulario admin.
- Crear validacion antes de publicar.
- Mostrar completitud de metadatos.

### Fase 2: Licencias, derechos e identificadores

- Agregar licencias y derechos.
- Mostrar licencia en catalogo.
- Crear URL canonica por OA.
- Preparar identificador persistente interno.

### Fase 3: Exportacion e interoperabilidad

- Implementar mapeo LOM -> Dublin Core.
- Implementar JSON-LD LRMI/schema.org.
- Agregar endpoint publico de metadatos por OA.
- Preparar OAI-PMH.

### Fase 4: OAI-PMH

- Implementar verbos basicos OAI-PMH.
- Exponer `oai_dc`.
- Exponer sets por coleccion.
- Validar XML.
- Documentar endpoint de cosecha.

### Fase 5: Versionado y preservacion

- Crear entidad de versiones.
- Registrar cambios de archivo y metadatos.
- Calcular checksum.
- Guardar eventos de preservacion.

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

La siguiente tarea recomendada es la Fase 1:

1. Definir los campos obligatorios del perfil ROA.
2. Agregarlos al backend.
3. Actualizar el admin.
4. Bloquear publicacion si faltan campos criticos.
5. Mostrar un indicador de completitud.

## Referencias

- IEEE Learning Object Metadata / IEEE 1484.12.1.
- Dublin Core Metadata Initiative: DCMI Metadata Terms.
- LRMI: Learning Resource Metadata Initiative.
- OAI-PMH: Open Archives Initiative Protocol for Metadata Harvesting.
- 1EdTech LTI 1.3.
- W3C WCAG 2.2.
- Creative Commons / Open Educational Resources.
- PREMIS Preservation Metadata.
