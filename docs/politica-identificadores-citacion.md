# Politica inicial de identificadores y citacion

Esta politica define el criterio inicial para identificar y citar Objetos de Aprendizaje en el repositorio.

## Identificadores actuales

Cada OA tiene:

- `id`: UUID interno del sistema.
- `canonicalUrl`: URL publica estable de la ficha del OA.
- `persistentIdentifier`: identificador recomendado para citacion e interoperabilidad.
- `currentVersion`: version visible del OA.
- `citationText`: cita recomendada generada por el repositorio.

## Politica inicial

Mientras no exista un proveedor institucional de DOI, Handle o ARK, el identificador persistente operativo sera la URL canonica publica:

```text
https://roa.ejemplo.edu/objects/{id}
```

En desarrollo local:

```text
http://localhost:3000/objects/{id}
```

Cuando la institucion adopte DOI, Handle o ARK, `persistentIdentifier` debe guardar ese identificador externo y `canonicalUrl` seguira apuntando a la ficha publica.

## Cita recomendada

Formato inicial:

```text
Autor. (Año). Titulo (Version X.Y) [Objeto de aprendizaje]. Repositorio OA. URL canonica
```

Ejemplo:

```text
Denys Buedo Hidalgo. (2026). Presentacion sobre Base de Datos (Version 1.0) [Objeto de aprendizaje]. Repositorio OA. https://roa.ejemplo.edu/objects/{id}
```

## Versiones

La version visible forma parte de la cita.

- Primera publicacion: `1.0`.
- Cambios posteriores en archivo o metadatos de un OA publicado: `1.1`, `1.2`, etc.
- La cita debe indicar la version consultada.

## Metadatos expuestos

El endpoint:

```text
GET /learning-objects/{id}/metadata
```

expone:

- `canonicalUrl`
- `persistentIdentifier`
- `citationText`
- `dublinCore.identifier`
- `dublinCore.bibliographicCitation`
- `lrmi.identifier`
- `lrmi.citation`

## Reglas operativas

- No cambiar el UUID interno de un OA.
- No reutilizar una URL canonica para otro OA.
- No eliminar fichas publicas citadas; archivar en lugar de borrar cuando sea necesario preservar referencia.
- Si se adopta DOI/Handle/ARK, mantener redireccion o enlace desde la ficha publica.
- Si se corrige un OA publicado, generar nueva version menor.

## Pendientes

- Decidir si la institucion usara DOI, Handle o ARK.
- Definir responsable institucional de asignacion de identificadores.
- Definir formato de cita oficial si debe ajustarse a APA, IEEE u otra norma.
- Preparar endpoint o campo para citar una version especifica si se requiere granularidad mayor.
