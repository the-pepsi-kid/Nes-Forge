#!/bin/sh
set -eu
cd "$(dirname "$0")"
printf 'NES Forge 3.x Localhost Hosted World — v0.17 Original Link Actions Pilot\n'
python3 host/diagnose.py
python3 host/server.py
