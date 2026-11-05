# Respaldo privado de n8n

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
