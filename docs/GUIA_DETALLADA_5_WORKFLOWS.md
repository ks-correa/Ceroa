# Los cinco workflows principales de Ceroa

Material de referencia para elaborar un documento explicativo en ChatGPT.

Fecha de revisión: 27 de octubre de 2026. Base: documentación, plantillas n8n y código del proyecto raíz `Ceroa`.

## Cómo interpretar esta guía

Se seleccionan los cinco requerimientos principales que el proyecto identifica como **RA-N8N-001 a RA-N8N-005**. No equivalen a cinco archivos de n8n: un requerimiento puede necesitar varios workflows técnicos. Por ejemplo, el RAG actual utiliza consultas, ingestión, sincronización y OCR; Telegram funciona como canal compartido.

La explicación incorpora las actualizaciones de la biblioteca documental V21/V22 y del asistente encontradas en el repositorio. Las plantillas antiguas `assistant-web.json` y `assistant-rag.json` siguen disponibles como antecedentes; la evolución actual integra sus capacidades en `hybrid-rag-query.json`. No se deben presentar como tres asistentes independientes que el usuario tenga que elegir.

Esta revisión no ejecutó consultas contra cuentas reales, no envió mensajes ni comprobó el estado en vivo de n8n. Cuando se habla de una función implementada se describe el código y la evidencia documentada del proyecto; no se certifica que todos los servicios estén encendidos en este instante.

**“Todas las posibles respuestas” significa aquí todas las categorías funcionales, decisiones y estados explícitos reconstruidos de las fuentes revisadas.** El texto generado por un modelo puede tener infinitas variantes y también existen fallos de infraestructura. Las tablas describen qué debe ocurrir en cada caso; los ejemplos didácticos no son mensajes literales ni una promesa de respuesta exacta. Los mensajes entre comillas identificados como literales sí proceden del código.

## Mapa de los cinco workflows

| Workflow funcional | Para qué sirve | Inicio | Resultado principal |
|---|---|---|---|
| 1. RA-N8N-001: asistente financiero | Explicar la situación financiera del usuario mediante texto o voz | Pregunta en web o Telegram | Respuesta sustentada en datos y cálculos autorizados |
| 2. RA-N8N-002: lectura para crear o editar una obligación | Proponer campos de una deuda a partir de un archivo | Botón Leer documento financiero | Borrador editable; el usuario decide qué guardar |
| 3. RA-N8N-003 y evolución RAG híbrida | Consultar guías aprobadas y documentos privados con fuentes | Pregunta, búsqueda o carga en biblioteca | Documentos recuperados, respuesta con referencias y cobertura explícita |
| 4. RA-N8N-004: recordatorios y briefing | Avisar sobre vencimientos y entregar un resumen financiero | Programación cada cinco minutos | Aviso o resumen por Telegram si está autorizado |
| 5. RA-N8N-005: Centinela | Detectar pagos exigibles superiores al presupuesto para deudas | Cambio financiero, evaluación manual o revisión programada | Alerta y opción de aprobar una simulación hipotética |

## Conceptos comunes

- **Frontend:** interfaz web donde el usuario pregunta, sube archivos, revisa propuestas y confirma acciones.
- **Backend Spring Boot:** identifica al usuario, autoriza, aplica reglas financieras, calcula y controla la persistencia.
- **n8n:** coordina llamadas, condiciones, modelos, colas y Telegram.
- **Supabase:** aloja PostgreSQL y el almacenamiento privado de originales documentales. La información financiera se gestiona a través del backend.
- **Gemini:** interviene en transcripción, interpretación de preguntas, extracción de propuestas, embeddings, OCR y redacción, según el flujo.
- **RAG:** recupera contenido relevante antes de generar una respuesta. Un embedding representa texto numéricamente para buscar contenido relacionado.
- **Evidencia:** referencia a un dato actual del backend o a un fragmento documental autorizado. Una respuesta anterior del chat no sustituye evidencia vigente.
- **CSRF:** protección adicional para solicitudes de cambio desde una sesión web.
- **Idempotencia:** repetir el mismo evento no debe repetir su efecto. Su implementación varía entre cargas, entregas y aprobaciones.

Hay consentimientos diferentes para vincular Telegram, cargar documentos, recibir recordatorios, recibir el briefing y recibir alertas del Centinela. Autorizar uno no habilita automáticamente los demás.

---

## 1. Asistente financiero por texto y voz — RA-N8N-001

### Objetivo y alcance

Responder preguntas sobre deudas, tasas, pagos, vencimientos, presupuesto, estrategia y progreso financiero. Puede comparar alternativas y explicar escenarios, dentro de las herramientas implementadas.

Ejemplos de entrada:

- «¿Qué deudas tengo?»
- «¿Cuál tiene la tasa más alta y por qué?»
- «¿Me alcanza para las cuotas y un abono adicional?»
- «Si recibo 500.000 adicionales, ¿cómo cambia mi capacidad disponible?»
- «¿Qué diferencia hay entre mi estrategia y Avalancha?»

El asistente consulta y explica. Una petición como «paga esta deuda» o un «sí» en el chat no ejecutan pagos ni cambios financieros.

### Recorrido paso a paso

**Paso 1. El usuario abre el asistente o escribe al bot.**

En web se utiliza la sesión de Ceroa. En Telegram debe existir una vinculación válida de un chat privado con una cuenta activa. Los mensajes de un grupo no se procesan como consultas financieras personales.

**Paso 2. Se valida la entrada.**

Se admite texto o audio, uno de los dos. Texto: hasta 2.000 caracteres. Audio web: hasta 4 MiB, en los formatos admitidos WebM, OGG, WAV, MP3 y MP4. Las notas de voz de Telegram se limitan a 60 segundos y 4 MiB.

En la interfaz, la grabación llega a 60 segundos y se conserva para escucharla y enviarla manualmente. Cerrar cancela una grabación o un permiso pendiente sin enviar la consulta.

Si se eligió un documento para conversar sobre él, el backend comprueba acceso y que esté `INDEXED` antes de continuar.

**Paso 3. Se resuelven algunas entradas directas.**

El código actual contiene una respuesta directa para ciertas formulaciones de «¿qué deudas tengo?», usando los servicios del backend. Esa ruta no necesita pasar por el agente.

Si el usuario escribe algo como «¿qué dice este documento?» sin haber seleccionado uno, se devuelve literalmente:

> ¿A cuál documento te refieres? Indica el nombre del archivo o selecciónalo en la biblioteca para poder describir su contenido.

**Paso 4. Se crea un contexto temporal de solicitud.**

El backend vincula la solicitud con el usuario autenticado. No toma la identidad de un `userId` que aparezca en el mensaje ni de una decisión del modelo. El contexto de herramientas dura 180 segundos.

Hay una consulta simultánea por usuario, cinco solicitudes por minuto y hasta 100 contextos activos. El contexto se elimina al terminar o fallar.

**Paso 5. Se envía la solicitud al webhook privado de n8n.**

Viajan pregunta o audio, identificador interno de solicitud y contexto permitido. Las credenciales del proveedor no se envían al navegador.

En la evolución actual, el workflow de consultas híbridas comienza comprobando la configuración del índice: contrato, modelo y dimensiones. La credencial del nodo Supabase está limitada al gateway de configuración; no abre acceso libre a tablas financieras.

**Paso 6. Si hay audio, se transcribe.**

El nodo `Es audio` decide entre la ruta de transcripción y la de texto. La transcripción dispone de hasta dos intentos. Si falla, no se inventa lo que dijo el usuario.

Texto y audio transcrito terminan en la misma preparación de pregunta. Así, una consulta sobre un período debe mantener el mismo significado con ambos medios.

**Paso 7. Se prepara el contexto en Spring Boot.**

La pregunta preparada se mantiene vinculada a la solicitud. Si el usuario menciona cifras, se registran como supuestos aportados por él, diferenciados de valores persistidos. Se usa notación colombiana: punto de miles y coma decimal. Si una cifra es ambigua, corresponde pedir aclaración.

**Paso 8. El agente decide qué herramientas necesita.**

Puede consultar los conjuntos `summary`, `profile`, `debts`, `payments`, `upcoming`, `strategy`, `comparison` y `progress`. Los listados financieros se paginan en grupos de 25.

Las herramientas de cálculo permiten suma, resta, multiplicación, división, mínimo y máximo sobre referencias válidas. La aritmética se ejecuta en backend con `BigDecimal`, no se deja al modelo producir una cifra sin respaldo.

