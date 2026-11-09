# Bloque 5 — validación y estabilización

Estado: **validación parcial; sin aprobación para operación continua**. Trabajo realizado el 9 de noviembre de 2026 en `refactor/n8n-multiagent`, después de `f5983eb`. Se conservaron la arquitectura y los controles existentes. Los ocho conectores generales de Workspace/MCP siguen inactivos y sin publicar. Gmail, Sheets y Calendar conservan sus flags de proveedor en `false`.

## Alcance y resultados

| Integración | Evidencia nueva | Límite pendiente |
|---|---|---|
| Financiero | Spring real, HTTP real hacia n8n, delegación nativa, Gemini real, datos sintéticos H2 y validación final. Tres consultas espaciadas con especialista `OK`. | React en navegador, muestra suficiente sin saturación y comparación con arquitectura anterior usando el mismo proveedor real. |
| RAG conversacional | Delegación y respuesta reales de Gemini; Spring revalida fuentes y cobertura. Hubo ejecuciones `OK`. | El conocimiento aprobado del ensayo conversacional es simulado. Hubo fallos de contrato y delegación adicional innecesaria. No equivale a RAG productivo completo. |
| Soporte | Prueba nativa con Gemini y herramientas simuladas pasó. El ensayo con Spring produjo respuestas parciales y rechazos de evidencia. | No se certifica estable el recorrido completo con Gemini. |
| Compuesta | Gemini delegó realmente a RAG y Financiero; se obtuvieron resultados finales validados con ambos especialistas `OK`. | También hubo invocaciones innecesarias de Soporte y fallos parciales. No se certifica eficiencia ni estabilidad de producción. |
| Determinista | Veinte consultas, sin delegación ni n8n; prueba Java verifica que no se toca el webhook. | Solo recorrido API/MockMvc, no medición de navegador. |
| Desconocida | Gemini real devolvió abstención, sin especialistas, en el smoke final. | Una muestra; no evaluación exhaustiva de intenciones desconocidas. |
| Drive | Google real → metadatos nativos → validación Spring → descarga nativa → biblioteca/Storage → cola PostgreSQL → Gemini/embeddings → índice real → recuperación mediante repositorio real. | Se inyectó manualmente el ID del único archivo autorizado. **No se probó el polling del Drive Trigger ni una conversación autenticada desde React sobre ese archivo.** La recuperación comprobada usó la rama léxica del repositorio híbrido. |
| Gmail | OAuth/lectura real actuales; eventos transaccionales y workflow nativo comprobados con proveedor simulado: aceptación, ambigüedad, cambio de destinatario y cola vacía. | No se envió otro correo real. No hay E2E nuevo registro/Plus → Gmail real. |
| Sheets | OAuth/lectura real actuales; pruebas del outbox comprueban proyección sin datos personales, reintento y conservación del evento origen. | No se ejecutó una nueva proyección PostgreSQL → Sheets real; se conserva la prueba nativa aislada del Bloque 4. |
| Calendar/Meet | OAuth/lectura real actuales; propuesta desde el asistente, confirmación de usuario e idempotencia verificadas con Calendar simulado. | No se creó otro evento real ni se repitió la prueba anterior de Meet. Notificación Gmail real pendiente. |
| MCP Server | Servidor nativo desechable: siete herramientas, autenticación, rechazo de herramienta desconocida y consulta autorizada contra adaptador simulado. Spring real comprueba scopes, hash, revocación, vencimiento, aislamiento y límite de treinta solicitudes por token/minuto. | No se emitió ni vinculó un token financiero de producción para un propietario real. No se comparte una credencial entre propietarios. |
| MCP Client | Cliente nativo contra SDK MCP local controlado, autenticación, herramienta fija sin argumentos, error 503, timeout, credencial incorrecta y contenido malicioso marcado como no confiable. Spring rechaza capacidades no permitidas y descarta instrucciones incrustadas. | Por instrucción del usuario, no existe servidor externo productivo autorizado. Cliente y wrapper de soporte siguen inactivos y no anunciados en el agente productivo. |

Las lecturas actuales de Drive, Gmail, Sheets y Calendar devolvieron HTTP 200. Esto acredita conectividad; no sustituye las pruebas integrales pendientes de la tabla.

## Fallos detectados y correcciones

