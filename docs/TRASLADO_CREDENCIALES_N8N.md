# Traslado de credenciales y workflows al portátil

Se preparó un respaldo local cifrado el 25 de octubre de 2026 en `tmp/traslado-portatil-20261025`. Contiene las **17 credenciales de nodos n8n**, los archivos `.env` locales y los **12 workflows conservados**. También incluye una copia de los 17 workflows anteriores a la limpieza para recuperación.

## Archivos que debes trasladar

- `Ceroa-credenciales-workflows.ceroa`: respaldo con cifrado autenticado AES-256-GCM.
- `CLAVE-RESPALDO.txt`: contraseña aleatoria para abrir el respaldo. Guárdala separada del archivo cifrado cuando lo transportes.
- `ABRIR-RESPALDO.mjs`: herramienta independiente para abrirlo con Node.js; no necesita instalar paquetes.
- `LEEME-TRASLADO.md`: estas instrucciones.

No se publicaron los valores de las credenciales en el chat. El respaldo contiene secretos reales y los archivos obtenidos al abrirlo también los contendrán. La carpeta local está restringida al usuario de Windows y SYSTEM; no debe subirse al repositorio.

## Abrir en el portátil

Con Node.js instalado, abre PowerShell en la carpeta donde copiaste los archivos:

```powershell
node .\ABRIR-RESPALDO.mjs decrypt .\Ceroa-credenciales-workflows.ceroa .\Ceroa-restauracion.zip .\CLAVE-RESPALDO.txt
Expand-Archive -LiteralPath .\Ceroa-restauracion.zip -DestinationPath .\Ceroa-restauracion
```

La herramienta verifica la autenticidad antes de escribir el ZIP. Si la clave es incorrecta o el archivo está alterado, falla sin crear el archivo de salida. No sobrescribe archivos existentes.

## Contenido del respaldo

| Archivo | Uso |
|---|---|
| `credenciales-legibles.json` | Las 17 credenciales descifradas, importables en otra instancia n8n aunque tenga una clave de cifrado distinta |
| `credenciales-n8n-cifradas.json` | Exportación original cifrada por n8n, como alternativa de recuperación |
| `n8n-encryption-config.json` | Configuración y clave de cifrado de la instancia original; necesaria para la alternativa cifrada, no para importar el archivo legible |
| `inventario-credenciales.json` | Nombres, tipos y nombres de campos; sin valores secretos |
| `workflows-para-importar.json` | Los 12 workflows actuales, preparados inactivos para configurar el portátil antes de publicarlos |
| `workflows-estado-original.json` | Los mismos 12 con el estado activo/manual que tenían en esta computadora |
| `workflows-antes-limpieza.json` | Recuperación de los 17 anteriores; no importar como configuración habitual |
| `limpieza-workflows.json` | Detalle de los cinco retirados y los doce conservados |
| `.env`, `.env.telegram-local`, `.env.n8n-sandbox`, `.env.rag-admin` | Configuración privada local existente |

Las credenciales exportadas corresponden a los nodos de n8n y los archivos de entorno. La contraseña de acceso al editor n8n no es una credencial de nodo y no se exporta en texto: crea tu cuenta del editor en la instalación nueva. Este paquete tampoco es una copia completa de las bases de datos ni de los archivos de usuarios; Supabase continúa siendo el servicio remoto configurado.

## Restaurar en n8n

1. Usa la misma versión actual del proyecto Ceroa, incluidos los cambios locales, y la imagen n8n fijada en el compose. Copia los `.env` restaurados a la raíz del proyecto. Los requisitos para levantar n8n y sus servicios auxiliares están en `docs/N8N.md` y los archivos compose del proyecto.
2. Inicia n8n en el portátil y crea la cuenta del editor en `http://localhost:5678`.
3. Desde la carpeta restaurada, importa primero las credenciales y después los workflows:

```powershell
docker cp .\credenciales-legibles.json ceroa-n8n:/tmp/ceroa-credenciales-restaurar.json
docker exec ceroa-n8n n8n import:credentials --input=/tmp/ceroa-credenciales-restaurar.json
docker cp .\workflows-para-importar.json ceroa-n8n:/tmp/ceroa-workflows-restaurar.json
docker exec ceroa-n8n n8n import:workflow --input=/tmp/ceroa-workflows-restaurar.json
```