La normalización permite comparar EA, MV y NAMV en tasa efectiva anual. Una tasa indexada sin índice disponible no se vuelve comparable inventando un valor. Las proyecciones proceden de los servicios financieros existentes; no existe un simulador universal de cualquier hipótesis formulada en lenguaje natural.

El agente dispone de ocho iteraciones. El backend limita las lecturas y cálculos de la solicitud; la ruta privada de biblioteca tiene además un máximo de seis consultas y la documentación aprobada un máximo de dos. No son búsquedas ilimitadas.

**Paso 9. Se redacta una respuesta estructurada.**

El modelo explica el análisis y emplea referencias a hechos para cifras y fechas. Distingue entre situación registrada, hipótesis del usuario y contenido documental. La selección de herramientas documentales se explica en el workflow 3.

**Paso 10. Se revisa el borrador.**

El flujo híbrido llama a `review`. Si detecta cifras sin evidencia o referencias inválidas, una cadena sin herramientas intenta corregir el borrador una sola vez con los hechos ya recuperados. Esa corrección no puede consultar nuevas finanzas ni realizar cambios.

**Paso 11. Se valida la respuesta final.**

El backend sustituye referencias por valores reales y rechaza referencias inexistentes o nulas y cifras literales sin evidencia válida. También verifica transcripción, fuentes y, cuando corresponda, permisos y versión documental vigente.

Esta barrera comprueba procedencia de datos; no demuestra que toda interpretación financiera del modelo sea correcta.

**Paso 12. Se devuelve la respuesta y se conserva contexto breve.**

La respuesta puede incluir texto, intención, documentos y un identificador de trazabilidad cuando corresponde. Los valores se presentan con formato colombiano, conservando fechas y años sin separadores de miles.

La memoria conserva tres intercambios durante cinco minutos, separada por usuario, canal y conversación. Los valores financieros anteriores no se reutilizan como evidencia actual. Reiniciar el backend limpia esa memoria. En web se puede iniciar una nueva conversación; en Telegram se usa `/nuevo`.

### Ramas y posibles resultados

| Situación | Qué hace el sistema | Respuesta o salida |
|---|---|---|
| Consulta clara con datos suficientes | Consulta herramientas y valida evidencia | Explicación concreta con datos y cálculos respaldados |
| Pregunta directa por la lista de deudas reconocida por el backend | Utiliza la ruta directa | Lista de deudas o indicación de que no hay registradas |
| Falta perfil, cuota u otra información necesaria | Evita una conclusión no sustentada | Explica qué dato falta o pide aclaración |
| Cifra o período ambiguo | Debe distinguir la ambigüedad | Pregunta aclaratoria; no trata un supuesto como hecho |
| Hipótesis calculable con herramientas actuales | Calcula y declara el supuesto | Comparación hipotética, sin modificar registros |
| Hipótesis que requiere un motor no disponible | Reconoce el límite | Explicación de alcance y datos necesarios |
| Petición de crear, borrar, editar o pagar | No dispone de herramientas financieras de escritura | Indicación de que no ejecutó la operación y orientación al flujo autorizado |
| Documento no especificado | No adivina a qué archivo se refiere | Solicitud de seleccionar o identificar el documento |
| Documento seleccionado sin índice | Rechaza la consulta de contenido | Debe esperar a la indexación o resolver la revisión |
| Evidencia inválida en el primer borrador | Intenta una corrección sin herramientas | Borrador corregido sujeto a validación final |
| Sigue siendo inválida | Rechaza el resultado | Error de análisis, sin presentar cifras inventadas |
| Transcripción, proveedor, webhook o configuración no disponibles | Termina sin resultado financiero | Mensaje temporal de indisponibilidad |
| Límite de frecuencia o concurrencia | Rechaza temporalmente | Esperar antes de consultar otra vez |
| Contexto caducado | No permite continuar con él | Nueva pregunta necesaria |
| Sesión o autorización no válidas | Interrumpe el acceso | Error de autenticación o autorización según la capa que rechace |

Mensajes literales del manejador HTTP del asistente:

| Caso | Código y mensaje |
|---|---|
| Entrada inválida, HTTP 400 | `ASSISTANT_INVALID_INPUT`: «Revisa el mensaje, formato de audio o período solicitado.» |
| HTTP 429 | `ASSISTANT_UNAVAILABLE`: «Espera un minuto antes de enviar otra consulta.» |
| HTTP 403 | `ASSISTANT_UNAVAILABLE`: «No tienes autorización para esta consulta.» |
| HTTP 410 | `ASSISTANT_UNAVAILABLE`: «La consulta expiró. Envía una nueva pregunta.» |
| Otros `ResponseStatusException` capturados por ese manejador | `ASSISTANT_UNAVAILABLE`: «No pude consultar tu información. Intenta nuevamente; no se realizó ningún cambio.» |

Estos mensajes pertenecen a ese manejador concreto. La capa de seguridad o la interfaz pueden producir otro mensaje para una solicitud rechazada antes de llegar a él.

### Recorrido específico de Telegram

1. En Perfil → Telegram, el usuario autoriza consultas y genera un enlace de un solo uso.
2. El enlace vence en cinco minutos; el backend conserva su hash.
3. Telegram envía `/start CODIGO` desde el chat privado.
4. Se verifica formato, vigencia, uso previo y ausencia de una vinculación incompatible.
5. Si es válido, se vinculan cuenta, remitente y chat. Una cuenta y un chat mantienen la relación uno a uno.
6. Antes de descargar voz o documentos, se comprueba vinculación; los documentos requieren además su consentimiento propio.
7. Se procesa una sola vez cada `update` de Telegram.
8. La consulta se resuelve con el mismo asistente del backend.
9. Antes de enviar la respuesta privada, se vuelve a comprobar que la cuenta y el vínculo sigan vigentes. Los tokens internos de entrega duran 60 segundos y son de un uso.
10. Si se desvinculó entretanto o caducó la entrega, no se entrega información privada.

| Rama Telegram | Resultado |
|---|---|
| Código válido | Confirma vinculación y permite texto o voz |
| Código con formato inválido | Pide generar otro enlace desde el perfil |
| Código vencido o usado | «El enlace venció o ya fue usado. Genera uno nuevo desde Ceroa.» |
| Vinculación incompatible | Pide desvincular antes de cambiar de cuenta |
| Demasiados intentos de vinculación | Pide esperar un minuto |
| Consulta sin vínculo | «Vincula tu cuenta desde Perfil → Telegram en Ceroa para consultar tus finanzas.» |
| Update duplicado o identidad no privada válida | Se ignora; no repite el procesamiento |
| `/nuevo` | «Conversación reiniciada. Puedes enviar tu nueva consulta.» |
| `/desvincular` | Desvincula y confirma que ya no puede consultar datos por ese canal |
| `/ayuda` o `/start` con cuenta vinculada | Presenta opciones de consulta y comandos |
| Formato de consulta inválido | Indica límites de texto o nota de voz |
| Error temporal de análisis | «No pude completar el análisis. Inténtalo de nuevo en un momento.» |
| Vínculo revocado antes de entregar | Se suprime la entrega privada |

### Ejemplo didáctico

Entrada: «Si recibo 500.000 adicionales, ¿podría aumentar mi abono?»

Recorrido: identificar 500.000 como supuesto → consultar presupuesto y obligaciones vigentes → calcular con evidencia → explicar el escenario y sus límites → validar cifras → devolver respuesta. No se registra un ingreso ni un pago por haber mencionado ese valor.

---

## 2. Lectura de documentos para crear o editar una obligación — RA-N8N-002

### Objetivo y diferencia con la biblioteca

Ayudar a completar el formulario de una obligación a partir de un PDF con texto, DOCX o XLSX. La salida es un **borrador editable**, no una obligación guardada.

Este recorrido procesa archivo y texto en memoria. No archiva el original en la biblioteca ni lo indexa automáticamente. El OCR incorporado en la biblioteca no implica que este endpoint de borradores admita PDF escaneado: el extractor de este recorrido sigue requiriendo texto legible.

Workflow técnico: `document-ingestion.json`, ID `ceroaDocuments02`.

### Recorrido paso a paso

**Paso 1. Abrir Registrar o Editar obligación.**