1. **Contratos Gemini incompatibles.** Gemini rechazaba `const` en los esquemas de las herramientas del parser. Un `enum` de un solo elemento vuelve a convertirse en `const` dentro de n8n. Se sustituyeron los literales por patrones de texto para versión, rol y estado de propuesta; Spring mantiene las comprobaciones exactas. Se preservaron modelos, credenciales, herramientas y grafos existentes.
2. **Referencias incorrectas del modelo.** Se observó una ruta de procedencia financiera usada como fuente pública. El contrato la rechazó. Se aclararon `sources=[]` para evidencia privada, fID frente a dID y `advisoryProposal=null` cuando no hay propuesta. Estos cambios reducen ambigüedad; **no demuestran que todas las respuestas posteriores sean válidas**.
3. **Expresión Drive inválida.** El objeto anidado de metadatos contenía `}}` antes del cierre real de interpolación. Se separaron los cierres y se añadió una prueba que evalúa la expresión con datos sintéticos. El borrador general conserva carpeta, propietario, fuente y credenciales aprobados.
4. **Sandbox detenido al arrancar Docker.** La primera revisión del PDF quedó `FAILED:PROVIDER_FAILED`, sin fragmentos. Las credenciales de generación/embeddings sí funcionaban. API y runner del sandbox estaban detenidos porque no tenían política de reinicio; se arrancaron y se agregó `restart: unless-stopped` al Compose y a ambos contenedores existentes. La siguiente revisión se indexó correctamente.
5. **Semántica HTTP de Workspace.** La captura global de `ResponseStatusException` devolvía 503 y un mensaje de recuperación para una carpeta prohibida. Se añadió un advice limitado a los controladores Workspace/Drive/Calendar/MCP para conservar 403, 404, 409 y 429. Las pruebas HTTP y la comprobación real de Drive verifican el cambio.
6. **Cancelación Calendar ambigua.** `get()` ahora puede conciliar `CANCEL_AMBIGUOUS`/`CANCELLING` únicamente con prueba del proveedor que coincida en ID y estado `cancelled`. No repite `delete`, no considera un error/ausencia como prueba y conserva el slot hasta confirmar. Prueba simulada de regresión incluida.
7. **Ensayo de migraciones desactualizado.** La prueba PostgreSQL esperaba la versión `22`, aunque el despliegue ya incorpora `30`; se actualizó la expectativa conservando validación Flyway e idempotencia. El ensayo se separó de la biblioteca híbrida en otra base desechable porque ambas crean configuración en `public`; usar esquemas distintos de una misma base no aísla esa tabla. Se habilitó TLS en el servidor de prueba, sin desactivar TLS en servicios reales.

Se desplegó el backend verificado y se publicaron únicamente las correcciones de los tres especialistas ya existentes. Se actualizó el borrador inactivo de Drive. No se activaron los conectores generales, no se modificó el webhook conversacional principal y no se cambió de proveedor.

## Drive: evidencia del archivo acotado

Se creó **un único PDF sintético** en `Ceroa - Pruebas Bloque 4`, sin cifras financieras ni información personal, y se modificó ese mismo archivo una vez. El script conserva estado privado y evita volver a crear un archivo tras un resultado incierto.

- Primera revisión: descarga/cola reales; procesamiento falló por el sandbox detenido. Se preservó el fallo.
- Segunda revisión: misma identidad externa, versión documental `2`, estado de biblioteca `INDEXED`, un fragmento y un trabajo finalizado. El propietario coincide con la fuente aprobada y `source_type=CONNECTOR`.
- El fragmento vigente contiene `ESMERALDA` y no contiene `COBALTO`, que pertenecía a la primera revisión.
- Conciliación mediante API: `QUEUED` → `READY` después de observar `INDEXED`, sin adelantar el estado.
- Repetición sin cambios: `UNCHANGED`. Checksum incompatible con la misma versión: 409. Carpeta ajena: 403. Solicitud sin credencial: rechazada.
- `FinancialDocumentRepository.retrieve()` contra PostgreSQL real recuperó únicamente la versión vigente para el propietario aprobado y devolvió cero resultados para otro UUID sin permisos.

No se publicó contenido privado en el conocimiento global. El workflow manual de validación permanece inactivo. El PDF y su estado privado se conservan como evidencia; no se borraron documentos del usuario.

