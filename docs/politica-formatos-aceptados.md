# Politica de formatos aceptados

Esta politica define los formatos iniciales admitidos por el Repositorio de Objetos de Aprendizaje para carga, preservacion y procesamiento automatico.

## Formatos admitidos

| Formato | Extension | MIME esperado | Validacion de contenido |
| --- | --- | --- | --- |
| PDF | `.pdf` | `application/pdf` | Firma inicial `%PDF-` |
| DOCX | `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | Archivo ZIP con `[Content_Types].xml` y `word/document.xml` |

## Reglas de aceptacion

- El navegador debe declarar un MIME permitido.
- La extension del archivo debe coincidir con el MIME permitido.
- El contenido real debe superar la validacion de firma o estructura.
- Si la validacion falla, el archivo se elimina y el OA no actualiza su referencia de archivo.
- El checksum SHA-256 solo se calcula despues de validar el contenido.

## Criterios de preservacion

- Cada archivo aceptado conserva nombre original, tamano, MIME declarado y checksum SHA-256.
- Los cambios sobre archivos de OA publicados generan nueva version menor.
- Los eventos de preservacion registran checksum calculado, snapshot versionado y reemplazo de archivo cuando corresponde.

## Pendientes

- Validar PDF con analisis estructural mas profundo.
- Validar DOCX leyendo el ZIP de forma estructurada, no solo por presencia de entradas internas.
- Evaluar soporte futuro para HTML empaquetado, video, audio e imagenes educativas.
- Definir formatos preferidos de preservacion por tipo de recurso.