El usuario pulsa **Leer documento financiero**. La operación es `create` o `update`. Para editar, la deuda destino debe pertenecer a su cuenta.

**Paso 2. Seleccionar archivo y consentir el análisis.**

El consentimiento se solicita para cada archivo. Sin él, se devuelve: «Autoriza el análisis con Gemini antes de enviar el documento.»

**Paso 3. Validar sesión, CSRF, operación y propiedad.**

Crear no debe incluir una deuda destino. Actualizar sí debe incluirla. La identidad y la operación provienen de la solicitud autorizada, no del texto del documento ni del modelo.

**Paso 4. Validar el archivo.**

El límite es 8 MiB. Se verifica contenido real, formato, protección, macros, enlaces externos y límites de expansión del ZIP de Office. Renombrar un archivo no lo convierte en un formato válido.

**Paso 5. Extraer texto con ubicación.**

| Formato | Procesamiento y decisiones |
|---|---|
| PDF con texto | PDFBox extrae por página; máximo 25 páginas |
| PDF escaneado o con páginas sin texto | Se rechaza esta lectura y se permite continuar manualmente |
| DOCX | Se leen texto y tablas, incluidos elementos de encabezados/pies contemplados por el extractor; imágenes y objetos incrustados no se interpretan |
| XLSX sin hoja elegida | Devuelve hojas visibles y `requiresSheetSelection=true`; todavía no hay borrador financiero |
| XLSX con hoja válida | Lee esa hoja; no combina otras obligaciones ni calcula fórmulas |
| XLSX con hoja inexistente u oculta | Pide seleccionar una hoja visible válida |

Límites de contenido: 80.000 caracteres, 2.000 segmentos, hasta diez hojas de Excel y 5.000 celdas procesadas en la hoja elegida. El contenido excesivo se rechaza, no se trunca silenciosamente.

**Paso 6. Crear contexto temporal y llamar al webhook privado.**

El backend genera una solicitud de 150 segundos. Se admiten cuatro solicitudes por minuto por cuenta, una simultánea por cuenta y diez simultáneas globales.

**Paso 7. Validar la fuente en n8n.**

El nodo `Validar fuente` verifica el contrato recibido. La extracción usa un esquema fijo del servidor; el usuario no puede introducir otro esquema para conceder funciones al modelo.

**Paso 8. Gemini propone campos sin herramientas.**

`Extraer borrador sin herramientas` no puede ejecutar SQL, abrir URLs que aparezcan en el documento ni llamar a APIs de escritura.

El esquema incluye entidad, tipo de deuda, saldo, importe original, tasa, modalidad de tasa, cuota, pago mínimo, fechas y otros campos del formulario. Todos los campos del borrador pueden ser nulos. Color y detalles específicos por tipo no se infieren; el nombre personalizado requiere definición del usuario según el contrato documentado.

**Paso 9. El parser comprueba la estructura.**

La salida contiene `draft`, `evidence` y `warnings`. Cada evidencia identifica campo, cita literal y ubicación. Que un JSON sea válido no significa que sus valores sean verdaderos.

**Paso 10. El backend valida la evidencia.**

Cada propuesta no nula debe tener respaldo presente en el texto extraído. Si falta información, no se inventa. Ambigüedades o contradicciones eliminan la propuesta afectada y generan advertencias. Una salida que viola el contrato puede invalidar toda la extracción.

No se transforma una cuota ausente en cero, ni una tasa desconocida en `NONE`. Si no aparece tasa, `interestRate` y `rateType` permanecen nulos.

**Paso 11. Mostrar borrador y advertencias.**

La respuesta incluye `format`, `sheets`, `requiresSheetSelection`, `draft`, `evidence` y `warnings`. El usuario ve las propuestas y puede corregirlas o completar los requisitos faltantes.

Al editar, los valores nulos no borran automáticamente lo existente. Las propuestas se aplican individualmente y se revisan diferencias.

**Paso 12. El usuario decide.**

- **Cancelar:** termina sin guardar cambios.
- **Corregir o completar:** modifica el formulario.
- **Guardar:** el frontend usa el circuito normal `POST /api/v1/debts` o `PUT /api/v1/debts/{id}` con sesión y CSRF.

Antes de actualizar se relee la deuda para conservar campos no editados y bloquear conflictos sobre los editados. El backend aplica los mismos requisitos financieros y límites de plan del formulario manual. n8n no participa en el guardado final.

### Ramas y posibles resultados

| Condición | Salida | Acción disponible |
|---|---|---|
| Documento válido y evidencia suficiente | Borrador con propuestas verificadas | Revisar y guardar el formulario completo |
| Solo algunos datos aparecen | Borrador parcial y advertencias | Completar manualmente |
| Falta tasa o modalidad | Valores nulos | Seleccionar y confirmar el dato correcto |
| XLSX sin hoja | Lista de hojas visibles, selección requerida | Elegir hoja y reenviar |
| XLSX con fórmulas | Fórmulas excluidas; pueden quedar datos faltantes | Completar o aportar valores legibles |
| PDF escaneado | Error de lectura para este recorrido | Registro manual o usar la biblioteca para OCR y consulta |
| DOCX solo con imágenes | Sin texto legible | Continuar manualmente |
| Archivo vacío, excesivo o formato incompatible | Entrada inválida | Subir un archivo válido dentro de límites |
| Archivo protegido, corrupto, con macros o relaciones externas | Rechazo seguro | Usar copia compatible o registro manual |
| Falta consentimiento | No se analiza | Autorizar explícitamente si se desea continuar |
| Operación incoherente o deuda ajena | Rechazo antes de mostrar propuestas autorizadas | Corregir la solicitud o entrar con la cuenta correcta |
| Cita inexistente o salida fuera del esquema | Extracción inválida | Reintentar o completar manualmente |
| Proveedor, credencial o timeout | No devuelve un borrador validado | Reintentar o usar el formulario manual |
| Contexto vencido o ya consumido | No acepta otra finalización | Iniciar otra lectura |
| Frecuencia o concurrencia agotadas | HTTP 429 | Esperar antes de otra carga |
| Se cancela tras ver el borrador | No se envía POST/PUT de deuda | No hay cambios financieros |
| Guardado con datos obligatorios incompletos | Validación normal del backend | Corregir lo señalado |
| Conflicto al editar | Se bloquea la actualización conflictiva | Revisar la versión actual de la deuda |
| Guardado válido y confirmado | Obligación creada o actualizada por la API normal | Continuar en Ceroa |

Los errores de entrada utilizan `DOCUMENT_INVALID`; las indisponibilidades o rechazos capturados como estado HTTP usan `DOCUMENT_UNAVAILABLE`, conservando el estado y un mensaje adecuado. Un mensaje literal de fallo es: «No pude extraer los datos. Reintenta o completa el registro manualmente.»

### Ejemplo didáctico

Un extracto identifica una entidad y un saldo, pero no permite determinar la modalidad de tasa. El borrador propone entidad y saldo con sus citas, deja la tasa/modalidad desconocidas y muestra advertencias. El usuario completa nombre y requisitos, revisa y guarda. La ausencia de tasa no autoriza a guardar automáticamente una deuda sin intereses.

---

## 3. Consulta documental RAG y biblioteca financiera híbrida — RA-N8N-003 y evolución actual

### Objetivo y fuentes

Responder con contenido recuperado y referencias verificables. Existen tres fuentes distintas:

1. **Documentación aprobada de Ceroa:** guías revisadas sobre estrategias y funcionamiento del producto.
2. **Biblioteca privada:** extractos, comprobantes, contratos y otros documentos autorizados del usuario.
3. **Datos estructurados financieros:** saldos, pagos y cálculos de los servicios del backend.

Una guía general explica una estrategia; no acredita cuánto debe una persona. Un extracto puede contener movimientos; no demuestra que se registraron como pagos en Ceroa. La respuesta debe conservar esas diferencias.

### Workflows técnicos implicados

| Archivo / ID | Función |
|---|---|
| `hybrid-rag-query.json` / `ceroaHybridQuery20` | Consulta actual del asistente con herramientas financieras y documentales |
| `hybrid-rag-ingestion.json` / `ceroaRagIngest20` | Atiende el evento documental y procesa un trabajo |
| `hybrid-rag-sync.json` / `ceroaRagSync20` | Cada minuto revisa trabajos pendientes y reservas vencidas |
| `hybrid-rag-ocr.json` / `ceroaOcr21` | Transcribe PDF escaneado por página con Gemini |
| `rag-index.json` / `ceroaRagIndex03` | Indexación administrativa manual de guías aprobadas |
| `rag-embedding.json` / `ceroaRagEmbedding03` | Embeddings de consulta mediante webhook privado |
| `assistant-telegram.json` / `ceroaTelegram01` | Canal para subir, gestionar y consultar la misma biblioteca |

