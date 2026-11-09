# CEROA — INFORME DE CIERRE TÉCNICO Y MATRIZ E2E CONSOLIDADA

Nota de versionado: este informe conserva el corte histórico del Bloque 9. La autorización y las verificaciones de integración posteriores se documentan en [Bloque 10](BLOQUE-10-INTEGRACION-2026-11-09.md).

Fecha de corte: 9 de noviembre de 2026, America/Bogota. Rama revisada: `fix/bloque-8-security-consolidation`, HEAD `c5e3322`. Cierre documental y comprobaciones de lectura; sin cambios funcionales, push, merge, despliegue V31 ni activación de conectores.

## A. Resumen ejecutivo

La conciliación recupera 63 IDs únicos: auditoría original **40 APROBADA, 6 PARCIAL, 8 FALLIDA, 2 BLOQUEADA, 7 NO EJECUTADA**; Bloque 7 **54 APROBADA, 0 PARCIAL, 0 FALLIDA, 2 BLOQUEADA, 7 NO EJECUTADA**. No son 63 pruebas recién aprobadas en Bloque 8/9. Se conserva el orquestador con Financiero, RAG y Soporte, las fronteras de propietario y las integraciones con autorización. El desarrollo tiene correcciones y regresiones verificables; las pruebas reales externas y la operación continua tienen pendientes propios.

No se detectó un bloqueo técnico para integrar la rama con el main observado: main es ancestro directo, no hay divergencia y los seis commits están en orden. Queda la autorización explícita para integrar, junto con revisar y versionar los entregables documentales de este cierre. Esto no autoriza despliegue: V31 exige respaldo financiero independiente, validación de migraciones y actualización coordinada.

Fuentes recibidas: `CEROA_Matriz_E2E_63_Escenarios.xlsx` y `CEROA_Trazabilidad_63_E2E_DEF_Bloques_7_8.md` (conservadas fuera de Git; hashes en reconciliation.json). Evidencias versionadas: [informe B8](BLOQUE-8-CONSOLIDACION-2026-11-09.md), [resultados automatizados](benchmarks/block8/automated-results.json), [operativos](benchmarks/block8/operational-results.json), [Chromium](benchmarks/block8/browser-results.json). Los hashes de las fuentes y las comprobaciones quedan en [reconciliation.json](benchmarks/block9/reconciliation.json).

El archivo nombrado `CEROA_Matriz_Original_63_E2E_y_Bloque7.tsv` no está disponible con ese nombre. El XLSX recibido tiene las diez columnas originales/ampliadas, incluido esperado, observado y referencias; se leyó sin modificar y se cotejaron sus 63 IDs y estados con el Markdown. No se inventó ni recreó el TSV como si fuera el original. Las capturas y JSON históricos citados no están accesibles en este checkout; se conservan sus nombres/reqId como **evidencia histórica referenciada, artefacto no accesible**. La concordancia entre dos fuentes recibidas no sustituye la inspección de esos originales.

## B. Matriz definitiva de 63 escenarios

La columna posterior distingue regresión equivalente, cobertura parcial y recorridos aislados. Ningún caso completo del entorno original se reejecutó en Bloque 9. La aprobación histórica sigue siendo histórica, incluso cuando hay una regresión automatizada equivalente. Las siete operaciones sin ejecutar siguen requiriendo autorización en el entorno original; sus pruebas sintéticas son complementarias. 11.3 está bloqueada por propietario/fixture y 11.5 por configuración: no se confunden ambos motivos.

Versión tabular: [matriz consolidada TSV](CEROA_MATRIZ_E2E_CONSOLIDADA_63.tsv). Las referencias originales de cada fila se preservan a continuación. Las clases Java citadas están bajo `backend/src/test/java/com/ceroa/{service,config}`; componentes bajo `frontend/src/components`. Los resultados posteriores corresponden al Bloque 8 salvo la nueva lectura n8n marcada Bloque 9.

