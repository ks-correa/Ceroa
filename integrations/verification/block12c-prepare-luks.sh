#!/usr/bin/env bash
# Authorized local preparation only. No financial data or provider credentials.
set -euo pipefail
umask 077
[ "$(id -u)" = 0 ] || { echo 'Root required'; exit 1; }
base=/home/kevin/.local/share/ceroa-recovery
keys=/root/.ceroa-recovery-keys
volume="$base/block12c-recovery.luks"
key="$keys/block12c-recovery.key"
mapper=ceroa12c_private
mountpoint=/mnt/ceroa12c-private
mkdir -p "$base" "$keys"
chmod 700 "$base" "$keys"
[ ! -e "$volume" ] && [ ! -e "$key" ] && [ ! -e "/dev/mapper/$mapper" ] || { echo 'Existing target; refusing overwrite'; exit 1; }
[ ! -e "$mountpoint" ] || { echo 'Mountpoint already exists; refusing reuse'; exit 1; }
(set -C; : > "$volume")
fallocate -l 1G "$volume"
head -c 64 /dev/urandom > "$key"
chmod 600 "$volume" "$key"
loop_device=$(losetup --find --show "$volume")
actual=$(losetup --noheadings --raw --output BACK-FILE "$loop_device")
[ "$actual" = "$volume" ] || { echo 'Backing file mismatch'; exit 1; }
cryptsetup luksFormat --type luks2 --batch-mode --key-file "$key" "$loop_device"
cryptsetup open --key-file "$key" "$loop_device" "$mapper"
[ "$(cryptsetup status "$mapper" | awk '/device:/{print $2}')" = "$loop_device" ] || { echo 'Mapper mismatch'; exit 1; }
mkfs.ext4 -q "/dev/mapper/$mapper"
mkdir -m 700 "$mountpoint"
mount -o nodev,nosuid "/dev/mapper/$mapper" "$mountpoint"
chmod 700 "$mountpoint"
printf '%s\n' 'CEROA_BLOCK12C_SYNTHETIC_VOLUME_PROBE' > "$mountpoint/synthetic-probe.txt"
sha256sum "$mountpoint/synthetic-probe.txt" | awk '{print $1}' > "$keys/block12c-synthetic.sha256"
sync
umount "$mountpoint"
cryptsetup close "$mapper"
wrong=$(mktemp /run/ceroa12c-wrong.XXXXXX)
trap 'rm -f "$wrong"' EXIT
head -c 64 /dev/urandom > "$wrong"
if cryptsetup open --test-passphrase --key-file "$wrong" "$loop_device" >/dev/null 2>&1; then echo 'Wrong key unexpectedly accepted'; exit 1; fi
cryptsetup open --key-file "$key" "$loop_device" "$mapper"
mount -o nodev,nosuid "/dev/mapper/$mapper" "$mountpoint"
chmod 700 "$mountpoint"
expected=$(cat "$keys/block12c-synthetic.sha256")
actual=$(sha256sum "$mountpoint/synthetic-probe.txt" | awk '{print $1}')
[ "$actual" = "$expected" ] || { echo 'Synthetic fixture mismatch'; exit 1; }
printf '%s\n' 'LUKS2_CREATED_WRONG_KEY_REJECTED_REOPEN_HASH_MATCHED'
cryptsetup status "$mapper"
findmnt -no SOURCE,FSTYPE,OPTIONS "$mountpoint"
ls -ld "$base" "$keys" "$mountpoint"
ls -l "$volume"
# Key bytes are never printed. The mounted volume contains synthetic data only.