### Recorrido A: preparar documentación aprobada

**Paso A1. Aprobar una fuente.** Se registra ruta, título, versión, aprobación y hash SHA-256 en el manifiesto. El corpus inicial contiene las guías `estrategias.md` y `registro-y-consultas.md`.

**Paso A2. Comprobar integridad.** La preparación solo acepta fuentes explícitamente aprobadas y verifica sus bytes. No indexa automáticamente todos los archivos del repositorio.

**Paso A3. Fragmentar y generar embeddings.** La fragmentación inicial de guías utiliza 1.200 caracteres con 200 de solapamiento. Estos parámetros son distintos de los de documentos privados.

**Paso A4. Guardar el índice auxiliar.** Se escribe en `n8n_aux` con un rol administrativo limitado, sin acceso a las tablas financieras de `ceroa`. Repetir el mismo snapshot no duplica fragmentos.

**Paso A5. Calibrar y publicar.** Se verifica modelo, dimensión, integridad y calibración antes de publicar el snapshot. Retirar una fuente debe impedir que se siga citando como vigente.

Si falta aprobación, cambió el hash, el snapshot no está calibrado o la integridad no coincide, no corresponde publicarlo. Los mensajes del chat y archivos privados no se incorporan a este corpus general.

### Recorrido B: cargar e indexar un documento privado

**Paso B1. Elegir Subir documento en el asistente.**

La carga automática admite archivo y consentimiento sin llenar metadatos. Las integraciones también pueden enviar metadatos explícitos. En XLSX debe elegirse la hoja.

**Paso B2. Validar identidad, consentimiento y archivo.**

Se comprueba propietario, formato y límites: PDF/DOCX/XLSX de hasta 8 MiB, PDF de hasta 25 páginas y límites del extractor compartido. Si se asocia a una deuda, debe ser una relación autorizada del propietario.

**Paso B3. Comprobar duplicados.**

El hash se evalúa por propietario. Repetir el mismo original devuelve el documento existente cuando corresponde; no crea otro índice independiente por usar Telegram en vez de web.

**Paso B4. Guardar original y trabajo durable.**

El original se guarda en Storage privado. PostgreSQL conserva metadatos, versión, estado y trabajo de procesamiento. La carga aceptada no significa que el documento ya esté indexado: normalmente comienza en `PENDING`.

Si falla la escritura de metadatos tras subir el archivo, existe compensación; no hay una transacción única entre Storage y PostgreSQL. Una caída extrema puede requerir conciliación de objetos.

**Paso B5. Despertar ingestión.**

Un evento privado avisa de trabajo disponible. Como respaldo, `Sincronización documental` revisa la cola cada minuto.

**Paso B6. Tomar el trabajo.**

El backend usa bloqueo, versión, número de intento y una reserva temporal de cinco minutos. Solo procesa la versión vigente. Un trabajo sin confirmar cuya reserva venció puede recuperarse hasta el límite de tres intentos.

Si no hay trabajo disponible, el flujo termina sin generar un resultado ficticio. Si se agotaron los intentos, el trabajo queda `FAILED` con el motivo correspondiente.

**Paso B7. Extraer contenido.**

- Si existe texto utilizable, usa extracción nativa y marca `NATIVE`.
- Si el PDF requiere OCR y el adaptador está configurado, llama al workflow OCR y marca `GEMINI_OCR`.
- Si no hay OCR disponible o falla la extracción, el documento queda pendiente de revisión.
- Si falta una selección de hoja necesaria, se solicita resolverla.

**Paso B8. Ruta OCR, cuando aplica.**

El webhook privado recibe el PDF autorizado → consulta configuración → valida PDF/páginas → Gemini recibe el PDF completo → devuelve transcripción por página → se valida integridad → se entrega texto al backend.

Se rechazan páginas faltantes o duplicadas, contenido fuera de límites y respuestas inciertas. Los fallos se distinguen por etapa de configuración, entrada, proveedor o transcripción. Un fallo OCR no se convierte en texto inventado ni registra finanzas.

**Paso B9. Minimizar y fragmentar.**

Antes de entregar texto a n8n se ocultan identificaciones y otros patrones sensibles contemplados por el servicio. No es una eliminación exhaustiva de todo dato personal.

Los fragmentos privados tienen hasta 1.800 caracteres, solapamiento de 200, ubicación original y página cuando puede determinarse; máximo 120 fragmentos.

**Paso B10. Comprobar configuración y proponer metadatos.**

El nodo Supabase lee la configuración `financial-library-v1` mediante el gateway restringido del backend. El contrato usa `gemini-embedding-001`, 768 dimensiones, y el OCR configurado.

Gemini propone tipo de identificación, clase documental, entidad, período y emisión con citas. El extractor no tiene herramientas. El modo automático completa campos ausentes y puede sustituir el tipo provisional `OTHER`; no cambia propietario ni asociación a deuda.

Fechas inválidas y propuestas contradictorias se descartan. Un fin inclusivo escrito en un extracto se normaliza al día siguiente para representar un fin exclusivo.

**Paso B11. Generar embeddings.**

Se genera un vector por fragmento con el uso `RETRIEVAL_DOCUMENT`. El backend comprueba modelo, dimensión, valores, orden, cantidad y cobertura exacta de fragmentos.

**Paso B12. Confirmar la indexación en backend.**

Se revalidan cuenta activa, intento, reserva, versión y citas. Todo el índice se persiste en una transacción. Un callback antiguo no puede sobrescribir una versión nueva.

**Paso B13. Comunicar estado.**

| Estado | Significado | Continuación |
|---|---|---|
| `PENDING` | Trabajo creado | Esperar ingestión o sincronización |
| `PROCESSING` | Trabajo tomado y en curso | Consultar estado más tarde |
| `INDEXED` | Índice confirmado y metadatos mínimos suficientes | Buscar y conversar sobre contenido |
| `REVIEW_REQUIRED` | Falta extracción válida, selección de hoja o metadato necesario | Revisar, corregir o reprocesar |
| `FAILED` | Fallo explícito del proveedor o límite de recuperación | Resolver causa y solicitar Reprocesar |
| `DELETING` | Borrado iniciado | Contenido retirado del acceso; completar o repetir borrado si falló |

`SUPERSEDED` identifica trabajos sustituidos por versiones posteriores; es un estado del historial de procesamiento, no una versión antigua que deba seguir apareciendo como contenido vigente.

Si falta tipo de identificación, o si un extracto carece de período completo, puede terminar `REVIEW_REQUIRED` aunque haya habido procesamiento. La interfaz no debe confundirlo con «todo listo».

### Recorrido C: consultar documentos y datos

**Paso C1. Recibir la pregunta.** Puede llegar por web o Telegram, texto o voz. Hereda autorización y preparación del workflow 1.

**Paso C2. Determinar la fuente necesaria.** Una pregunta puede ser documental, personal o mixta. Si se seleccionó un documento, la consulta queda limitada a él; no debe ampliar la búsqueda al corpus general de guías.

**Paso C3. Elegir intención y filtros.** La biblioteca implementa seis intenciones:

| Intención | Uso |
|---|---|
| `METADATA_SEARCH` | Buscar documentos por metadatos, sin necesidad de interpretar contenido |
| `STRUCTURED_QUERY` | Consultar información financiera estructurada del propietario autenticado |
| `SEMANTIC_SEARCH` | Buscar contenido por significado usando embeddings |
| `HYBRID_SEARCH` | Combinar búsqueda textual y semántica |
| `COMBINED_QUERY` | Combinar contenido documental y datos financieros estructurados |
| `PERIOD_ANALYSIS` | Recuperar contenido de los archivos de un período con cobertura y paginación explícitas |

Los filtros contemplan identificación, tipo documental, entidad, intervalo y documento. El propietario efectivo y las concesiones de acceso se verifican en backend. Los tipos documentales son `BANK_STATEMENT`, `PAYMENT_RECEIPT`, `LOAN_AGREEMENT` y `OTHER`.