| ID | Módulo | Estado original | Estado Bloque 7 | Verificación Bloque 8 | Evidencia | Estado actual |
|---|---|---|---|---|---|---|
| 1.1 | Sistema inicial | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: 01_login_public.png, qa_phase1_report.json; B7: `revalida_bloque7_phaseA.json`; posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 1.2 | Sistema inicial | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: 01_login_public.png, App.tsx; B7: `revalida_bloque7_phaseA.json`; posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 1.3 | Sistema inicial | PARCIAL | APROBADA | Regresión automatizada parcial | Original: qa_phase1_report.json (DEF-06, DEF-08); B7: `revalida_bloque7_phaseA.json` (`duplicateKeyErrors: []`, `aborted: []`); posterior: Chromium: warnings React vacíos y un main; deduplicación de red no medida | APROBADA histórica B7; ver cobertura posterior delimitada |
| 2.1 | Autenticación y sesión | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: qa_phase1_report.json; B7: `qa_phase1_report.json`; posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 2.2 | Autenticación y sesión | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: qa_phase1_report.json; B7: Reválida control `2.2-A` (`revalida_bloque7_phaseA.json`); posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 2.3 | Autenticación y sesión | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: qa_phase1_report.json; B7: `SecurityConfigTest`, `qa_phase1_report.json`; posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 2.4 | Autenticación y sesión | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: 02_dashboard_desktop.png, qa_phase1_report.json; B7: Reválida control `2.3-A` (`revalida_bloque7_phaseA.json`); posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 2.5 | Autenticación y sesión | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: 02_dashboard_desktop.png, 07_profile_desktop.png; B7: `02_dashboard_desktop.png`, `07_profile_desktop.png`; posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 3.1 | Navegación y estructura | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: 02_dashboard_desktop.png a 08_subscription_settled.png; B7: `revalida_bloque7_phaseA.json`; posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 3.2 | Navegación secundaria | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: 16_sentinel_panel.png, 17_notifications_drawer.png, qa_phase1_supplement.json; B7: `revalida_bloque7_phaseA.json`; posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 4.1 | Inicio (Dashboard) | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: 02_dashboard_desktop.png, qa_phase1_report.json; B7: `01_dashboard_overdue_fixed.png`, `revalida_bloque7_phaseA.json`; posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 4.2 | Inicio (Dashboard) | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: qa_phase1_report.json, DashboardView.tsx; B7: `qa_phase1_report.json`; posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 5.1 | Deudas | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: 03_debts_desktop.png, qa_phase1_report.json; B7: Reválida control `5.1-A` (`revalida_bloque7_phaseA.json`); posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 5.2 | Deudas | APROBADA | APROBADA | Regresión automatizada equivalente parcial | Original: 04_debt_detail_settled.png, qa_phase1_supplement.json; B7: `revalida_bloque7_phaseA.json` (`paymentStatusesConsistentWithDebts: true`); posterior: PaymentStatusLifecycleTest, PaymentIntegrationTest; historial API Chromium | APROBADA histórica B7; ver cobertura posterior delimitada |
| 5.3 | Deudas | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: qa_phase1_report.json; B7: `qa_phase1_report.json`; posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 5.4 | Deudas | NO EJECUTADA | NO EJECUTADA | Recorrido aislado complementario | Original: NO EJECUTADA — REQUIERE AUTORIZACIÓN; B7: NO EJECUTADA — REQUIERE AUTORIZACIÓN; posterior: block8.spec.ts recorridos 1/2, DebtIntegrationTest, PaymentIntegrationTest | NO EJECUTADA; requiere autorización para entorno original |
| 6.1 | Estrategia de Pago | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: 05_strategy_settled.png, qa_phase1_supplement.json; B7: `revalida_bloque7_phaseA.json`; posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 6.2 | Estrategia de Pago | PARCIAL | APROBADA | Regresión automatizada equivalente | Original: 05_strategy_desktop.png vs 05_strategy_settled.png (DEF-04); B7: `02_strategy_no_plan_cero_flash.png`, `revalida_bloque7_phaseA.json`; posterior: StrategicPlanView.test.tsx DEF-04 | APROBADA histórica B7; ver cobertura posterior delimitada |
| 6.3 | Estrategia de Pago | NO EJECUTADA | NO EJECUTADA | Recorrido aislado complementario | Original: NO EJECUTADA — REQUIERE AUTORIZACIÓN; B7: NO EJECUTADA — REQUIERE AUTORIZACIÓN; posterior: block8.spec.ts recorrido 3, StrategyIntegrationTest | NO EJECUTADA; requiere autorización para entorno original |
| 7.1 | Simular | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: 06_simulation_desktop.png, qa_phase1_report.json; B7: `qa_phase1_report.json`; posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 7.2 | Simular | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: 06_simulation_settled.png, SimulationService.java; B7: Reválida control `7.2-A` (`revalida_bloque7_phaseA.json`); posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 8.1 | Perfil y suscripciones | APROBADA | APROBADA | Regresión automatizada parcial | Original: 07_profile_desktop.png, 08_subscription_settled.png, qa_phase1_supplement.json; B7: `revalida_bloque7_phaseA.json` (`mainTagsPerView: 1`); posterior: Un main en Chromium; SubscriptionView.test.tsx; ver DEF-08 | APROBADA histórica B7; ver cobertura posterior delimitada |
| 8.2 | Perfil y suscripciones | NO EJECUTADA | NO EJECUTADA | Integración aislada complementaria | Original: NO EJECUTADA — REQUIERE AUTORIZACIÓN; B7: NO EJECUTADA — REQUIERE AUTORIZACIÓN; posterior: ProfileIntegrationTest, profile-api.json; SubscriptionPersistenceIntegrationTest; proveedor simulado | NO EJECUTADA; requiere autorización para entorno original |
| 9.1-A | Multiagente (Financiero / Determinista) | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: qa_phase2_results.json (reqId: 2e09d6bd); B7: `revalida_bloque7_phaseB.json` (`DETERMINISTIC`); posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 9.1-B | Multiagente (Financiero / Determinista) | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: qa_phase2_results.json (reqId: 5cf5e97a); B7: `qa_phase2_results.json` (`DETERMINISTIC`); posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 9.1-C | Multiagente (Financiero / Determinista) | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: qa_phase2_results.json (reqId: 80d2b861); B7: `qa_phase2_results.json` (`DETERMINISTIC`); posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 9.1-D | Multiagente (Agente Financiero) | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: qa_phase2_results.json (reqId: 8950106d); B7: `qa_phase2_results.json` (`reqId: 8950106d`); posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 9.1-E | Multiagente (Agente Financiero) | APROBADA | APROBADA | Regresión automatizada parcial | Original: qa_phase2_results.json (reqId: d160056e, DEF-09); B7: `AssistantAnalysisServiceTest`, traza `reqId: 8b1c775b`; posterior: simpleUpcomingAndStrategyAvoidTheWebhook; recorrido 3 determinista, no delegación nueva | APROBADA histórica B7; ver cobertura posterior delimitada |
| 9.2-A | Multiagente (Agente Financiero) | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: qa_phase2_results.json (reqId: d93d38fd); B7: `revalida_bloque7_phaseB_supplement.json` (`reqId: db5e2953`); posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 9.2-B | Multiagente (Agente Financiero) | FALLIDA | APROBADA | Regresión automatizada equivalente parcial | Original: qa_phase2_results.json (reqId: 176b27bb, DEF-03); B7: `revalida_bloque7_phaseB.json` (`reqId: 11f89535`, `COMPLETE`); posterior: AgentRuntimeTest; financeCannotActivateSupportFallbackAndFailedParserCannotProduceAnAcceptedBalance | APROBADA histórica B7; ver cobertura posterior delimitada |
| 9.3-A | Multiagente (Agente RAG) | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: qa_phase2_results.json (reqId: e59e6b81); B7: Traza `reqId: caa607ba` (`COMPLETE`, `execId: 5611`); posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 9.3-B | Multiagente (Agente RAG) | PARCIAL | APROBADA | Regresión automatizada equivalente parcial | Original: qa_phase2_results.json (reqId: da220bf4, DEF-09); B7: Traza `reqId: 8e1cf0af` (`COMPLETE`, `execId: 5618`, `hasArtifact: false`); posterior: AssistantAnalysisServiceTest normaliza artefactos; no nueva conversación Gemini | APROBADA histórica B7; ver cobertura posterior delimitada |
| 9.3-C | Multiagente (Agente RAG) | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: qa_phase2_results.json (reqId: bd13a379); B7: `qa_phase2_results.json` (`reqId: bd13a379`); posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 9.3-D | Multiagente (Agente RAG) | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: qa_phase2_results.json (reqId: c2159b57); B7: `qa_phase2_results.json` (`reqId: c2159b57`); posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 9.4-A | Multiagente (Agente de Soporte) | FALLIDA | APROBADA | Regresión automatizada equivalente de routing | Original: qa_phase2_results.json (reqId: f816ff0a, DEF-01); B7: `revalida_bloque7_phaseB_supplement.json` (`reqId: e5d23124`, `SUPPORT`); posterior: AgentContractsTest.routesOperationalSupportFollowUpAndCompositeDocumentFinancialQuestions; no nueva conversación real | APROBADA histórica B7; ver cobertura posterior delimitada |
| 9.4-B | Multiagente (Agente de Soporte) | PARCIAL | APROBADA | Regresión automatizada equivalente de routing | Original: qa_phase2_results.json (reqId: 3a0489f3, DEF-01); B7: `revalida_bloque7_phaseB_supplement.json` (`reqId: 8618f795`, `SUPPORT`); posterior: AgentContractsTest.routesOperationalSupportFollowUpAndCompositeDocumentFinancialQuestions; no nueva conversación real | APROBADA histórica B7; ver cobertura posterior delimitada |
| 9.4-C | Multiagente (Agente de Soporte) | FALLIDA | APROBADA | Regresión automatizada equivalente de routing | Original: qa_phase2_results.json (reqId: a7bf3c41, DEF-01); B7: `verify_94c_97b.mjs` (`reqId: a4be8511`, `SUPPORT`); posterior: AgentContractsTest.routesOperationalSupportFollowUpAndCompositeDocumentFinancialQuestions; no nueva conversación real | APROBADA histórica B7; ver cobertura posterior delimitada |
| 9.4-D | Multiagente (Agente de Soporte) | FALLIDA | APROBADA | Regresión automatizada equivalente parcial | Original: qa_phase2_results.json (reqId: b9bfcf9f, DEF-03); B7: `revalida_bloque7_phaseB_supplement.json` (`reqId: 58c49453`, `SUPPORT`); posterior: advisoryInformationDoesNotRequireCalendar; sin interacciones Calendar | APROBADA histórica B7; ver cobertura posterior delimitada |
| 9.5-A | Multiagente (Consulta compuesta) | APROBADA | APROBADA | Regresión automatizada equivalente parcial | Original: qa_phase2_results.json (reqId: f56423ce); B7: `revalida_bloque7_phaseB.json` (`reqId: d6b0bd08`, `COMPOSITE`); posterior: AgentContractsTest: roles compuestos; AssistantAnalysisServiceTest: normalización | APROBADA histórica B7; ver cobertura posterior delimitada |
| 9.5-B | Multiagente (Consulta compuesta) | PARCIAL | APROBADA | Regresión automatizada equivalente de routing | Original: qa_phase2_results.json (reqId: 915e721d, DEF-02); B7: `revalida_bloque7_phaseB.json` (`reqId: f0f1e565`, `FINANCIAL` + `RAG`); posterior: AgentContractsTest.routesOperationalSupportFollowUpAndCompositeDocumentFinancialQuestions; no nueva conversación real | APROBADA histórica B7; ver cobertura posterior delimitada |
| 9.6-A | Multiagente (Fuera de dominio) | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: qa_phase2_results.json (reqId: ca6e9e06); B7: Reválida control `9.6-A` (`reqId: 9176296d`, `INSUFFICIENT`, `0` delegaciones); posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 9.7-A | Multiagente (Contexto conversacional) | FALLIDA | APROBADA | Regresión automatizada equivalente de routing | Original: qa_phase2_results.json (reqId: 456f7fea, DEF-01); B7: `revalida_bloque7_phaseB.json` (`reqId: 05c5c750`, `FINANCIAL`); posterior: AgentContractsTest.routesOperationalSupportFollowUpAndCompositeDocumentFinancialQuestions; no nueva conversación real | APROBADA histórica B7; ver cobertura posterior delimitada |
| 9.7-B | Multiagente (Contexto conversacional) | FALLIDA | APROBADA | Regresión automatizada equivalente de routing | Original: qa_phase2_results.json (reqId: e3e69758, DEF-01); B7: `revalida_bloque7_phaseB.json` (`PARTIAL` aclaración) y `verify_94c_97b.mjs` (`COMPLETE`); posterior: AgentContractsTest.routesOperationalSupportFollowUpAndCompositeDocumentFinancialQuestions; no nueva conversación real | APROBADA histórica B7; ver cobertura posterior delimitada |
| 9.7-C | Multiagente (Contexto conversacional) | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: qa_phase2_results.json (reqId: 56d05ef6); B7: `qa_phase2_results.json` (`reqId: 56d05ef6`); posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 10.1 | RAG y documentos | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: 09_assistant_library_settled.png, 10_assistant_library_review_settled.png, qa_phase1_supplement.json; B7: `revalida_bloque7_phaseA.json`; posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 10.2 | RAG y documentos | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: qa_phase1_supplement.json; B7: `qa_phase1_supplement.json`; posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 10.3 | RAG y documentos | PARCIAL | APROBADA | Regresión automatizada equivalente | Original: 09_assistant_library_settled.png (DEF-07); B7: `03_library_inline_actions.png`, `revalida_bloque7_phaseA.json`; posterior: DocumentLibraryPanel.test.tsx DEF-07 | APROBADA histórica B7; ver cobertura posterior delimitada |
| 10.4 | RAG y documentos | FALLIDA | APROBADA | Regresión automatizada equivalente parcial | Original: 15_assistant_multiagent_conversation.png, qa_phase2_results.json (reqId: 36576443, DEF-03); B7: `04_assistant_revalida_complete.png`, `revalida_bloque7_phaseB.json` (`reqId: 3ebdc9ef`); posterior: HybridDocumentIntegrationTest, AgentRuntimeTest, grounding; no mismo documento real | APROBADA histórica B7; ver cobertura posterior delimitada |
| 10.5 | RAG y documentos | NO EJECUTADA | NO EJECUTADA | Integración aislada complementaria | Original: NO EJECUTADA — REQUIERE AUTORIZACIÓN; B7: NO EJECUTADA — REQUIERE AUTORIZACIÓN; posterior: HybridDocumentIntegrationTest: DOCX/PDF/XLSX, versionado/reproceso/borrado, almacenamiento simulado | NO EJECUTADA; requiere autorización para entorno original |
| 11.1 | Conectores externos | APROBADA | APROBADA | Inventario de lectura revalidado en Bloque 9 | Original: Inspección de UI y configuración; B7: Verificado en `ceroa-n8n` y configuración; posterior: block9/n8n-runtime.json: ocho generales inactivos/sin publicación | APROBADA histórica B7; ver cobertura posterior delimitada |
| 11.2 | Google Workspace (Gmail) | NO EJECUTADA | NO EJECUTADA | Integración aislada complementaria | Original: NO EJECUTADA — REQUIERE AUTORIZACIÓN; B7: NO EJECUTADA — REQUIERE AUTORIZACIÓN; posterior: WorkspaceEventIntegrationTest + fixture nativo Workspace HTTP simulado; no Gmail real | NO EJECUTADA; requiere autorización para entorno original |
| 11.3 | Google Workspace (Drive) | BLOQUEADA | BLOQUEADA | Bloqueo histórico por propietario/fixture | Original: qa_phase1_supplement.json, BLOQUE-6-ESTABILIZACION-2026-11-09.md; B7: Aislamiento multi-tenant correcto (`owner_id` distinto de `demo@ceroa.local`); posterior: Documento de otro owner; aislamiento esperado, no defecto ni bloqueo por configuración | BLOQUEADA por propietario/fixture |
| 11.4 | Google Workspace (Sheets) | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: Inspección de arquitectura; B7: Inspección de arquitectura y flags; posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 11.5 | Google Workspace (Calendar) | BLOQUEADA | BLOQUEADA | Bloqueo histórico por configuración | Original: qa_phase1_report.json; B7: Devuelve `HTTP 503 WORKSPACE_UNAVAILABLE` porque `WORKSPACE_CALENDAR_ENABLED=false`; posterior: WORKSPACE_CALENDAR_ENABLED=false; integración simulada no habilita proveedor | BLOQUEADA por configuración |
| 11.6 | Google Workspace (Calendar) | NO EJECUTADA | NO EJECUTADA | Integración aislada complementaria | Original: NO EJECUTADA — REQUIERE AUTORIZACIÓN; B7: NO EJECUTADA — REQUIERE AUTORIZACIÓN; posterior: SupportBookingIntegrationTest: propuesta/confirmación/conflicto; Calendar simulado, no equivalencia completa de todas las mutaciones reales | NO EJECUTADA; requiere autorización para entorno original |
| 11.7 | MCP | APROBADA | APROBADA | Regresión automatizada equivalente parcial | Original: qa_phase1_report.json; B7: `SecurityConfigTest`, `qa_phase1_report.json`; posterior: McpIntegrationTest y fronteras de credenciales; no nueva navegación real | APROBADA histórica B7; ver cobertura posterior delimitada |
| 11.8 | MCP | NO EJECUTADA | NO EJECUTADA | Integración aislada complementaria | Original: NO EJECUTADA — REQUIERE AUTORIZACIÓN; B7: NO EJECUTADA — REQUIERE AUTORIZACIÓN; posterior: McpIntegrationTest: tokens/scopes/revocación/vencimiento sintéticos | NO EJECUTADA; requiere autorización para entorno original |
| 12.1 | Manejo de errores y estados vacíos | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: 10_assistant_library_review_settled.png, 17_notifications_drawer.png; B7: `10_assistant_library_review_settled.png`, `17_notifications_drawer.png`; posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 12.2 | Manejo de errores | FALLIDA | APROBADA | Regresión automatizada equivalente | Original: qa_phase1_report.json (DEF-05); B7: `revalida_bloque7_phaseA.json` (`HTTP 404`, `code: "NOT_FOUND"`); posterior: SecurityConfigTest: ruta autenticada inexistente → 404 NOT_FOUND | APROBADA histórica B7; ver cobertura posterior delimitada |
| 13.1 | Rendimiento | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: Sección F, qa_phase1_report.json, qa_phase2_results.json; B7: `revalida_bloque7_phaseA.json`, `revalida_bloque7_phaseB.json`; posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 14.1 | Diseño responsive | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: 02_dashboard_desktop.png a 08_subscription_settled.png; B7: `01_dashboard_overdue_fixed.png` a `04_assistant_revalida_complete.png`; posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 14.2 | Diseño responsive | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: 11_tablet_dashboard.png, qa_phase1_report.json; B7: `11_tablet_dashboard.png`; posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |
| 14.3 | Diseño responsive | APROBADA | APROBADA | Evidencia histórica válida del Bloque 7 | Original: 12_mobile_dashboard.png, 13_mobile_debts.png, 14_mobile_assistant.png; B7: `12_mobile_dashboard.png` a `14_mobile_assistant.png`; posterior: Sin reejecución específica posterior acreditada para el escenario completo | APROBADA histórica B7; pendiente nueva ejecución completa |

