# Guia operativa LTI 1.3

Esta guia documenta como configurar y probar la integracion LTI 1.3 del Repositorio de Objetos de Aprendizaje con un LMS como Moodle o Canvas.

## Alcance

La integracion actual soporta:

- Registro administrativo de plataformas LMS.
- OIDC Login Initiation.
- Launch LTI 1.3 con `id_token` firmado.
- Validacion de `issuer`, `audience`, firma, expiracion y `deployment_id`.
- Entrega segura de OA publicados por LTI.
- Deep Linking para seleccionar OA desde el LMS.
- Analitica de lanzamientos LTI por plataforma, curso/contexto, usuario y roles.

## URLs del repositorio

En desarrollo local:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:3001
```

En produccion se deben configurar URLs publicas:

```text
FRONTEND_URL=https://roa.ejemplo.edu
FRONTEND_PUBLIC_URL=https://roa.ejemplo.edu
API_PUBLIC_URL=https://api-roa.ejemplo.edu
```

El valor de `API_PUBLIC_URL` se usa como issuer de la herramienta al firmar respuestas Deep Linking.

## Endpoints LTI

### JWKS de la herramienta

```text
GET /lti/jwks
```

URL local:

```text
http://localhost:3001/lti/jwks
```

El LMS usa este endpoint para obtener la llave publica de la herramienta.

### OIDC login initiation

```text
GET /lti/login
```

URL local:

```text
http://localhost:3001/lti/login
```

El LMS llama este endpoint con parametros OIDC/LTI como:

- `iss`
- `login_hint`
- `target_link_uri`
- `lti_message_hint`

### Launch del recurso

```text
POST /lti/launch
```

URL local:

```text
http://localhost:3001/lti/launch
```

El LMS envia un `id_token` firmado. El repositorio valida el token, extrae el OA desde el claim custom y redirige al visor:

```text
/lti/view?objectId={objectId}
```

### Deep Linking launch

```text
POST /lti/deep-linking-launch
```

URL local:

```text
http://localhost:3001/lti/deep-linking-launch
```

El LMS envia un `id_token` de tipo `LtiDeepLinkingRequest`. El repositorio valida el token y redirige al selector:

```text
/lti/deep-link?session={sessionToken}
```

### Deep Linking response

```text
POST /lti/deep-linking-response
```

Este endpoint lo usa el frontend del repositorio despues de seleccionar un OA. Devuelve:

- `jwt`: respuesta firmada `LtiDeepLinkingResponse`.
- `returnUrl`: URL del LMS a donde se debe enviar el formulario.

## Registrar una plataforma LMS

En el panel admin, usar la seccion:

```text
Administracion -> Plataformas LMS
```

Campos:

- `Nombre`: nombre visible de la plataforma. Ejemplo: `Moodle institucional`.
- `Issuer`: issuer que declara el LMS en el `id_token`.
- `Client ID`: client ID asignado por el LMS a la herramienta.
- `Deployment ID`: deployment ID del registro LTI. Opcional pero recomendado.
- `Login URL`: endpoint OIDC del LMS. Si se deja vacio, se usa el `iss`.
- `JWKS URL`: endpoint de llaves publicas del LMS.

El backend expone estos endpoints admin:

```text
GET    /lti/platforms
POST   /lti/platforms
PATCH  /lti/platforms/{id}
DELETE /lti/platforms/{id}
```

Todos requieren token admin.

## Configuracion en el LMS

Los nombres exactos varian entre Moodle, Canvas u otro LMS, pero los valores equivalentes son:

```text
Tool URL / Target Link URI:  https://api-roa.ejemplo.edu/lti/launch
Login Initiation URL:        https://api-roa.ejemplo.edu/lti/login
JWKS URL:                    https://api-roa.ejemplo.edu/lti/jwks
Deep Linking URL:            https://api-roa.ejemplo.edu/lti/deep-linking-launch
Public key type:             JWKS URL
Signature algorithm:         RS256
```

En local:

```text
Tool URL / Target Link URI:  http://localhost:3001/lti/launch
Login Initiation URL:        http://localhost:3001/lti/login
JWKS URL:                    http://localhost:3001/lti/jwks
Deep Linking URL:            http://localhost:3001/lti/deep-linking-launch
```

Para pruebas reales, el LMS debe poder alcanzar el backend por URL publica HTTPS. `localhost` solo sirve si el LMS corre en la misma maquina.

## Claims esperados en Launch

Para abrir un OA, el `id_token` debe incluir un claim custom con alguno de estos campos:

```json
{
  "https://purl.imsglobal.org/spec/lti/claim/custom": {
    "custom_object_id": "{learningObjectId}"
  }
}
```

Tambien se aceptan:

- `object_id`
- `learning_object_id`

Claims validados:

- `iss`
- `aud`
- expiracion y firma del JWT
- `https://purl.imsglobal.org/spec/lti/claim/deployment_id`, si la plataforma lo tiene configurado