**Paso C4. Aplicar autorización y filtros antes del ranking.** No se buscan todos los documentos para descartar después los ajenos. Los candidatos autorizados se delimitan antes de puntuar y limitar fragmentos.

**Paso C5. Recuperar evidencia.**

La documentación aprobada devuelve hasta cuatro fragmentos relevantes por búsqueda, con título y versión. La biblioteca devuelve documentos, fragmentos, ubicación/página, filtros, estado de evidencia y trazabilidad.

Si falla el proveedor de embeddings, la búsqueda semántica pura queda indisponible. Las búsquedas híbridas o combinadas pueden usar recuperación textual y deben indicarlo.

**Paso C6. Analizar períodos completos cuando se solicita.**

`PERIOD_ANALYSIS` primero lista los documentos autorizados del intervalo y lee los fragmentos indexados de cada archivo de la página; no depende únicamente de cuáles archivos ganan un ranking semántico global.

Devuelve `documentsOnPage`, `indexedSources`, `hasMoreDocuments`, `nextOffset`, `complete`, `documentsWithoutContent` y `contentTruncated`. El contenido agregado se limita a 90.000 caracteres. Si hay otra página, contenido omitido o archivos sin índice, la cobertura es parcial.

Comparar meses requiere consultar cada período. Por ejemplo, septiembre completo se representa con inicio `2026-09-01` y final exclusivo `2026-10-01`. La fecha de carga no sustituye el período del extracto.

**Paso C7. Identificar movimientos antes de sumar.**

Las cifras documentales se vinculan como hechos de esta solicitud. Para sumar pagos o intereses, el modelo debe reconocer líneas reales, evitar duplicados y distinguir saldos y proyecciones. Las operaciones aritméticas se ejecutan con la herramienta de cálculo.

No encontrar pagos registrados en Ceroa no demuestra que no existan pagos dentro de archivos. Tampoco debe llamarse «total del mes» a una suma que solo cubre algunos documentos.

**Paso C8. Redactar, revisar y validar.**

Se explica el hallazgo con fuentes. Se aplica la revisión y corrección única del workflow 1 y la validación final de cifras y referencias. Antes de entregar, el backend vuelve a comprobar acceso, versión y vigencia de fuentes.

**Paso C9. Entregar respuesta o abstenerse.**

La salida puede incluir texto generado, datos verificados, filtros aplicados, fuentes, documentos, `evidenceStatus`, `traceId` y tiempo de consulta. Los listados por metadatos tienen mensajes canónicos y referencias tipadas, evitando depender de una descripción inventada por el modelo.

### Todas las categorías de resultado de consulta de biblioteca

| `evidenceStatus` | Condición | Qué puede afirmarse |
|---|---|---|
| `AVAILABLE` | Hay evidencia para el alcance recuperado | Hallazgos limitados a esas fuentes; no es garantía universal de interpretación |
| `INSUFFICIENT` | No hay evidencia documental o resultados suficientes | Abstención: no se confirma el dato buscado |
| `PARTIAL` | Parte de la evidencia está disponible, o un período tiene cobertura incompleta | Respuesta parcial con advertencia y sin confirmar un total completo |
| `TEXT_ONLY` | Hay resultados por recuperación textual tras fallo semántico | Se pueden explicar los resultados, declarando el modo degradado |

Estos estados pertenecen a la consulta de biblioteca. No deben confundirse con los estados de procesamiento de un archivo.

### Otras ramas importantes de consulta

| Condición | Resultado |
|---|---|
| Guías aprobadas relevantes y vigentes | Respuesta documental con título, versión y referencia |
| Pregunta documental sin fuentes suficientes | Abstención explícita |
| Pregunta mixta con finanzas disponibles pero sin evidencia documental | Se limita la conclusión y se declara que falta sustento documental |
| Falla autorización personal en una consulta mixta | No se revelan finanzas; la explicación general solo procede si hay evidencia aprobada y puede resolverse por la ruta autorizada |
| Cita inventada, fuente retirada o snapshot cambiado | Rechazo o abstención según la validación aplicable |
| Búsqueda por metadatos sin coincidencias | «No hay documentos que coincidan con los filtros consultados.» |
| Búsqueda por metadatos con coincidencias | «Encontré documentos que coinciden con los filtros consultados. Revisa las referencias adjuntas.» |
| Documento seleccionado sin fragmentos útiles | Explica que no puede confirmar el dato y, si procede, muestra solo un resumen de metadatos |
| Documento reemplazado o eliminado durante la consulta | Rechaza la respuesta desactualizada y requiere consultar otra vez |
| Intervalo incompleto o inválido | Solicita corregir fechas; no completa el período arbitrariamente |
| Más páginas o archivos sin contenido | Advierte comparación parcial y no confirma un total completo |
| Fallo del modelo o del contrato de índice | Error seguro de disponibilidad |
| Documento ajeno sin concesión | Sin acceso; no se recupera contenido privado |

### Recorrido D: versiones, reemplazo, descarga y eliminación

1. **Consultar versiones:** devuelve el original actual e históricos autorizados.
2. **Descargar:** el backend emite un ticket temporal protegido de 60 segundos. No entrega una URL pública de Supabase.
3. **Reemplazar:** el usuario indica la versión esperada, consiente y aporta otro archivo. Se conserva la identidad del documento y se archiva el original anterior.
4. **Reindexar:** se incrementa versión y se retiran fragmentos anteriores de la búsqueda. Trabajos atrasados no pueden escribir sobre la nueva versión.
5. **Repetir el original actual:** no genera otra versión.
6. **Conflicto de versión o duplicado de otro documento:** responde HTTP 409; debe revisarse qué versión o documento corresponde.
7. **Corregir metadatos o reprocesar:** se genera el trabajo/versionado previsto y se retira el índice sustituido. No cambia la deuda financiera por corregir la entidad de un archivo.
8. **Eliminar:** se marca `DELETING`, se retiran fragmentos/trabajos, se eliminan originales actuales e históricos y finalmente metadatos. Un fallo intermedio conserva el bloqueo de acceso y permite repetir el borrado.

El historial de originales no equivale a un registro completo de cada edición individual de metadatos. Borrar en Ceroa no retira copias ya descargadas a Telegram u otros destinos.

### Biblioteca desde Telegram: decisiones y comandos

Se utiliza la misma biblioteca privada de la web. Antes de descargar un adjunto desde Telegram, el backend comprueba cuenta vinculada y consentimiento documental. Al procesar vuelve a comprobarlos.

| Comando o entrada | Resultado |
|---|---|
| `/autorizar_documentos` | Autoriza cargas y análisis; informa que Gemini recibe el PDF completo para OCR |
| `/revocar_documentos` | Impide nuevas cargas; no borra la biblioteca existente |
| Adjuntar PDF/DOCX/XLSX válido | Devuelve ID y estado inicial; el análisis sigue en segundo plano |
| XLSX con `/hoja Nombre exacto` | Procesa la hoja indicada si es válida |
| Fotografía suelta | No se indexa; debe enviarse como documento PDF |
| `/documentos` o `/documentos 2` | Lista documentos, diez por página |
| `/documento ID` o `/estado ID` | Estado, metadatos y versión |
| `/buscar_documentos ...` | Búsqueda por filtros y/o contenido |
| `/versiones ID` | Lista original actual e históricos |
| `/descargar ID` | Entrega el original actual como archivo si sigue autorizado |
| `/descargar ID 1` | Entrega la versión histórica solicitada si existe y hay acceso |
| `/reemplazar ID VERSION` | Prepara un reemplazo por cinco minutos; después se adjunta el nuevo archivo |
| Archivo con leyenda `/reemplazar ID VERSION` | Solicita reemplazo explícito, con verificación de versión |
| `/metadatos ID entidad="Banco Corregido"` | Corrige los campos indicados y solicita reindexación |
| `/reprocesar ID` | Solicita nuevo análisis |
| `/eliminar_documento ID` | Solicita código de confirmación |
| `/confirmar_eliminacion CODIGO` | Borra si código, plazo y autorización son válidos; vence en cinco minutos |
| `/cancelar_documento` | Cancela reemplazo o eliminación pendientes |
| Archivo sin consentimiento | No se descarga para carga; se muestra la instrucción de autorización |
| Documento inexistente o sin acceso | «Documento no encontrado o sin acceso. Consulta /documentos.» |
| Solicitud documental mal formada | Pide revisar formato, identificadores y fechas, y consultar `/ayuda` |
| Update duplicado | No repite carga ni reemplazo |
| Revocación antes de entregar bytes | No se entrega el original privado |