## Rendimiento real y límites de medición

Datos reproducibles y saneados: [benchmark conversacional](benchmarks/block5-real-2026-11-09.json) y [observaciones nativas](benchmarks/block5-native-2026-11-09.json).

| Ruta | Muestras de la tanda indicada | p50 / p95, milisegundos | Interpretación |
|---|---:|---:|---|
| Determinista, tanda inicial | 20 | 4 / 10 | API del backend; cero delegaciones. |
| Financiero, tanda espaciada | 3 | 4981 / 5221 | Especialista `OK` en las tres; percentiles preliminares. |
| RAG, tanda espaciada | 3 HTTP 200; una con todos los especialistas `OK` | 6888 / 7680 para HTTP 200 | Incluye respuestas parciales. La única muestra completamente validada tardó 3836 ms. |
| Soporte, tanda espaciada | 3 HTTP 200; ninguna con todos los especialistas `OK` | 7451 / 7845 para HTTP 200 | No son latencias de éxito integral. |
| Compuesta, tanda espaciada | 3 HTTP 200; dos con todos los especialistas `OK` | 7296 / 10706 para HTTP 200 | Las dos completamente validadas tardaron 7151 y 7296 ms. |

La tanda inicial ejecutó cien solicitudes, veinte por ruta. Alcanzó el límite real devuelto por Google de **quince solicitudes de generación por minuto**. Solo siete consultas financieras devolvieron HTTP 200; seis tuvieron todos sus especialistas `OK`. Las consultas restantes afectadas por cuota se conservan como fallos, no como latencias exitosas. La tanda posterior esperó treinta y cinco segundos entre solicitudes conversacionales; su tiempo de espera no se incluye en la latencia de cada consulta.

El smoke final separado comprobó RAG, Soporte, compuesta y desconocida. Sus observaciones y limitaciones aparecen en el JSON. HTTP 200 por sí solo no acredita éxito: el informe también conserva los estados de cada especialista.

Se registran ida/vuelta Spring–n8n, tiempo agregado por especialista, herramientas, recuperación de conocimiento, contexto entregado y delegaciones. En el ensayo conversacional el almacén de conocimiento es simulado y las cuentas/obligaciones están en H2 aislada. Los fragmentos privados reales de Drive se verificaron por separado.

La instantánea nativa permite contar invocaciones de los nodos Gemini y medir su duración. **No se conoce el número exacto de solicitudes HTTP/reintentos internos del SDK ni el tiempo exclusivo del proveedor**: permanecen `null`. Los tiempos de agentes, herramientas y modelo se solapan; no deben sumarse. No se midió por separado toda la consolidación y validación final, ni se hizo una comparación equivalente contra la arquitectura anterior con Gemini real. La comparación antigua/proveedor simulado sigue separada.

## Regresión y escenarios simulados

- Backend completo con Java 25 en contenedor sin red: 405 pruebas registradas, cero fallos, 31 omitidas por sus condiciones de entorno.
- Estabilización focalizada: 33 pruebas, cero fallos (Drive, MCP, Calendar, outbox y Plus).
- Asistente/MCP/Calendar desde API: 19 pruebas, cero fallos. La prueba nueva recorre propuesta del asistente → confirmación persistente → Calendar simulado → Meet simulado, y comprueba una sola creación ante confirmación repetida.
- PostgreSQL/pgvector real: 26 pruebas de biblioteca híbrida, cero fallos. Proveedores Storage/embeddings simulados en esa batería; complementada por la ingesta real de Drive descrita arriba.
- Frontend: 186 pruebas en 23 archivos, cero fallos; compilación Vite correcta, con aviso de tamaño de bundle.
- Node: 42 pruebas, cero fallos, incluidas las nuevas sobre esquema Gemini, expresión Drive y preservación de configuración al preparar parches.
- n8n multiagente con proveedor simulado: seis escenarios nativos y cuatro escenarios de comparación anterior, todos correctos. No se presentan como resultados Gemini.
- Gmail nativo con adaptador simulado: aceptación única, resultado ambiguo sin reenvío, destinatario cambiado sin envío y cola vacía.
- MCP nativo desechable: conexión, herramienta permitida, credenciales, errores, timeout y contenido externo no confiable. Servidor personal conserva sus siete herramientas independientes.