Claims usados para analitica:

- `sub`
- `name`
- `email`
- `https://purl.imsglobal.org/spec/lti/claim/context`
- `https://purl.imsglobal.org/spec/lti/claim/roles`

## Claims esperados en Deep Linking

El `id_token` debe declarar:

```json
{
  "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiDeepLinkingRequest",
  "https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings": {
    "deep_link_return_url": "https://lms.ejemplo.edu/deep-link-return",
    "data": "valor-opcional"
  }
}
```

Despues de seleccionar un OA publicado, el repositorio devuelve al LMS una respuesta `LtiDeepLinkingResponse` con un `content_items` de tipo:

```text
ltiResourceLink
```

El item incluye:

- `title`
- `text`
- `url`
- `custom.custom_object_id`

## Checklist de prueba

### 1. Preparacion

- [ ] Backend accesible por URL publica o local segun el entorno de prueba.
- [ ] Frontend accesible por URL publica o local segun el entorno de prueba.
- [ ] Variables `FRONTEND_URL`, `FRONTEND_PUBLIC_URL` y `API_PUBLIC_URL` revisadas.
- [ ] Existe al menos un OA publicado.
- [ ] El OA publicado tiene archivo y metadatos minimos.

### 2. Registro de plataforma

- [ ] Registrar plataforma LMS en admin.
- [ ] Verificar `issuer`.
- [ ] Verificar `clientId`.
- [ ] Verificar `deploymentId` si aplica.
- [ ] Verificar `jwksUrl`.
- [ ] Verificar que la plataforma quede activa.

### 3. Launch LTI

- [ ] Crear enlace/recurso LTI en el LMS.
- [ ] Configurar `custom_object_id` con el UUID de un OA publicado.
- [ ] Abrir el recurso desde el curso.
- [ ] Confirmar redireccion al visor `/lti/view`.
- [ ] Confirmar que el recurso carga.
- [ ] Confirmar que la descarga funciona.

### 4. Deep Linking

- [ ] Abrir flujo de seleccion de contenido desde el LMS.
- [ ] Confirmar que carga `/lti/deep-link`.
- [ ] Seleccionar un OA publicado.
- [ ] Confirmar retorno al LMS.
- [ ] Confirmar que el recurso seleccionado queda insertado en el curso.
- [ ] Abrir el recurso insertado y verificar launch normal.

### 5. Analitica

- [ ] Entrar al panel admin.
- [ ] Revisar metricas de vistas, descargas y LTI.
- [ ] Filtrar por periodo.
- [ ] Filtrar por origen `LTI`.
- [ ] Confirmar desglose por plataforma.
- [ ] Confirmar desglose por curso/contexto si el LMS envia el claim de contexto.

## Errores comunes

### `Plataforma LTI no registrada o inactiva`

El `iss` del token no coincide con ninguna plataforma activa.

Revisar:

- Campo `Issuer` en admin.
- Issuer real enviado por el LMS.

### `La plataforma LTI no tiene JWKS URL configurada`

La plataforma existe, pero no tiene URL de llaves publicas.

Revisar:

- Campo `JWKS URL`.
- Que la URL sea accesible desde el backend.

### `El deployment ID del launch LTI no coincide`

La plataforma tiene `deploymentId` configurado y el token envia otro valor.

Revisar:

- Deployment ID en el LMS.
- Deployment ID en admin.

### `El launch LTI no incluye custom_object_id`

El LMS abrio la herramienta sin indicar que OA debe entregarse.

Revisar:

- Parametro custom `custom_object_id`.
- Si se uso Deep Linking, revisar que el content item insertado conserva `custom.custom_object_id`.

### `El launch no es Deep Linking`

El endpoint `/lti/deep-linking-launch` recibio un token que no declara:

```text
https://purl.imsglobal.org/spec/lti/claim/message_type = LtiDeepLinkingRequest
```

Revisar configuracion del LMS para seleccion de contenido.

## Notas de seguridad

- Usar HTTPS en produccion.
- Registrar solo plataformas LMS confiables.
- Mantener `deploymentId` configurado cuando el LMS lo provea.
- No exponer tokens LTI en logs.
- Rotar llaves de herramienta en una fase posterior.
- Persistir/verificar `state` y `nonce` si se endurece el flujo OIDC para produccion.

## Pendientes

- Validacion persistente de `state` y `nonce`.
- Rotacion de llaves JWKS de la herramienta.
- Guia especifica con capturas para Moodle.
- Guia especifica con capturas para Canvas.
- Prueba contra LMS real institucional.