Filtros de búsqueda: `identificacion`, `tipo`, `entidad`, `desde`, `hasta`, `texto`, `pagina`. `desde` y `hasta` se suministran juntos. En correcciones se admiten identificación, tipo, entidad, inicio, fin y emisión; `-` borra un campo opcional. Los estados pendientes de reemplazo o confirmación se pierden al reiniciar el backend; los archivos almacenados y el consentimiento persisten.

### Ejemplo didáctico

Entrada: «Según todos mis extractos de septiembre de 2026, ¿qué pagos realicé y qué tasas aparecen?»

Recorrido: preparar el intervalo → `PERIOD_ANALYSIS` → recuperar documentos autorizados y fragmentos de cada archivo de la página → comprobar cobertura → identificar pagos y tasas con sus referencias → calcular solo si se justifica → indicar fuentes. Si falta un extracto indexado o quedan páginas, la respuesta debe decir que el análisis es parcial y no confirmar un total del mes.

---

## 4. Recordatorios de vencimientos y briefing — RA-N8N-004

### Objetivo y condiciones

Enviar avisos en los hitos de **siete días antes, tres días antes y día del vencimiento**. También entregar un resumen financiero semanal o mensual.

Las notificaciones internas de vencimiento están disponibles para todos los planes. El envío Telegram y el briefing requieren cuenta activa, Ceroa Plus efectivo, chat privado vinculado y consentimiento específico.

En Perfil → Avisos y resumen por Telegram se activan por separado recordatorios y briefing. Se elige la hora de Colombia entre las horas admitidas por la configuración, el día semanal o frecuencia mensual. El valor inicial es 08:00 y lunes; el mensual se programa para el día 1. El contrato actual guarda una hora entera de 0 a 23, no un minuto arbitrario.

Workflow: `scheduled-reminders.json`, ID `ceroaReminders04`. Diagnóstico auxiliar: `reminder-error.json`.

### Recorrido paso a paso

**Paso 1. Ejecutar la revisión cada cinco minutos.** La zona horaria es `America/Bogota`. n8n local solo ejecuta mientras la computadora, Docker y el servicio estén funcionando.

**Paso 2. Iniciar paginación por usuarios.** `Iniciar paginación` comienza en cero. `Preparar eventos autorizados` pide al backend páginas de 25 usuarios. `Hay más usuarios` repite hasta terminar.

**Paso 3. Calcular hitos y revisar preferencias.** El backend utiliza `UpcomingDueService`: solo `SEVEN_DAYS`, `THREE_DAYS` y `DUE_TODAY`. No inventa hitos de seis o dos días. Antes de la hora configurada no prepara el envío de esa preferencia.

Para briefing comprueba el día semanal elegido o el día 1 del mes, según frecuencia.

**Paso 4. Crear eventos y entregas sin duplicarlos.** Se usan claves persistentes:

- Vencimiento: `DUE_MILESTONE:deuda:fecha:hito`.
- Briefing: `BRIEFING:frecuencia:fecha`.

La unicidad y los bloqueos previenen eventos dobles al repetir revisiones. No se modifica saldo, pago ni estrategia.

**Paso 5. Consultar candidatos pendientes.** El backend devuelve hasta 100. n8n acepta exclusivamente briefing o recordatorios de los hitos permitidos.

Si la lista está vacía, termina sin enviar. Esto puede ser funcionamiento normal: no hay hitos, todavía no es la hora o faltan condiciones de autorización.

**Paso 6. Procesar una entrega a la vez.** `Procesar una entrega` toma un candidato.

**Paso 7. Reservar la entrega.** El backend devuelve `reserved=true` y un token cuando concede la reserva exclusiva de tres minutos. Si ya fue tomada, cambió el estado, aún no toca el reintento o dejó de ser válida, devuelve `reserved=false` y el flujo pasa al siguiente candidato.

**Paso 8. Revalidar antes de enviar.** Se verifican propietario, cuenta, Plus, vínculo, consentimiento, saldo, estado de deuda, fecha, hito y vigencia. Para briefing también se comprueban preferencias actuales.

Si no procede, `send=false` y no se llama a Telegram. Si procede, `send=true` con chat autorizado, texto canónico y fecha de validación. La entrega pasa a `DISPATCHING`.

**Paso 9. Preparar y enviar texto.** n8n escapa HTML y verifica tamaño/destinatario. Los importes se calculan en backend y se formatean con separadores colombianos. Gemini no decide ni recalcula estos avisos.

**Paso 10. Interpretar la respuesta de Telegram.** Solo `ok=true` y un `message_id` válido acreditan envío confirmado. Un timeout no demuestra que Telegram no haya entregado el mensaje.

**Paso 11. Registrar resultado en backend.** Se guarda `SENT`, `RETRY`, `FAILED` o `AMBIGUOUS`. Si falla registrar el resultado, se reintenta hasta tres veces el mismo cuerpo, sin repetir el envío a Telegram.

**Paso 12. Continuar y recuperar cuando corresponde.** Se pasa al siguiente candidato. Revisiones posteriores recuperan reservas vencidas sin despacho y reintentos reconocidos. Los despachos inciertos no se reenvían automáticamente.

### Estados posibles de entrega

| Estado | Significado y continuación |
|---|---|
| `PENDING` | Entrega creada, aún sin tomar |
| `RESERVED` | Un worker tiene reserva; todavía no se autorizó el intento remoto |
| `DISPATCHING` | Intento autorizado y en curso; puede haber llegado a Telegram |
| `SENT` | Telegram confirmó con identificador válido; se actualiza el canal del evento interno |
| `RETRY` | Fallo reconocido como reintentable; espera el siguiente momento permitido |
| `INVALIDATED` | Caducó o cambió información, consentimiento, vínculo o preferencia |
| `FAILED` | Fallo permanente reconocido o se agotaron los intentos |
| `AMBIGUOUS` | No hay certeza de entrega; no se reenvía automáticamente |

### Clasificación de todas las ramas de envío previstas

| Resultado o condición | Decisión |
|---|---|
| Sin candidatos | Fin normal sin mensajes |
| Usuario sin Plus, cuenta inactiva, sin vínculo o sin consentimiento | No autorizar envío |
| Se vinculó otra vez, sin renovar consentimiento | No reutilizar la autorización anterior |
| No corresponde hito 7/3/0 | No crear recordatorio de un día inventado |
| Revisión repetida del mismo evento | No duplicar entrega |
| Otra ejecución tiene la reserva | Saltar candidato |
| Deuda pagada, saldo/fecha/hito modificados | Invalidar el aviso que dejó de corresponder |
| Preferencias de briefing modificadas | Invalidar el evento que ya no coincide |
| Telegram confirma `ok` y `message_id` válido | `SENT` |
| 429 reconocido con espera válida | `RETRY`, respetando `retry_after` |
| 5xx reconocido | `RETRY` |
| Error permanente reconocido, como bot bloqueado o chat inexistente | `FAILED` |
| Timeout, conexión interrumpida o error desconocido | `AMBIGUOUS` |
| Respuesta aparentemente exitosa sin confirmación suficiente | No tratar como `SENT`; si no se registra certeza, el despacho puede expirar a ambiguo |
| Reserva vence sin despacho | Se puede recuperar para reintento |
| Despacho vence sin resultado | `AMBIGUOUS`, sin reenvío automático |
| Confirmación tardía válida del mismo intento/token | Puede conciliarse sin reenviar |
| Registro de resultado falla tres veces | No repetir Telegram; al vencer el despacho quedará ambiguo |
| Cuatro intentos efectivos agotados | `FAILED` |
| Llega medianoche de Colombia con pendiente vencido | Invalidación; no se envía un texto del día anterior |

El backoff es de 60, 120 y 240 segundos más una variación pequeña, respetando un `retry_after` mayor. Como el scheduler corre cada cinco minutos, el siguiente intento efectivo puede ocurrir después del mínimo de espera.

### Qué contiene el briefing

Es una instantánea actual del dashboard: saldo registrado, deudas activas, estrategia, pagos requeridos, próximo vencimiento y pagos registrados cuando hay evidencia. No debe presentarse un acumulado general de pagos como si fueran exclusivamente pagos de la semana o del mes.

