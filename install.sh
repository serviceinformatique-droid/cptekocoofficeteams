#!/usr/bin/env bash
# Wrapper vers le script tout-en-un dans scripts/install-all-in-one.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
chmod +x "$SCRIPT_DIR/scripts/install-all-in-one.sh"
exec "$SCRIPT_DIR/scripts/install-all-in-one.sh" "$@"
