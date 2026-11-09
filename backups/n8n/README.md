# Respaldo privado de n8n

## Estado comprobado el 9 de noviembre de 2026

El runtime observado es **n8n 2.40.7**, con 30 workflows, 15 publicados/activos,
15 inactivos y 22 credenciales. Las referencias de versión y los conteos que
siguen corresponden a respaldos históricos; no describen el runtime actual.
No se debe restaurar una base de una versión distinta sin comprobar compatibilidad.

El respaldo nuevo está fuera de Git, en
`%USERPROFILE%\.ceroa-backups\n8n-block8-2026-11-09.ceroa`; su clave externa
está en `%USERPROFILE%\.ceroa-backup-keys\block8-verified-2026-11-09.key`.
La recuperación se comprobó sin red, sin arrancar n8n y poniendo primero en
cuarentena los workflows y webhooks de la copia. Conserva ambos archivos en
medios privados separados. El respaldo de n8n no incluye la base financiera.

Consulta el [informe del Bloque 8](../../docs/BLOQUE-8-CONSOLIDACION-2026-11-09.md)
para el procedimiento selectivo, la evidencia y los límites de restauración.

## Exportación histórica verificada (4 de noviembre de 2026)

`ceroa-n8n-live-2026-11-04.ceroa` es el respaldo recomendado, exportado
directamente desde n8n 2.45.4 en Docker el 4 de noviembre de 2026.
Contiene 15 credenciales, 13 workflows (11 activos en origen), la configuración
de cifrado y los `.env` locales. Todas las referencias de credenciales de los
workflows existen en la exportación. Incluye `workflows-inactive.json` para
restaurar sin activar automáticamente las automatizaciones.

Usa la misma clave externa indicada abajo. En el comando de descifrado,
sustituye el nombre del archivo de entrada por
`backups/n8n/ceroa-n8n-live-2026-11-04.ceroa`.
Importa primero `credentials-readable.json` y después
`workflows-inactive.json`. Verifica las conexiones antes de activar.
No ejecutes el mismo bot de Telegram en dos instancias a la vez.
La copia no corrige la conexión a Supabase: durante la revisión el backend
se reiniciaba porque el proveedor rechazaba el tenant/usuario configurado.
No es una copia completa de la base de datos.

## Copia histórica de archivos locales

`ceroa-n8n-2026-11-04.ceroa` contiene un ZIP cifrado con AES-256-GCM
y una clave aleatoria de 256 bits. La herramienta comprueba el descifrado
antes de guardar el respaldo.

Incluye los `.env` locales, 17 credenciales legibles de `credenciales_n8n.txt`,
dos snapshots de workflows y la exportación anterior de 22 credenciales
cifradas con su configuración de n8n del 27 de octubre de 2026.
Son copias locales existentes: Docker no estaba disponible para exportar
el estado en vivo. No se garantiza que incluyan cambios posteriores.

La clave se conserva fuera de Git en
`C:\Users\ke_co\.ceroa-backup-keys\ceroa-n8n-2026-11-04.key`.
Guárdala también en un gestor de contraseñas o un medio privado separado.
Sin ella no se puede restaurar el respaldo. Nunca la agregues al repositorio.

Desde la raíz del proyecto, para restaurar en Windows:

```powershell
New-Item -ItemType Directory -Force backups/n8n/restored
node integrations/n8n/backup-crypto.mjs decrypt backups/n8n/ceroa-n8n-2026-11-04.ceroa backups/n8n/restored/respaldo.zip "$env:USERPROFILE\.ceroa-backup-keys\ceroa-n8n-2026-11-04.key"
Expand-Archive -LiteralPath backups/n8n/restored/respaldo.zip -DestinationPath backups/n8n/restored/contenido
```

Lee `RESTORE-NOTES.txt` dentro del ZIP. `credenciales_n8n.txt` es JSON
importable mediante `n8n import:credentials --input=...`; no importes ambas
exportaciones de credenciales a la vez. Los archivos descifrados contienen
secretos y deben conservarse fuera de Git. La carpeta `restored/` está ignorada.