### Límites operativos

No recupera días completos perdidos si el equipo estuvo apagado. Puede atender hitos todavía válidos al volver a arrancar durante el mismo día. No existe una transacción atómica entre Telegram y Supabase ni una garantía absoluta de una sola entrega frente a cualquier caída.

El workflow de error emite un diagnóstico fijo sin contenido financiero. No envía una respuesta al usuario ni sustituye la recuperación persistente de pendientes.

### Ejemplo didáctico

Faltan tres días para el vencimiento, la hora autorizada ya pasó y hay consentimiento. El backend crea el evento una vez. n8n reserva, revalida y envía. Si Telegram confirma, queda `SENT`. Si el usuario pagó antes de la revalidación, no se envía. Si Telegram no responde, no se supone que falló: queda un resultado ambiguo que evita un reenvío automático potencialmente duplicado.

---

## 5. Centinela de sobrecapacidad y simulación aprobada — RA-N8N-005

### Objetivo y regla exacta

Detectar cuándo los pagos exigibles de obligaciones activas superan el presupuesto que el usuario asignó a deudas. La política se denomina `BUDGET_OVER_CAPACITY_V1`.

La regla es:

`pagos exigibles registrados > presupuesto asignado a deudas`

No compara automáticamente contra todo el ingreso. Un presupuesto de cero es válido; habrá sobrecapacidad si los pagos exigibles son positivos. La igualdad se considera dentro del presupuesto para esta regla.

Las obligaciones activas para esta evaluación tienen saldo positivo y no están pagadas. La política se calcula en Spring Boot. El modelo de IA no fija el umbral ni decide qué cambios ejecutar.

Workflow: `scheduled-sentinel.json`, ID `ceroaSentinel05`. Diagnóstico auxiliar: `sentinel-error.json`.

### Recorrido A: evaluar y crear la alerta

**Paso A1. Se produce un disparador.**

- Una operación confirmada de deuda, pago, perfil o estrategia incrementa la versión financiera en la misma transacción; tras el commit se evalúa.
- El usuario pulsa evaluar desde Centinela.
- El scheduler revisa cada cinco minutos y recupera evaluaciones tras fallos.

Un rollback revierte también el incremento de versión. No se evalúa un cambio como confirmado si su transacción se revirtió.

**Paso A2. Leer perfil y obligaciones.** El backend obtiene presupuesto, cobertura declarada, obligaciones registradas y pagos exigibles de las activas.

**Paso A3. Revisar calidad de datos.** Se devuelve `INSUFFICIENT_DATA` / `UNKNOWN` si falta presupuesto válido, la cantidad de deudas declaradas no coincide con las registradas, no hay obligaciones registradas, falta el pago exigible de una activa o el perfil/alguna activa no se actualizó en 90 días.

En esa situación no se concluye que todo está bien ni se inventa sobrecapacidad.

**Paso A4. Sumar y comparar.** Si los datos son suficientes, suma pagos exigibles y compara con presupuesto. El faltante es `máximo(pagos exigibles − presupuesto, 0)`.

**Paso A5. Devolver evaluación.** Incluye versión de política, fecha, versión financiera, calidad, condición, motivo, presupuesto, pagos exigibles, faltante y acciones permitidas.

| Calidad / condición | Significado | Resultado |
|---|---|---|
| `INSUFFICIENT_DATA` / `UNKNOWN` | No hay base suficiente o actualizada | Explica qué falta; no habilita acciones de la evaluación |
| `COMPLETE` / `WITHIN_BUDGET` | Pagos exigibles menores o iguales al presupuesto | Sin alerta nueva de sobrecapacidad; no descarta otros riesgos |
| `COMPLETE` / `OVER_CAPACITY` | Pagos exigibles superiores al presupuesto | Alerta y acción de simulación sujeta a Plus y aprobación |

**Paso A6. Abrir o mantener episodio.** Una sobrecapacidad continua corresponde a un episodio. Se crea una sola alerta in-app por episodio, evitando generar una nueva cada cinco minutos.

El episodio se cierra si deja de cumplirse la condición o la calidad resulta insuficiente. Si posteriormente vuelve a existir sobrecapacidad válida, puede comenzar otro episodio.

**Paso A7. Mostrar la alerta.** La notificación interna explica pagos exigibles, presupuesto y diferencia. No exige consentimiento de Telegram para existir. El permiso `GENERATE_SIMULATION` de la evaluación no elimina la comprobación de Plus al proponer y aprobar.

### Recorrido B: entregar la alerta por Telegram

1. El usuario autoriza expresamente alertas del Centinela, con Plus y chat privado válido.
2. El scheduler pagina usuarios y consulta candidatos.
3. Para cada candidato, reserva la entrega con token y duración de tres minutos.
4. Revalida cuenta, Plus, consentimiento, vínculo, episodio, condición, versión financiera, presupuesto y pagos exigibles.
5. Si no corresponde enviar, devuelve `send=false`.
6. Si corresponde, marca `DISPATCHING` y entrega texto canónico al workflow.
7. n8n escapa el mensaje y llama a Telegram.
8. Registra confirmación, reintento, fallo permanente o ambigüedad con el mismo patrón del workflow 4.

El mensaje pide revisar la alerta y las opciones de simulación hipotética en Ceroa. No contiene un mecanismo por el que escribir «sí» en Telegram apruebe una simulación.

La entrega del Centinela caduca a las **24 horas desde su creación**. No debe confundirse con la caducidad a medianoche de los recordatorios. Tiene hasta cuatro intentos efectivos; los resultados ambiguos no se reenvían automáticamente.

Si cambió la versión financiera, el episodio o la condición respecto de la alerta, esa entrega puede invalidarse. La alerta histórica permanece como evidencia; no se asume que una misma alerta continua genera otra entrega por cada edición de cifras.

### Recorrido C: preparar y aprobar una simulación

**Paso C1. Abrir Centinela en la web.** La aprobación necesita la sesión autenticada y CSRF de Ceroa.

**Paso C2. Seleccionar deuda y estrategia.** La única acción autorizable es `GENERATE_SIMULATION`. Debe tratarse de deuda propia, activa y con saldo positivo, dentro de una alerta/episodio vigente de sobrecapacidad.

**Paso C3. Crear propuesta.** El backend vuelve a comprobar cuenta, Plus, alerta, episodio, condición y deuda. Puede rechazar con falta de permiso, no encontrado o conflicto si ya no representa la situación actual. Se admiten como máximo cinco aprobaciones pendientes por usuario; las vencidas se revisan antes de contar.

**Paso C4. Mostrar autorización concreta.** La propuesta vincula propietario, alerta, deuda, estrategia, acción, versión financiera y vencimiento de diez minutos. Todavía no se ha ejecutado la simulación.

**Paso C5. El usuario decide.**

- **Descartar:** pasa a `DISCARDED` si seguía pendiente.
- **Dejar vencer:** pasa a `EXPIRED` al comprobar el vencimiento.
- **Aprobar simulación:** se solicita consumo de esa aprobación concreta.

**Paso C6. Revalidar y reservar una sola ejecución.** El backend bloquea el registro y comprueba propietario, plazo, plan, acción, versión, episodio, condición y deuda. Si algo dejó de corresponder, invalida o expira la aprobación.

Una aprobación válida pasa de `PENDING` a `EXECUTING` antes de llamar al simulador. Dos solicitudes concurrentes no deben ejecutar dos veces la misma aprobación. Repetir una aprobación consumida devuelve el estado guardado.

**Paso C7. Ejecutar `SimulationService`.** Se llama con deuda y estrategia elegidas. Este recorrido envía una lista vacía de aportes adicionales; no hay base para afirmar que el chat puede añadir abonos arbitrarios a esta autorización.

**Paso C8. Confirmar el resultado.** Se vuelve a revisar versión financiera y condición. Si cambiaron durante la simulación, el resultado se invalida. Si el simulador falla o no retorna éxito, la aprobación queda fallida. Si termina correctamente, se guardan meses e intereses proyectados cuando existen, supuestos y estado de resultado.

**Paso C9. Mostrar escenario hipotético.** El éxito no registra pagos, no hace transferencias, no edita deudas ni cambia la estrategia elegida por el usuario. El código comunica: «Escenario hipotético; no se registró ningún pago ni se cambió la estrategia.»

### Todos los estados de aprobación

