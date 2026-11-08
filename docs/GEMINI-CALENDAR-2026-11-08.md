# Actualización de Gemini y estado de Calendar

El usuario proporcionó una nueva clave de Gemini y comunicó que Calendar estaba habilitado. Se verificó el estado real de n8n sin crear reuniones ni activar automatizaciones.

## Gemini: clave actualizada y verificada

Se comprobó la clave contra la API de Google antes de sustituir las credenciales. No se rechazó por su formato ni se presupuso que debía empezar por un prefijo determinado. Google respondió HTTP 200 al listado de modelos.

Se actualizaron las credenciales existentes `Ceroa Gemini` (`googlePalmApi`) y `Ceroa RAG Gemini Embeddings` (`httpHeaderAuth`), conservando sus identificadores y asociaciones. No se cambió el proveedor ni el modelo publicado `models/gemini-3.5-flash-lite`. El transporte de embeddings utiliza `x-goog-api-key`.

| Comprobación real | Resultado |
|---|---|
| Listado de modelos | HTTP 200, 61 modelos |
| Generación de texto con contenido sintético | HTTP 200, respuesta no vacía, finalización `STOP` |
| Embedding de texto sintético | HTTP 200, 768 dimensiones, valores finitos |
| Nodo Gemini nativo de n8n 2.40.7 | Ejecución terminada correctamente con la credencial existente actualizada |

La prueba nativa usa una cadena de verificación manual y el modelo clonado de la definición publicada; no añade un especialista a la arquitectura ni modifica los agentes existentes. El borrador `ceroaGeminiVerification42` permanece inactivo. Las consultas fueron sintéticas, sin datos financieros. Estas comprobaciones acreditan acceso al modelo y embeddings; no son una validación completa de todas las delegaciones reales, calidad de respuestas o ingesta documental de producción.

La clave se recibió por stdin en el proceso de actualización, se mantuvo en memoria y se importó cifrada mediante los mecanismos de n8n. No se escribió en texto claro en archivos del proyecto ni en Git. Existen respaldos cifrados antes y después de la actualización: `backups/n8n/gemini-{before,after}-key-update-2026-11-08.ceroa` y `embedding-{before,after}-key-update-2026-11-08.ceroa`, con la clave de respaldo local ignorada del Bloque 4. Los respaldos anteriores contienen las credenciales que habían fallado; no restaurarlos como si estuvieran vigentes.

Se reinició únicamente n8n para recargar las credenciales. No se publicaron nuevas definiciones ni se cambiaron los flags de Gmail, Sheets o Calendar. Ahora hay 27 borradores, incluidos los dos de verificación manual de Google/Gemini; las 15 definiciones publicadas se mantienen.

## Calendar: falta completar OAuth en n8n

La revisión de la credencial `Ceroa Calendar - pendiente de autorizacion` continúa devolviendo **`CONSENT_REQUIRED`**: contiene la configuración del cliente OAuth, pero todavía no contiene un token autorizado. La activación de la API comunicada por el usuario no se presenta como prueba de acceso a sus calendarios.

Paso pendiente: abrir esa credencial en n8n, pulsar **Conectar con Google**, seleccionar la cuenta y completar la autorización. Después se podrá leer la lista de calendarios y comprobar disponibilidad. Antes de crear eventos o Meet sigue siendo necesario elegir y autorizar un calendario de prueba concreto; no se ha realizado ninguna reserva.

Gmail, Drive y Sheets mantienen sus comprobaciones reales anteriores. La ingesta automática de Drive todavía requiere asociar la fuente aprobada a un propietario de Ceroa y configurar su `sourceId`; la prueba real de embeddings elimina el bloqueo de autenticación del modelo, pero no sustituye esa configuración ni acredita una indexación completa.

Los secretos compartidos en el chat deben rotarse en Google y actualizarse directamente en n8n, sin volver a publicarlos en la conversación.
