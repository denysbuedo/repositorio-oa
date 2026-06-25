# Guia de cosecha OAI-PMH

Esta guia documenta el endpoint publico de cosecha del Repositorio de Objetos de Aprendizaje para integraciones externas, recolectores academicos y sistemas institucionales.

## Endpoint base

```text
GET /oai
```

En desarrollo local:

```text
http://localhost:3001/oai
```

En produccion debe publicarse usando la URL publica del backend configurada para la institucion.

## Formato disponible

Actualmente se expone:

- `oai_dc`: Dublin Core basico compatible con OAI-PMH.

## Sets

Las colecciones del repositorio se exponen como sets OAI-PMH.

- `setSpec`: identificador interno de la coleccion.
- `setName`: nombre visible de la coleccion.

## Verbos soportados

### Identify

```text
/oai?verb=Identify
```

Devuelve informacion general del repositorio, base URL, protocolo y granularidad.

### ListMetadataFormats

```text
/oai?verb=ListMetadataFormats
```

Lista los formatos de metadatos disponibles.

### ListSets

```text
/oai?verb=ListSets
```

Lista las colecciones publicadas como sets.

### ListIdentifiers

```text
/oai?verb=ListIdentifiers&metadataPrefix=oai_dc
```

Lista identificadores de OA publicados.

Con filtro por coleccion:

```text
/oai?verb=ListIdentifiers&metadataPrefix=oai_dc&set={collectionId}
```

### ListRecords

```text
/oai?verb=ListRecords&metadataPrefix=oai_dc
```

Lista registros completos de OA publicados con metadatos `oai_dc`.

Con filtro por coleccion:

```text
/oai?verb=ListRecords&metadataPrefix=oai_dc&set={collectionId}
```

### GetRecord

```text
/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:repositorio-oa:{objectId}
```

Tambien acepta el UUID interno como identificador, aunque para integraciones externas se recomienda usar el identificador OAI completo.

## Identificadores

El formato actual de identificador OAI es:

```text
oai:repositorio-oa:{objectId}
```

El prefijo puede configurarse con la variable:

```text
OAI_REPOSITORY_IDENTIFIER
```

## Reglas de exposicion

- Solo se cosechan OA con estado `published`.
- Los OA archivados o en borrador no se exponen.
- Las colecciones se usan como sets.
- La URL canonica del OA se expone como `dc:identifier`.
- La URL del archivo, cuando existe, se expone como `dc:source`.

## Variables recomendadas

```text
API_PUBLIC_URL=https://api.ejemplo.edu
FRONTEND_PUBLIC_URL=https://roa.ejemplo.edu
OAI_REPOSITORY_IDENTIFIER=roa.ejemplo.edu
```

## Pendientes

- Exponer formato LOM XML.
- Evaluar extension LRMI/schema.org para cosecha especializada.
- Agregar paginacion con `resumptionToken` si el volumen de registros crece.
- Documentar endpoint publico definitivo cuando exista dominio institucional.