| Estado | Cuándo ocurre | Qué sigue |
|---|---|---|
| `PENDING` | Propuesta creada y no consumida | Aprobar, descartar o dejar vencer |
| `DISCARDED` | Usuario descartó una pendiente | No ejecutar esa aprobación |
| `EXPIRED` | Venció el plazo de una pendiente | Crear una propuesta nueva si aún procede |
| `INVALIDATED` | Cambiaron versión, condiciones, permisos o deuda | Revisar situación y crear otra si corresponde |
| `EXECUTING` | Aprobación consumida y simulación en curso | Consultar el resultado; no lanzar otra por repetir |
| `COMPLETED` | Simulador confirmó éxito y validación final correcta | Mostrar proyección y supuestos |
| `FAILED` | Simulación fallida o ejecución inconclusa vencida | Informar motivo; otra ejecución exige nueva aprobación |

Una ejecución que continúa en `EXECUTING` después del vencimiento se marca `FAILED` cuando se consulta su estado, con resultado desconocido. No se presenta como completada por haber recibido el clic de aprobación.

### Ramas adicionales y respuestas previstas

| Situación | Resultado |
|---|---|
| Función deshabilitada | Indisponibilidad del servicio |
| Falta presupuesto, cobertura o vigencia de datos | Evaluación `UNKNOWN` con motivo |
| Pagos exigibles iguales al presupuesto | `WITHIN_BUDGET`; faltante cero |
| Sobrecapacidad repetida dentro del mismo episodio | Sin alerta in-app duplicada |
| Usuario sin consentimiento Telegram | No enviar por ese canal; la alerta de la app puede existir |
| Sin Plus | Sin simulación autorizada ni alertas Telegram elegibles |
| Telegram sin vínculo privado válido | No autorizar el canal |
| La entrega perdió vigencia o cambió su versión | Invalidar envío anterior |
| Bot bloqueado o fallo permanente reconocido | Entrega `FAILED` |
| 429/5xx reconocidos | Entrega `RETRY` con límites |
| Resultado remoto incierto | Entrega `AMBIGUOUS` sin reenvío automático |
| Más de cinco propuestas pendientes | Límite temporal, HTTP 429 |
| Alerta/deuda ajena o inexistente | No encontrado; no expone datos del otro usuario |
| Deuda ya pagada o sin saldo al proponer | Conflicto; no emitir autorización útil |
| Propuesta vencida al aprobar | `EXPIRED`, sin simulación |
| Cambio financiero o pérdida de permiso al aprobar | `INVALIDATED`, sin ejecutar |
| Aprobación doble o concurrente | Una sola reserva; repeticiones devuelven estado guardado |
| Cambio financiero mientras corre simulación | `INVALIDATED` al comprobar resultado |
| Simulador sin resultado exitoso | `FAILED` y motivo disponible |
| Simulación correcta | `COMPLETED`; solo escenario hipotético |

### Ejemplo didáctico

Presupuesto para deudas: 800.000 COP. Pagos exigibles: 1.000.000 COP. Datos completos y recientes.

La política calcula faltante de 200.000 COP y `OVER_CAPACITY`. Crea la alerta del episodio. Si hay Plus, vínculo y consentimiento, puede enviar el aviso. El usuario abre Ceroa, elige deuda y estrategia, revisa la autorización y la aprueba dentro de diez minutos. Si todo sigue vigente, se genera una simulación. Los 200.000 COP son una diferencia calculada, no un pago ni un cobro.

---

## Diferencias que el documento final debe conservar

| Operación | ¿Guarda documentos? | ¿Modifica finanzas? | Confirmación necesaria |
|---|---|---|---|
| Preguntar al asistente | No por preguntar | No | Enviar la pregunta |
| Leer archivo para borrador de deuda | No lo archiva en la biblioteca | Solo después, si se guarda el formulario por la API normal | Consentir lectura, revisar y pulsar Guardar |
| Cargar a biblioteca | Sí, original privado, metadatos e índice | No crea deudas ni pagos | Consentimiento documental y carga |
| Consultar RAG | Lee fuentes e información autorizadas | No | Consulta autorizada |
| Corregir/reemplazar documento | Cambia información documental y versión según operación | No modifica la deuda asociada | Solicitud explícita y controles de versión/permisos |
| Recordatorio o briefing | Persiste estado de notificación/entrega | No | Consentimiento específico de canal |
| Evaluar Centinela | Persiste evaluación/episodio/alerta según recorrido | No modifica saldos, pagos o estrategia | Evaluación automática o manual |
| Aprobar simulación | Persiste aprobación y resultado | No altera cartera ni estrategia | Aprobación web concreta de un uso |

## Fuentes del proyecto para ampliar o comprobar

Documentación funcional:

- `docs/RA-N8N-001.md`
- `docs/RA-N8N-002.md`
- `docs/RA-N8N-003.md`
- `docs/RA-N8N-004.md`
- `docs/RA-N8N-005.md`
- `docs/RAG_V21_REPLACEMENT_OCR.md`
- `docs/TELEGRAM_DOCUMENT_LIBRARY.md`
- `docs/ASSISTANT_DOCUMENT_ANALYSIS.md`
- `docs/HYBRID_RAG.md` — contiene antecedentes; los avisos de estado antiguo quedan sustituidos por las actualizaciones posteriores.

Código y contratos principales:

- `backend/src/main/java/com/ceroa/service/AssistantService.java`
- `backend/src/main/java/com/ceroa/service/AssistantAnalysisService.java`
- `backend/src/main/java/com/ceroa/service/TelegramService.java`
- `backend/src/main/java/com/ceroa/service/TelegramDocumentService.java`
- `backend/src/main/java/com/ceroa/service/DocumentIngestionService.java`
- `backend/src/main/java/com/ceroa/service/DocumentTextExtractor.java`
- `backend/src/main/java/com/ceroa/service/DocumentLibraryService.java`
- `backend/src/main/java/com/ceroa/repository/FinancialDocumentRepository.java`
- `backend/src/main/java/com/ceroa/service/ScheduledReminderService.java`
- `backend/src/main/java/com/ceroa/service/SentinelService.java`
- `backend/src/main/java/com/ceroa/api/dto/DocumentContracts.java`
- `backend/src/main/java/com/ceroa/api/AssistantErrorAdvice.java`
- `backend/src/main/java/com/ceroa/api/DocumentErrorAdvice.java`
- `integrations/n8n/document-ingestion/draft.schema.json`
- Plantillas y generadores en `integrations/n8n/`.

## Prompt listo para pegar en ChatGPT

Adjunta este archivo o pega su contenido completo junto con la siguiente instrucción:

> Crea un documento detallado en español que explique los cinco workflows principales de Ceroa a una persona que necesita entender tanto la experiencia del usuario como la lógica del sistema. Usa únicamente el material de referencia adjunto.
>
> Incluye una introducción y un glosario breve. Para cada workflow explica objetivo, disparadores, requisitos, actores, entradas, pasos numerados, nodos técnicos relevantes, condiciones de cada decisión, alternativas, respuestas, estados, errores, reintentos, cancelación, intervención humana, datos almacenados y resultado final. Añade una tabla de decisiones y un ejemplo didáctico de éxito y otro de fallo o información incompleta. Si puedes generar diagramas, añade uno por workflow, con las ramas de validación, error y confirmación.
>
> Conserva los cinco grupos funcionales RA-N8N-001 a RA-N8N-005. Explica que necesitan más de cinco workflows técnicos y que el asistente actual comparte capacidades con el RAG híbrido. Distingue el lector temporal para borradores de la biblioteca persistente con OCR. Distingue documentos privados, guías aprobadas y datos financieros estructurados. No presentes mensajes de ejemplo como textos literales del sistema ni prometas enumerar todas las frases posibles de la IA.
>
> Mantén los límites y tiempos exactos indicados: no confundas la caducidad a medianoche de recordatorios con las 24 horas de entrega del Centinela; tampoco la autorización de simulación de diez minutos con una reserva de envío de tres minutos. No afirmes que un mensaje de Telegram o un sí en el chat autoriza cambios. La simulación no registra pagos ni cambia estrategia. Si faltan datos, indícalo; no inventes integraciones, capacidades o estados en vivo. Conserva los nombres técnicos entre paréntesis y explícalos en lenguaje sencillo. Finaliza con una comparación de los cinco workflows y referencias a los archivos fuente proporcionados.
