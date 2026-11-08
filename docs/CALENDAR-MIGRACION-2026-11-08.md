# Calendar y migración: estado final

Esta actualización sustituye los pendientes de Calendar y de asociación de Drive del informe inicial de Google Workspace.

La credencial `ceroaGoogleCalendar40`, **Ceroa Calendar**, contiene cliente OAuth y tokens autorizados cifrados en n8n. Se comprobaron renovación y listado de calendarios con HTTP 200. Se creó el calendario privado **Ceroa - Soporte (pruebas)**, zona America/Bogota, con soporte de hangoutsMeet; disponibilidad nativa verificada.

Con autorización expresa se creó un único evento **Prueba técnica Ceroa**, el 9 de noviembre de 2026 de 10:00 a 10:30 de Bogotá. Google devolvió estado `confirmed` y enlace Meet válido. Sin invitados, `sendUpdates: none`; no se enviaron correos. El registro privado impide repetir accidentalmente la operación. La prueba manual quedó inactiva.

El workflow operativo Calendar está vinculado al calendario real y a la credencial autorizada. Drive tiene el folder aprobado y sourceId fijados; la fuente se asoció al usuario activo cuyo correo coincide con la cuenta Google verificada, mediante la misma configuración JDBC del backend, sin consultar datos financieros ni modificar TLS. La ingesta documental completa desde Drive sigue sin prueba real integral.

Las credenciales de Gmail, Drive, Sheets y Gemini permanecen guardadas en n8n. Las pruebas reales previas de correo, hoja, generación, embeddings y nodo nativo siguen documentadas en sus informes. Los conectores generales Workspace y MCP permanecen inactivos; MCP personal requiere token de propietario y el cliente externo su servidor configurado. No se declara activación general.

El exportador de migración incluye código confirmado, configuración privada, volumen completo de n8n, clave interna de cifrado, tokens OAuth y versiones publicadas, todo dentro de un paquete cifrado con clave separada. El restaurador verifica integridad y descifrado de todas las credenciales sin red antes de arrancar servicios. Supabase/Storage siguen siendo remotos; el respaldo no es un volcado de esa base.

Ver `integrations/migration/README.md` para traslado y arranque. Usar el paquete más reciente generado tras esta actualización. Detener el PC anterior antes de arrancar el nuevo para evitar dos planificadores.
