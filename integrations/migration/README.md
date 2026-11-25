# Trasladar Ceroa a otro PC

El código y las definiciones portables de los workflows se obtienen de `main`. Las credenciales, OAuth, la clave de cifrado de n8n y los archivos `.env` viajan en un paquete privado `.ceroa`, cifrado con AES-256-GCM. La clave para abrirlo se guarda por separado. Ninguno de esos archivos se sube a Git.

Requisitos en ambos equipos: Git, Node.js 24 o posterior, Docker Desktop con contenedores Linux y `tar` en PATH. La base financiera y Storage siguen en el Supabase configurado; este procedimiento no crea ni copia otra base financiera.

## 1. Preparar y comprobar sin dejar apagado el escritorio

Desde la raíz del repositorio, en PowerShell:

```powershell
node integrations/migration/export-ceroa.mjs --output "$env:USERPROFILE\Ceroa-traslado\respaldo" --key "$env:USERPROFILE\.ceroa-claves\respaldo.key"
```

Usa una ruta de clave nueva en cada exportación. El script pausa temporalmente los servicios que escriben datos, exporta y vuelve a iniciar los que estaban funcionando. Conserva usuarios de n8n, credenciales cifradas, workflows y sus versiones publicadas, borradores, configuración y el registro durable del proveedor Google. Excluye el historial de ejecuciones.

Anota las rutas `archive` y `keyFile` que devuelve, junto con el commit actual (`git rev-parse HEAD`). Comprueba que el paquete se puede restaurar y descifrar:

```powershell
node integrations/migration/restore-ceroa.mjs --archive "RUTA_ABSOLUTA\archivo.ceroa" --key "OTRA_RUTA\respaldo.key" --offline-test
```

La comprobación usa volúmenes Docker nuevos y temporales, sin red. No inicia n8n, no conecta con Google ni reemplaza los volúmenes del escritorio. Verifica las credenciales y el estado durable; elimina los volúmenes temporales al terminar. El resultado esperado es `RESTORED_AND_VERIFIED` con `offline: true`.

Este respaldo permite preparar y ensayar el traslado. Para el cambio definitivo, genera el paquete final del paso siguiente; un respaldo normal no autoriza iniciar los consumidores en otro PC.

## 2. Hacer el cambio definitivo cuando el portátil esté preparado

En el escritorio, deja de usar Ceroa y genera un paquete final nuevo:

```powershell
git status --short
git rev-parse HEAD
node integrations/migration/export-ceroa.mjs --output "$env:USERPROFILE\Ceroa-traslado\final" --key "$env:USERPROFILE\.ceroa-claves\final.key" --handoff
```

`--handoff` deja detenidos backend, n8n, proveedor Google y transportes de Telegram. No vuelvas a iniciarlos en el escritorio mientras el portátil use las mismas integraciones. Copia el archivo `.ceroa` al portátil y transfiere la clave por separado.

En el portátil, antes de iniciar Docker Compose o crear `.env`:

```powershell
git clone https://github.com/ks-correa/Ceroa.git
cd Ceroa
git checkout main
git pull --ff-only origin main
git checkout COMMIT_EXACTO_DEL_PAQUETE
node integrations/migration/restore-ceroa.mjs --archive "RUTA_ABSOLUTA\archivo-final.ceroa" --key "OTRA_RUTA\final.key" --confirm-source-stopped
docker compose up -d --build --wait
```

Si `main` coincide con el commit del paquete, puedes permanecer en `main`. La restauración exige ese commit exacto y rechaza un `.env` o volúmenes de destino existentes para no sobrescribir otra instalación. No uses `docker compose down -v` para resolver ese rechazo.

Abre Ceroa en <http://localhost:3000> y n8n en <http://localhost:5678>. Se conservan las cuentas de n8n del origen. El restaurador deja desactivados los consumidores externos y las banderas de envío, Calendar, Sheets y recordatorios; no los inicia por sí mismo. Tras comprobar que el escritorio sigue detenido, habilita en `.env` y publica en n8n únicamente las integraciones que vayas a utilizar, según el [README principal](../../README.md#n8n-y-credenciales). Sheets sigue deshabilitado por defecto.

Google puede solicitar reconectar OAuth. Si usas Telegram, actualiza su URL pública con `integrations/n8n/sync-telegram-tunnel.ps1` después de verificar el traslado. Si no hay red, las credenciales se pueden recuperar, pero las consultas a Supabase y a los proveedores necesitan conexión.

Un borrador distinto de su versión publicada se conserva como borrador: la restauración no lo publica ni lo reconcilia automáticamente. No ejecutes `bootstrap --update` para forzar su sobrescritura.