## C. Trazabilidad DEF-01 a DEF-09

La causa y corrección se contrastaron con el diff de `337802e` y el código vigente. Las referencias B7 son las de la fuente recibida, no nuevas capturas. Todas las correcciones base pertenecen a `337802e`; las ampliaciones de grounding a `bfb04b6` y las verificaciones adicionales a `ec6d4f5`. Una clase por sí sola no se considera cierre: se indica el comportamiento que realmente comprueba.

### DEF-01 — 9.4-A, 9.4-B, 9.4-C, 9.7-A, 9.7-B

- **Problema:** Soporte mal clasificado y pérdida de contexto en elipsis/segunda opción.
- **Causa:** Patrones operativos incompletos; routingQuestion solo heredaba contexto con determinados demostrativos. La ambigüedad podía producir UNKNOWN o permisos de delegación incorrectos.
- **Corrección:** Patrones de operaciones/planes, herencia contextual acotada y aclaración de segunda opción cuando falta antecedente suficiente.
- **Archivos de implementación:** AgentContracts.java, AssistantService.java; integrations/n8n/multiagent-workflows.mjs y multiagent-query.json. Los archivos de pruebas homónimos documentan las regresiones indicadas.
- **Pruebas y cobertura:** AgentContractsTest.routesOperationalSupportFollowUpAndCompositeDocumentFinancialQuestions: aserciones literales para registro, simulador, planes, vencimiento y segunda opción; AssistantIntegrationTest.followupKeepsTheRequestedYearWithoutTreatingOldAnswersAsFreshEvidence.
- **Reválida B7:** 9.4-A: `revalida_bloque7_phaseB_supplement.json` (`reqId: e5d23124`, `SUPPORT`); 9.4-B: `revalida_bloque7_phaseB_supplement.json` (`reqId: 8618f795`, `SUPPORT`); 9.4-C: `verify_94c_97b.mjs` (`reqId: a4be8511`, `SUPPORT`); 9.7-A: `revalida_bloque7_phaseB.json` (`reqId: 05c5c750`, `FINANCIAL`); 9.7-B: `revalida_bloque7_phaseB.json` (`PARTIAL` aclaración) y `verify_94c_97b.mjs` (`COMPLETE`). Referencias históricas sin artefactos originales accesibles.
- **B8 y estado comprobable:** corrección conservada y regresiones del comportamiento descrito aprobadas según los resultados B8 inspeccionados. No nueva ejecución real completa de estos escenarios en B9.
- **Riesgo residual:** No nueva conversación con Gemini real; la aclaración no equivale a inferir una opción sin antecedente.

