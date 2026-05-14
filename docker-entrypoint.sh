#!/usr/bin/env bash
set -euo pipefail

# KURUMI_GUI_MODE=x11 (default): use host DISPLAY + /tmp/.X11-unix from compose.
# KURUMI_GUI_MODE=vnc: start TigerVNC + noVNC inside the container (browser on NOVNC_PORT).

if [ "${KURUMI_GUI_MODE:-x11}" = "vnc" ]; then
  export DISPLAY="${KURUMI_VNC_DISPLAY:-:1}"
  dnum="${DISPLAY#:}"
  rm -f "/tmp/.X${dnum}-lock" "/tmp/.X11-unix/X${dnum}" 2>/dev/null || true
  geom="${KURUMI_VNC_GEOMETRY:-1400x900}"
  echo "[docker-entrypoint] starting TigerVNC ${DISPLAY} (${geom})"
  Xtigervnc "${DISPLAY}" -geometry "${geom}" -depth 24 -SecurityTypes None -localhost 1 &
  _xvnc_pid=$!
  sleep 2
  if ! kill -0 "${_xvnc_pid}" 2>/dev/null; then
    echo "[docker-entrypoint] TigerVNC failed to stay running" >&2
    exit 1
  fi
  vnc_port=$((5900 + dnum))
  novnc_port="${KURUMI_NOVNC_PORT:-6080}"
  echo "[docker-entrypoint] noVNC → http://127.0.0.1:${novnc_port}  (VNC ${DISPLAY} tcp/${vnc_port})"
  websockify --web=/usr/share/novnc/ "${novnc_port}" "127.0.0.1:${vnc_port}" &
fi

exec tini -g -- "$@"