Las pruebas del backend cubren obligaciones, estrategia, pagos sintéticos, permisos de plan, simulaciones, recordatorios, Centinela y aislamiento. No se ejecutaron pagos reales, mensajes Telegram reales ni pruebas visuales de las cinco secciones React en este bloque. Los resultados anteriores del repositorio no se presentan como ejecuciones nuevas.

## Gmail, Plus y Mercado Pago

Antes de cualquier habilitación se inspeccionó PostgreSQL: el outbox estaba vacío y existía una fuente Drive aprobada. Tras la ingesta se generaron únicamente sus métricas operativas; el despachador Gmail continúa apagado. No se envió correo histórico ni se reclamó masivamente el outbox.

Se revisó `refreshAuthorizedPayment`: todavía condiciona la renovación a que avance `nextPaymentAt` respecto al valor local. Una consulta anterior que ya haya adelantado esa frontera puede impedir emitir la comunicación de renovación. **No se cambió esa regla sin evidencia suficiente para distinguir el primer cobro, una renovación y eventos atrasados.** Faltan contratos/escenarios confirmados de Mercado Pago, deduplicación durable del cobro y su validación. Las pruebas actuales de activación, cobro rechazado y renovación con frontera adelantada son simuladas. No se declara exhaustiva ni operativa la integración comercial.

## Calendar, activación y pendientes

Se conserva el evento privado/Meet autorizado del bloque anterior; no se creó otro. Disponibilidad, expiración, autorización, conflictos, doble confirmación, IDs externos y recuperación se verifican con gateway simulado. Se conserva `America/Bogota` y duración de treinta minutos. Falta un recorrido de soporte con Gemini consistentemente válido y, antes de operar, notificación Gmail real controlada.

No hay una integración general declarada lista para activación continua. Para habilitar cada una se requieren:

1. Resolver los fallos intermitentes de contrato/referencias del modelo y las delegaciones de respaldo innecesarias. Se observó también un error de emparejamiento de items de n8n en una ruta de parser fallido; no está certificado su manejo en todos los casos.
2. Fijar una estrategia de cuota y repetir muestras suficientes, conservando fallos y respuestas parciales; instrumentar los tiempos y llamadas aún desconocidos.
3. Verificar polling Drive y consulta privada desde la interfaz autenticada.
4. Verificar Gmail y Sheets desde eventos persistentes hasta Google real, con destinatarios/recursos acotados y revisión del backlog inmediatamente anterior.
5. Validar eventos comerciales de Mercado Pago antes de certificar renovación/cancelación.
6. Configurar un único propietario y token MCP productivo si se autoriza; mantener el cliente externo apagado hasta definir servidor definitivo.
7. Completar el smoke visual React/Telegram sin operaciones financieras reales.

## Respaldos y migración

Se conservaron los mecanismos de exportación/restauración existentes y la imagen n8n fijada por digest. Los respaldos de workflows anteriores a los cambios de este bloque están cifrados en `backups/migration/block5-20261109/`; la clave está separada en `backups/migration-keys/`. Ambos quedan fuera de Git. La imagen anterior del backend se conserva como `ceroa-backend:pre-block5-20261109`.

La exportación final incluye revisión exacta, configuración privada y volumen n8n, versiones publicadas, claves internas y OAuth. El ensayo de restauración debe realizarse con `--offline-test`, volumen temporal y sin planificadores; su resultado se registra en el cierre del bloque. Descifrar credenciales no acredita vigencia OAuth ni conectividad tras un traslado. Las lecturas actuales de Google pertenecen al equipo de origen.

No se migró definitivamente ni se arrancó un segundo entorno contra Supabase/Google. Los contenedores conversacionales de prueba usan H2, herramientas de prueba y puerto interno de una red independiente; solo Gemini recibe textos sintéticos. Los ensayos PostgreSQL usan una base desechable independiente. El cliente/servidor MCP de prueba no tiene acceso a finanzas reales.

Rollback: restaurar las definiciones respaldadas y publicar únicamente los IDs previamente publicados; conservar inactivos los ocho conectores. Recrear el backend con la imagen anterior y los mismos archivos Compose/variables privadas. No restaurar credenciales anteriores de Gemini que ya estaban revocadas. Los efectos externos del PDF sintético no se deshacen restaurando workflows; el historial de pruebas permanece trazable.
