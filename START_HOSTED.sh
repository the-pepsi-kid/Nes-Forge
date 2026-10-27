#!/bin/sh
set -eu
cd "$(dirname "$0")"
exec sh experiments/hosted-worlds/v17.1/START_LOCALHOST_MAC_LINUX.sh