4. Comprueba la configuración del backend y las conexiones a Supabase. Se conservaron los IDs de credenciales para que los nodos mantengan sus asociaciones.
5. Publica los workflows que estaban activos, dejando Telegram para el siguiente paso y la indexación administrativa como manual:

```powershell
$workflows = Get-Content .\workflows-estado-original.json -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($workflow in $workflows | Where-Object { $_.active -and $_.id -ne 'ceroaTelegram01' }) {
    docker exec ceroa-n8n n8n publish:workflow --id=$($workflow.id)
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo publicar un workflow' }
}
docker restart ceroa-n8n
```

6. Para Telegram, configura el túnel HTTPS del portátil y ejecuta desde la raíz del proyecto `integrations/n8n/install-telegram-local.ps1`. La URL temporal de esta computadora no sirve como URL del portátil. Antes de activar el bot allí, detén n8n en esta computadora: el mismo bot utiliza un único webhook y ambas instancias competirían por él.
7. Verifica el asistente y `/ayuda` en Telegram. Cuando termines, elimina del contenedor el archivo temporal de credenciales con `docker exec ceroa-n8n rm /tmp/ceroa-credenciales-restaurar.json`. Conserva el respaldo cifrado y protege o retira las copias descifradas.

No importes simultáneamente las dos exportaciones de credenciales: el método recomendado es `credenciales-legibles.json`, que n8n vuelve a cifrar con la clave de la nueva instancia. La exportación cifrada y la configuración original quedan como recuperación alternativa.

## Limpieza realizada

Se exportaron antes de retirarlos mediante la API nativa de n8n:

- `ceroaAssistant01`: analista inicial, sustituido por el híbrido.
- `ceroaAssistantRag03`: analista RAG anterior, sustituido por el híbrido.
- `ceroaReadDebts001`: ejemplo manual de consulta.
- `ceroaPayment00001`: ejemplo manual de registro de pago.
- `ceroaReminderMock04`: prueba sintética de recordatorios.

Quedan **11 activos y 1 manual**. Se preservaron el asistente híbrido, Telegram, extracción de borradores, embeddings, los cuatro componentes del RAG documental, recordatorios, Centinela y sus dos manejadores de errores. La indexación administrativa aprobada permanece manual.

Los instaladores ahora reutilizan preferentemente el asistente híbrido vigente para asociar credenciales, de modo que ya no necesitan las dos versiones retiradas. Los ejemplos y sus generadores se conservan en el repositorio como código de referencia; lo retirado es su instalación obsoleta en n8n. No se borraron credenciales ni documentos de usuarios.

## Copias temporales pendientes de retirar

La revisión automática rechazó borrar las copias temporales con `blocked by policy`, sin indicar otra razón. La limpieza de los cinco workflows en n8n sí terminó correctamente; esta limitación afecta únicamente a los archivos de preparación del respaldo.

Para el traslado copia únicamente los cuatro archivos indicados al principio y, opcionalmente, `SHA256.txt`. No copies los ZIP temporales ni `privado-temporal`.

Después de conservar y verificar el respaldo cifrado y su clave, puedes retirar manualmente desde el Explorador, dentro de `tmp/traslado-portatil-20261025`:

- `privado-temporal`: incluye credenciales legibles y archivos `.env`.
- `antes-limpieza.zip`.
- `respaldo-final-temporal.zip`.
- `verificacion-temporal.zip`.
- `antes-limpieza.ceroa`: respaldo cifrado intermedio, ya incluido en el respaldo final.

En el contenedor n8n permanece también `/tmp/ceroa-portable-readable.json`; tiene permisos `600` y contiene la exportación legible de preparación. Puedes eliminarlo manualmente tras verificar el respaldo final. Las copias locales están restringidas al usuario de Windows y SYSTEM. Conserva `Ceroa-credenciales-workflows.ceroa`, `CLAVE-RESPALDO.txt`, `ABRIR-RESPALDO.mjs` y la guía.