### DEF-02 — 9.5-B

- **Problema:** La consulta de vencimientos y tasa en extracto solo habilitaba RAG.
- **Causa:** La señal documental excluía FINANCIAL incluso en una intención compuesta.
- **Corrección:** Clasificar COMPOSITE y conceder FINANCIAL + RAG cuando corresponde, conservando el aislamiento de documento seleccionado.
- **Archivos de implementación:** AgentContracts.java, AssistantService.java; integrations/n8n/multiagent-workflows.mjs y multiagent-query.json. Los archivos de pruebas homónimos documentan las regresiones indicadas.
- **Pruebas y cobertura:** AgentContractsTest.routesOperationalSupportFollowUpAndCompositeDocumentFinancialQuestions comprueba exactamente la consulta 9.5-B, roles e intención; budgetsAreBoundedAndSelectedDocumentsCannotAcquireFinanceTools comprueba la restricción de documento seleccionado.
- **Reválida B7:** 9.5-B: `revalida_bloque7_phaseB.json` (`reqId: f0f1e565`, `FINANCIAL` + `RAG`). Referencias históricas sin artefactos originales accesibles.
- **B8 y estado comprobable:** corrección conservada y regresiones del comportamiento descrito aprobadas según los resultados B8 inspeccionados. No nueva ejecución real completa de estos escenarios en B9.
- **Riesgo residual:** Contrato equivalente de routing; no certifica una nueva respuesta completa del proveedor real.

