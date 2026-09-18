#!/bin/sh
# Runs as root, makes the data volume writable, then drops privileges.
#
# Bind-mounted host directories keep their host ownership, which shadows the
# chown done at image build time. Fixing it here means any host directory works
# regardless of who owns it.
set -e

DATA_DIR="${DATA_DIR:-/app/data}"
PUID="${PUID:-10001}"
PGID="${PGID:-10001}"

if [ "$(id -u)" = "0" ]; then
	# Re-map the app user when the operator asks for a specific uid/gid.
	[ "$(id -g app)" = "$PGID" ] || groupmod -o -g "$PGID" app
	[ "$(id -u app)" = "$PUID" ] || usermod -o -u "$PUID" app

	mkdir -p "$DATA_DIR"
	chown -R "$PUID:$PGID" "$DATA_DIR"

	exec gosu "$PUID:$PGID" "$@"
fi

exec "$@"
