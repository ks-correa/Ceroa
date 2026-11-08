# Trasladar Ceroa a otro PC

El exportador guarda el proyecto de la revisión Git indicada, la configuración privada vigente y el volumen completo de n8n: SQLite, usuarios, credenciales cifradas, clave de cifrado interna, tokens OAuth, workflows y versiones publicadas. Incluye las claves privadas de los respaldos anteriores dentro del paquete cifrado. No copia los datos de Supabase a una base local: el nuevo PC usará la misma base y Storage remotos.

## Crear un paquete actualizado en el PC de origen

Con Docker activo, Node 22 o posterior y Git instalado, ejecutar desde el proyecto limpio y confirmado:

```powershell
node integrations/migration/export-ceroa.mjs
```

Solo n8n se detiene brevemente para copiar SQLite de forma consistente y vuelve a arrancar incluso si falla la copia. El paquete queda en `backups/migration/<id>/`; su clave separada queda en `backups/migration-keys/<id>.key`. No se versionan el paquete ni la clave. Los archivos temporales descifrados se eliminan al terminar.

Copiar la carpeta del paquete al nuevo PC y trasladar la clave por separado. La carpeta contiene el archivo `.ceroa`, `manifest.json`, el restaurador, el helper criptográfico y este documento. No compartirlos públicamente ni subir la clave al repositorio.

## Restaurar en el nuevo PC

Requisitos: Docker Desktop activo, Node 22 o posterior, `tar` del sistema y acceso a Internet para descargar las imágenes oficiales y usar Supabase/Google. No hace falta instalar n8n manualmente. Desde la carpeta que contiene el paquete:

```powershell
node restore-ceroa.mjs `
  --archive .\ceroa-AAAA-MM-DD-ID.ceroa `
  --key C:\ruta-privada\ceroa-AAAA-MM-DD-ID.key `
  --destination C:\Proyectos\Ceroa
```

El destino debe estar vacío y el volumen Docker `ceroa_ceroa_n8n_data` no debe existir. El restaurador no sobrescribe proyectos ni volúmenes. Descifra y comprueba integridad, restaura el código/configuración y prueba **sin red** que n8n pueda descifrar todas las credenciales con la clave restaurada. No arranca servicios ni ejecuta automatizaciones.

Antes de arrancar el nuevo PC, detener los servicios de Ceroa en el anterior para evitar dos planificadores sobre la misma base y los mismos proveedores. Después, en el directorio restaurado:

```powershell
docker compose -p ceroa --env-file .env --env-file .env.telegram-local `
  -f docker-compose.yml -f docker-compose.n8n.yml `
  -f docker-compose.n8n-sandbox.yml -f docker-compose.telegram-local.yml `
  up -d --build backend frontend sandbox-runner-1 n8n
```

Se mantiene la imagen de n8n fijada por digest a la versión comprobada. Los certificados mTLS del sandbox se generan en el nuevo PC; su configuración compartida se conserva en el entorno privado. No desactivar la validación TLS para solucionar una conexión remota.

Abrir n8n en `http://localhost:5678` y usar el usuario de n8n que ya existía. Se restauran las credenciales guardadas; no hay que volver a introducir sus secretos. Google puede pedir una autorización nueva si revocó o caducó un token. El callback OAuth sigue siendo `http://localhost:5678/rest/oauth2-credential/callback`.

Para Telegram, el túnel temporal cambia de URL al recrearlo. Iniciar `telegram-proxy`/`telegram-tunnel` y seguir `integrations/n8n/sync-telegram-tunnel.ps1` para registrar la nueva URL; no presentar el webhook antiguo como vigente. No mantener dos PCs enviando recordatorios a la vez.

## Calendar y estado de implementación

La credencial **Ceroa Calendar** tiene guardados el cliente OAuth y sus tokens autorizados. Se comprob? acceso real, disponibilidad y creaci?n de un evento privado con Meet, sin invitados ni correos. El calendario exclusivo de pruebas qued? vinculado al workflow. Los tokens y la configuraci?n se incluyen en el volumen cifrado.

Gmail, Drive y Sheets tienen pruebas reales documentadas. Gemini est? verificado, incluidos embeddings y el nodo nativo. La fuente Drive aprobada ya est? asociada al propietario real identificado y su sourceId est? fijado. No se ha comprobado todav?a la ingesta documental completa desde Drive. Los workflows generales de Workspace siguen inactivos y sus flags desactivados, seg?n lo acordado. MCP personal a?n necesita el token del propietario con sus scopes; el cliente externo necesita su servidor y autenticaci?n operativos. El respaldo conserva este estado y no activa automatizaciones.

Si se completa OAuth u otra configuración después de exportar, ejecutar otra vez el exportador y trasladar el paquete más reciente.

Para comprobar una restauración en este mismo PC sin arrancar servicios ni tocar el volumen activo, usar un destino vacío y añadir `--offline-test`. Se crea un volumen temporal independiente, se comprueba el descifrado y se elimina únicamente ese volumen de prueba. El directorio restaurado queda para inspección.