### DEF-03 — 9.2-B, 9.4-D, 10.4

- **Problema:** PARSER_ERROR en Financiero/RAG, fallo de disponibilidad en asesoría y texto de cobertura documental improcedente.
- **Causa:** Contrato de salida/serialización de especialistas y tratamiento de evidencia/errores; dependencia de Calendar en información de asesoría. PROVIDER_UNAVAILABLE histórico no demuestra por sí solo una causa permanente del proveedor.
- **Corrección:** Serialización JSON del parser en especialistas, grounding previo a delegación y validación de resultados; información de asesoría desacoplada de disponibilidad; mensajes y cobertura preservados.
- **Archivos de implementación:** AgentRuntime.java, AssistantAnalysisService.java, AssistantService.java, SupportBookingService.java, WorkspaceCalendarGateway.java; financial-agent.json, knowledge-agent.json, support-agent.json, multiagent-workflows.mjs; FinancialClaimGrounding.java (Bloque 8). Los archivos de pruebas homónimos documentan las regresiones indicadas.
- **Pruebas y cobertura:** AssistantIntegrationTest.financeCannotActivateSupportFallbackAndFailedParserCannotProduceAnAcceptedBalance y advisoryInformationDoesNotRequireCalendar; AgentRuntimeTest.failuresCannotBeReportedAsFunctionalSuccess, unknownEvidenceAndCrossRequestTokensAreRejected, partialCoverageCannotBecomeComplete; FinancialClaimGroundingTest (11 casos).
- **Reválida B7:** 9.2-B: `revalida_bloque7_phaseB.json` (`reqId: 11f89535`, `COMPLETE`); 9.4-D: `revalida_bloque7_phaseB_supplement.json` (`reqId: 58c49453`, `SUPPORT`); 10.4: `04_assistant_revalida_complete.png`, `revalida_bloque7_phaseB.json` (`reqId: 3ebdc9ef`). Referencias históricas sin artefactos originales accesibles.
- **B8 y estado comprobable:** regresiones de grounding/parser/aislamiento aprobadas; disponibilidad externa no certificada. No nueva ejecución real completa de estos escenarios en B9.
- **Riesgo residual:** No se garantiza disponibilidad futura de Gemini/Calendar; grounding lexical conservador. La prueba nativa de dos casos no reproduce los tres E2E originales.

### DEF-04 — 6.2

- **Problema:** Usuario Plus veía Plan Cero y restricciones mientras cargaba Estrategia.
- **Causa:** data nulo se interpretaba como isPlus=false antes de terminar la carga.
- **Corrección:** Estado de carga neutro y controles de plan sujetos a datos disponibles.
- **Archivos de implementación:** frontend/src/components/plan/StrategicPlanView.tsx. Los archivos de pruebas homónimos documentan las regresiones indicadas.
- **Pruebas y cobertura:** StrategicPlanView.test.tsx: DEF-04 usa carga pendiente y comprueba ausencia de etiqueta/restricciones Cero.
- **Reválida B7:** 6.2: `02_strategy_no_plan_cero_flash.png`, `revalida_bloque7_phaseA.json`. Referencias históricas sin artefactos originales accesibles.
- **B8 y estado comprobable:** corrección conservada y regresiones del comportamiento descrito aprobadas según los resultados B8 inspeccionados. No nueva ejecución real completa de estos escenarios en B9.
- **Riesgo residual:** Regresión de componente; no nueva captura visual completa en todos los tamaños.

### DEF-05 — 12.2

- **Problema:** Ruta API inexistente devolvía 500.
- **Causa:** NoResourceFoundException caía en el handler genérico de Exception.
- **Corrección:** Handler específico con HTTP 404 y código NOT_FOUND.
- **Archivos de implementación:** backend/src/main/java/com/ceroa/api/GlobalExceptionHandler.java. Los archivos de pruebas homónimos documentan las regresiones indicadas.
- **Pruebas y cobertura:** SecurityConfigTest.returnsNotFoundInsteadOfInternalErrorForNonexistentAuthenticatedApiRoute comprueba petición autenticada, status y cuerpo.
- **Reválida B7:** 12.2: `revalida_bloque7_phaseA.json` (`HTTP 404`, `code: "NOT_FOUND"`). Referencias históricas sin artefactos originales accesibles.
- **B8 y estado comprobable:** corrección conservada y regresiones del comportamiento descrito aprobadas según los resultados B8 inspeccionados. No nueva ejecución real completa de estos escenarios en B9.
- **Riesgo residual:** Cobertura de ruta autenticada concreta, sin afirmar auditoría de todos los errores.

### DEF-06 — 1.3

- **Problema:** Claves React duplicadas entre AssistantFab y SentinelFab.
- **Causa:** Ambos hermanos usaban userProfile.id como key.
- **Corrección:** Prefijos assistant- y sentinel- por usuario.
- **Archivos de implementación:** frontend/src/App.tsx. Los archivos de pruebas homónimos documentan las regresiones indicadas.
- **Pruebas y cobertura:** frontend/e2e/block8.spec.ts: beforeEach/afterEach capturan warnings same key/unique key y exigen lista vacía en los tres recorridos Chromium.
- **Reválida B7:** 1.3: `revalida_bloque7_phaseA.json` (`duplicateKeyErrors: []`, `aborted: []`). Referencias históricas sin artefactos originales accesibles.
- **B8 y estado comprobable:** corrección conservada y regresiones del comportamiento descrito aprobadas según los resultados B8 inspeccionados. No nueva ejecución real completa de estos escenarios en B9.
- **Riesgo residual:** DashboardView.test.tsx cubre mora, no prueba directamente estas keys. Los tres recorridos no cubren toda navegación.

### DEF-07 — 10.3

- **Problema:** Controles documentales separados de su tarjeta y documentos indistinguibles.
- **Causa:** Tarjetas y lista de acciones se renderizaban en bloques diferentes.
- **Corrección:** Acciones y metadatos de versión/ID dentro de cada tarjeta.
- **Archivos de implementación:** frontend/src/components/assistant/DocumentLibraryPanel.tsx, DocumentReferences.tsx. Los archivos de pruebas homónimos documentan las regresiones indicadas.
- **Pruebas y cobertura:** DocumentLibraryPanel.test.tsx: DEF-07 comprueba asociación por tarjeta de acciones, versión e ID con documentos similares.
- **Reválida B7:** 10.3: `03_library_inline_actions.png`, `revalida_bloque7_phaseA.json`. Referencias históricas sin artefactos originales accesibles.
- **B8 y estado comprobable:** corrección conservada y regresiones del comportamiento descrito aprobadas según los resultados B8 inspeccionados. No nueva ejecución real completa de estos escenarios en B9.
- **Riesgo residual:** No nuevo recorrido visual completo de gestión documental productiva.

### DEF-08 — 1.3, 8.1

- **Problema:** Main anidados y solicitudes de suscripción abortadas al navegar.
- **Causa:** Vistas internas usaban main; recargas de datos para suscripción ACTIVE y lecturas simultáneas redundantes.
- **Corrección:** Contenedores div en vistas internas, refresh condicionado y mapa de promesas en vuelo para compartir lecturas.
- **Archivos de implementación:** frontend/src/components/subscription/SubscriptionView.tsx, frontend/src/services/subscriptionService.ts, frontend/src/components/monthly/MonthlyProgressView.tsx. Los archivos de pruebas homónimos documentan las regresiones indicadas.
- **Pruebas y cobertura:** block8.spec.ts exige un main al iniciar cada recorrido. SubscriptionView.test.tsx prueba precio/estado PENDING frente a ACTIVE; no demuestra conteo de red ni deduplicación concurrente.
- **Reválida B7:** 1.3: `revalida_bloque7_phaseA.json` (`duplicateKeyErrors: []`, `aborted: []`); 8.1: `revalida_bloque7_phaseA.json` (`mainTagsPerView: 1`). Referencias históricas sin artefactos originales accesibles.
- **B8 y estado comprobable:** corrección conservada, evidencia histórica aprobada y regresión parcial posterior; no cierre nuevo integral de red. No nueva ejecución real completa de estos escenarios en B9.
- **Riesgo residual:** Cobertura parcial posterior: no nueva medición de ERR_ABORTED en la navegación completa ni prueba específica de concurrencia del mapa inflight. Se conserva la reválida histórica con aborted: [].

### DEF-09 — 9.1-E, 9.3-B, 9.5-A, 5.2

- **Problema:** Artefactos de citas, escalas porcentuales/etiquetas repetidas y estado de mora inconsistente en respuestas de pagos.
- **Causa:** Sustitución de marcadores internos sin normalización suficiente; PaymentService devolvía estado almacenado frente al estado de sistema recalculado.
- **Corrección:** Normalizar citas/porcentajes/etiquetas y derivar estado de deuda al emitir respuesta de pago; UI muestra vencidos de forma explícita.
- **Archivos de implementación:** AssistantAnalysisService.java, AssistantService.java, PaymentService.java; frontend/src/components/dashboard/DashboardView.tsx. Los archivos de pruebas homónimos documentan las regresiones indicadas.
- **Pruebas y cobertura:** AssistantAnalysisServiceTest.stripsInlineDocumentCitationsNormalizesPercentScaleAndDeduplicatesStrategyLabels; PaymentStatusLifecycleTest.payingTheInstallmentLateUpdatesBothPaymentResponseAndDebtRead y deletingTheInstallmentRestoresOverdueStateAndOriginalDueDate; DashboardView.test.tsx caso En mora.
- **Reválida B7:** 9.1-E: `AssistantAnalysisServiceTest`, traza `reqId: 8b1c775b`; 9.3-B: Traza `reqId: 8e1cf0af` (`COMPLETE`, `execId: 5618`, `hasArtifact: false`); 9.5-A: `revalida_bloque7_phaseB.json` (`reqId: d6b0bd08`, `COMPOSITE`); 5.2: `revalida_bloque7_phaseA.json` (`paymentStatusesConsistentWithDebts: true`). Referencias históricas sin artefactos originales accesibles.
- **B8 y estado comprobable:** corrección conservada y regresiones del comportamiento descrito aprobadas según los resultados B8 inspeccionados. No nueva ejecución real completa de estos escenarios en B9.
- **Riesgo residual:** 9.1-E, 9.5-A y 5.2 eran APROBADA con observaciones relacionadas: no se reclasifican como fallidas. 9.1-E ahora tiene atajo determinista, por lo que no es una nueva ejecución de delegación FINANCIAL.

## D. Validaciones adicionales del Bloque 8

### Grounding financiero

Se inspeccionaron las aserciones de `FinancialClaimGroundingTest` y la implementación `FinancialClaimGrounding.java`/`AssistantAnalysisService.java`, además del registro de ejecución. Los 11 casos pasan en B8; la misma clase tenía 10 fallos sobre 337802e antes del arreglo, según la reproducción registrada.

| Requisito | Comportamiento comprobado |
|---|---|
| Campo financiero y moneda | amountCannotChangeFieldOrCurrency; pageCannotBecomeBalanceEvenThroughAnExplicitReference rechazan cambiar campo, moneda y página por saldo |
| Procedencia y periodo | ambiguousDocumentsAndPeriodsCannotGroundABareClaim rechaza ambigüedad y conserva comparación documental válida |
| Modalidad de tasa | rateCannotChangeModality rechaza modalidad distinta y conserva la válida |
| Referencias enmascaradas | maskedReferenceCannotBecomeAnAmountButRemainsDisplayable rechaza saldo inventado conservando identificación |
| Referencias inventadas | invalidReferenceIdsFailClosed, AgentRuntimeTest.unknownEvidenceAndCrossRequestTokensAreRejected |
| Aritmética compatible | arithmeticRejectsUnknownOrIncompatibleCurrenciesAndChainedBypasses rechaza moneda desconocida/incompatible y bypass encadenado; casos válidos conservados |
| Otro propietario | HybridDocumentIntegrationTest/AssistantIntegrationTest y tokens por solicitud de AgentRuntimeTest rechazan alcance ajeno |
| Cifras inventadas/inyección | fallbackOmitsMisattributedAndInventedValues, untrustedInstructionsDoNotBecomeEvidenceEvenWhenTheyMentionALabel |

Cobertura conservadora y lexical, no garantía universal de semántica financiera libre. No se alteró el grounding durante B9.

### Recibos durables y V31

`8aacb7e` crea `subscription_charges`: PK de cobro, FK a suscripción, frontera y observed_at; índice por suscripción. `PlusSubscriptionService` consulta recibo antes del proveedor y tras bloqueo, persiste recibo en la transacción, evita retroceder nextPaymentAt y coordina outbox. Bloqueo propietario → suscripción y PK protegen replays/duplicados; no se afirma una nueva prueba de estrés concurrente.

`SubscriptionPersistenceIntegrationTest` (4/4 registrados): activationRenewalAndOldChargeReplayKeepDurableProof verifica recibo persistido, frontera, usuario Plus y recuentos de activación/renovación, incluyendo replay antiguo sin nueva llamada al proveedor; staleBillingSnapshotCannotMoveTheBoundaryBackwards prueba eventos desordenados; rejectedChargeCannotGrantAccessOrCreateReceipt niega recibo/acceso; confirmedCancellationPreservesPaidAccessAndDoesNotReactivate conserva acceso pagado sin reactivar renovación. HTTP Mercado Pago interceptado; **sin cobros ni conciliación productiva verificados**. PostgresMigrationIntegrationTest registra aplicación de migraciones hasta V31. No se desplegó esta migración aquí.

### Operaciones persistentes y resultados reutilizados

| Operación | Evidencia B8 inspeccionada | Límite |
|---|---|---|
| CRUD de deudas y pagos | Chromium 3/3: alta/edición/recarga/borrado y pago 100.000 → 90.000; DebtIntegrationTest, PaymentIntegrationTest | Base desechable, no datos productivos |
| Estrategia | Cambio y recarga en Chromium, lectura fresca determinista; StrategyIntegrationTest | No cambia estado histórico 6.3 |
| Perfil | ProfileIntegrationTest, block8-profile-api.mjs y profile-api.json: persistencia/validación/owner | SMTP local; sin efectos externos reales |
| Documentos | HybridDocumentIntegrationTest: DOCX/PDF/XLSX, versión, indexación, reproceso y eliminación | PostgreSQL/pgvector real, almacenamiento/embeddings simulados |
| Suscripciones y eventos durables | SubscriptionPersistenceIntegrationTest, WorkspaceEventIntegrationTest | Mercado Pago/HTTP simulados; outbox no implica correo real entregado |
| Calendar | SupportBookingIntegrationTest: propuesta, confirmación idempotente, conflicto/ambigüedad | Proveedor simulado; no todas las mutaciones E2E reales |
| MCP | McpIntegrationTest: scopes, tokens, revocación, límites, aislamiento | Tokens sintéticos, no modificación de tokens existentes |

Resultados B8 reutilizados: javaClean 436 casos, 34 omitidos, 0 fallos/errores; PostgreSQL 69/69; hybrid 27/27; suplemento asistente 21/21; suscripción 4/4; nativo Spring+n8n 2/2 con modelo simulado. Estas suites **se solapan**, no sumarlas como escenarios únicos. Operativos registran Node 47/47, frontend 190/190, TypeScript y Vite aprobados. No se vuelven a ejecutar baterías ni operaciones destructivas sin cambio funcional. B9 ejecutó únicamente la regresión de perfil n8n (1/1), la conciliación de fuentes/IDs/DEF y las comprobaciones de Git y lectura n8n.

## E. Estado de arquitectura n8n

El orquestador coordina Financiero, RAG y Soporte; no se añaden agentes ni se reconstruyen workflows. RAG mantiene biblioteca versionada, búsqueda híbrida y evidencia delimitada por propietario. La lectura transaccional nueva de SQLite, mediante el script existente `audit-runtime-readonly.cjs`, confirma n8n **2.40.7**, los mismos 30 workflows y los mismos hashes/versiones/configuración que en B8. Evidencia nueva: [inventario B9](benchmarks/block9/n8n-runtime.json).

Se conservan **15 activos/publicados y 15 inactivos/sin publicar**, sin borradores divergentes, 6 webhooks, 22 credenciales y sin referencias a credenciales/subworkflows ausentes. El inventario incluye IDs y versiones de cada workflow publicado. Los ocho generales **Mail, Sheets, Drive, Calendar, MCP Server, MCP Backend, MCP Client y MCP Support** siguen inactivos/sin publicación; no se cambió su estado. Tener credenciales referenciadas no comprueba su vigencia con proveedores.

Las cuatro plantillas conversacionales requieren `block8-runtime-profile.json`: prevalidación Supabase, descripciones/serialización y ausencia deliberada de MCP público sin configurar. La comparación B8 confirmó correspondencia de nodos/conexiones al aplicar el perfil; la regresión puntual B9 1/1 confirma preservación de prompts/seguridad, tres delegaciones y ausencia de credenciales en el perfil. No aplicar plantillas portables crudas ni publicar masivamente.

## F. Estado de Git e integración

`git fetch origin` completado en B9. `origin/main = ed316f97f5068c0fc1150cc158087e85d1b26547`; `HEAD = c5e33229ad3bcb6e7c8e65dd9ec197f2878dc641`. Merge-base coincide con origin/main: **0 detrás / 6 delante**, sin cambios remotos posteriores observados ni conflicto estructural de merge. No se necesita un merge de prueba para demostrar esta relación de ancestro.

| Commit | Padre | Contenido verificado |
|---|---|---|
| 337802e | ed316f9 | Correcciones B7 |
| bfb04b6 | 337802e | Grounding contextual |
| 8aacb7e | bfb04b6 | Recibos durables y V31 |
| ec6d4f5 | 8aacb7e | Pruebas aisladas, conciliación y recuperación |
| bcb997c | ec6d4f5 | Informe/evidencias B8 |
| c5e3322 | bcb997c | Higiene final |

Diff origin/main...HEAD: **59 archivos, 6.056 adiciones y 113 eliminaciones**. `git diff --check` sin hallazgos. Al inicio solo estaban sin seguimiento el XLSX y el Markdown recibidos; no había cambios funcionales locales. Los entregables B9 se dejan como archivos para revisión, sin commit automático. Temporales de extracción/generación permanecen bajo tmp ignorado y no forman parte de la integración.

Se revisó la lista de archivos versionados: solo ejemplos de entorno y declaraciones de tipos, sin .env privado, SQLite ni tmp. El escaneo B8 por patrones de alta confianza registró cero hallazgos; B9 vuelve a comprobar los archivos nuevos de texto con esos tipos de patrones, sin revelar valores. Los artefactos recibidos incluyen referencias/nombres históricos de la cuenta demo, no una nueva exportación productiva. No se añaden respaldos, credenciales ni logs privados. Esto no constituye una auditoría exhaustiva de todo el historial ni certifica ausencia universal de secretos.

Integración propuesta tras autorización: revisar diff y entregables documentales; versionar únicamente archivos aprobados; refrescar origin y repetir ancestry/diff-check; si main sigue siendo ancestro, integrar conservando los commits con el mecanismo acordado. Si aparece divergencia, revisar conflictos y ejecutar solo regresiones afectadas antes de continuar. Push, merge y publicación remota pendientes de autorización explícita.

## G. Preparación segura del despliegue

Este es un procedimiento preparado, **no ejecutado**. El inventario de despliegue B8 comparó 394 clases de backend con 337802e y frontend equivalente normalizando LF/CRLF. Esa comparación es histórica; la versión de backend/frontend debe comprobarse otra vez al abrir la ventana. La nueva lectura B9 solo renueva el inventario n8n.

1. **Fijar versión y ventana.** Registrar commit/digest de backend y frontend actuales y candidatos, configuración efectiva sin valores secretos, versión n8n, versiones PostgreSQL/pgvector y estado Flyway. Verificar si V31 existe o está pendiente, sus checksums y ausencia de migraciones fallidas. No asumir que el esquema es V30 sin consultarlo. Suspender ordenadamente ingreso/consumo de eventos de cobro y escrituras durante la actualización; preservar la cola, no descartar eventos.
2. **Respaldo financiero independiente.** Obtener snapshot/backup consistente de PostgreSQL/Supabase con datos, esquema, historial Flyway y roles/permisos necesarios; cifrar fuera del repositorio, guardar clave separada, hash, fecha, retención y responsable. Validar restauración en una instancia aislada sin salida externa y registrar RPO/RTO acordados. Un backup n8n no satisface este paso.
3. **Respaldo n8n cifrado.** Capturar SQLite consistente y configuración de cifrado, conservar versión exacta 2.40.7 o la observada, manifest de IDs/versiones/publicación y asociaciones. Usar respaldo autenticado y clave separada fuera de Git. B8 validó restauración sin red, integridad, descifrado de 22 credenciales y cuarentena previa al arranque; actualizar y repetir validación del nuevo respaldo de ventana.
4. **Validar Flyway en copia.** Usar el mismo conjunto de migraciones del candidato; ejecutar validate y migración en la restauración aislada con rol/permisos previstos. Verificar historial exitoso hasta V31, estructura PK/FK/índice de subscription_charges y arranque con validación JPA. No usar repair ni modificar checksums para eludir fallos. Probar repetición sin segunda aplicación.
5. **Compatibilidad V31/aplicación.** Migración aditiva sin backfill histórico: los recibos de eventos anteriores no aparecen retroactivamente. Confirmar replay/reconciliación y riesgos de eventos anteriores antes de reabrir consumo. El backend nuevo requiere V31; impedir su servicio sobre esquema anterior. Ensayar backend anterior con V31 antes de aceptar rollback de código. Mantener un solo migrador y evitar consumidores de versiones mezcladas.
6. **Dependencias y credenciales.** Confirmar PostgreSQL TLS, pgvector, almacenamiento, Gemini, claves backend↔n8n, firmas webhook, credenciales Mercado Pago y Google autorizadas, límites/URLs/rotación. Comprobar configuración sin imprimir secretos. Conectores generales permanecen inactivos, y no se habilitan como parte automática del despliegue.
7. **Backend coordinado.** Con tráfico/eventos pausados y respaldo validado, aplicar V31 mediante Flyway en la ventana controlada o fase de arranque dedicada del candidato; comprobar éxito antes de promover backend nuevo. Validar salud/readiness, acceso a datos y permisos antes de reabrir tráfico. Registrar digest y logs operativos redactados.
8. **Frontend.** Publicar el build validado y compatible con la API nueva; verificar configuración pública, activos/cache y recuperación de sesiones. Conservar build anterior para recuperación.
9. **Workflows selectivos.** Solo si el diff contra runtime lo exige, comparar los cuatro workflows con el perfil runtime, preservar IDs/credenciales y revisar allowlist. Conservar conexiones y estado. No importar ni activar los ocho generales. Cualquier publicación requiere autorización de esa ventana.
10. **Disponibilidad y regresión.** Lecturas de login, dashboard, deudas, estrategia, documentos propios, 404 y consultas de asistente con evidencia. Usar fixtures autorizados para escrituras; probar persistencia, duplicado y evento desordenado de cobro con proveedor simulado en preproducción. No emitir cobros, correos ni eventos reales sin autorización específica. Abrir consumo gradualmente, vigilar duplicados/outbox, errores Flyway, fronteras y estados de acceso. Mantener 11.3/11.5 y las siete no ejecutadas como pendientes hasta pruebas autorizadas en su ámbito.
11. **Recuperación.** Ante fallo detener tráfico/consumo, preservar evidencia y cola, identificar si hubo escrituras o efectos externos. Preferir corrección hacia delante o rollback de binarios únicamente si se ensayó compatibilidad con V31; conservar tabla/recibos. No borrar V31 ni restaurar DB indiscriminadamente: restaurar puede perder pagos/eventos posteriores al respaldo. Si se requiere recuperación de base, usar snapshot/PITR en instancia separada, conciliar deltas/IDs con proveedores y conmutar bajo autorización. n8n se restaura primero sin red con automatizaciones/webhooks en cuarentena, publicando solo allowlist. Restaurar código o DB no revierte correos/cobros ya ejecutados.

## H. Riesgos y limitaciones

| Tipo | Pendiente y efecto |
|---|---|
| Documental | TSV original ausente; XLSX concordante permite conciliar IDs/estados, pero capturas/JSON B7 subyacentes no accesibles. No bloquea técnicamente integrar código; limita la revisión independiente de ejecución histórica |
| Técnico | DEF-08 carece de nueva medición integral de tráfico/deduplicación en navegador; no se observó fallo nuevo. No es evidencia de bloqueo de merge |
| Funcional | 54 aprobaciones históricas; 7 sin ejecutar por autorización y 2 bloqueos. No certificación E2E completa posterior a B8 |
| Externo | Mercado Pago productivo no verificado; Calendar deshabilitado; Drive de otro owner; Gemini y Google reales no revalidados aquí |
| Seguridad | Grounding lexical y suites acotadas; revisión de patrones no es auditoría completa del historial. Mantener aislamiento y autorización de escritura |
| Despliegue | V31 aún sin despliegue por este bloque; faltan backup PostgreSQL validado para la ventana y ensayo coordinado. Replays anteriores a recibos requieren conciliación |
| Operación | Conectores generales apagados; falta habilitación autorizada y observación sostenida, monitoreo/alertas y validación de recuperación financiera con RPO/RTO definidos |

## I. Veredicto final

| Dimensión | Veredicto fundamentado |
|---|---|
| Desarrollo | Correcciones B7/B8 conservadas, sin nueva funcionalidad ni fallo real identificado en B9 |
| Pruebas E2E | Conciliadas documentalmente: 54 APROBADA históricas, 2 BLOQUEADA, 7 NO EJECUTADA; regresiones aisladas posteriores delimitadas, no 63/63 ni nueva reválida integral |
| Seguridad | Controles y regresiones cubiertos aprobados; revisión acotada, dependencia externa y límites semánticos vigentes |
| Integración con main | Sin bloqueo técnico detectado frente al origin/main recién consultado; pendiente autorización explícita y revisión/versionado de documentos B9 |
| Despliegue | Procedimiento preparado; condicionado a autorización, backup financiero restaurable, Flyway/compatibilidad y ventana coordinada; no ejecutado |
| Operación continua | No acreditada por este cierre; requiere validación/activación externa autorizada, monitoreo y recuperación financiera |

El bloqueo de conciliación nominal de los 63 escenarios queda resuelto con las fuentes disponibles, manteniendo la limitación de acceso a evidencias históricas originales. **Para integrar el código no se encontró un impedimento técnico real; la autorización sigue pendiente. Para desplegar y operar quedan prerrequisitos técnicos y externos adicionales.**
