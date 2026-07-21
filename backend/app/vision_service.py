import os
import time
import logging
import signal
import threading
from .vision_runner import run_rtsp_once

logger = logging.getLogger(__name__)

STOP = threading.Event()


def _handle_sig(signum, frame):
    logger.info("Signal received: %s, stopping service", signum)
    STOP.set()


signal.signal(signal.SIGINT, _handle_sig)
signal.signal(signal.SIGTERM, _handle_sig)


def run_loop(rtsp_url: str, interval: float = 1.0):
    logger.info("Starting RTSP vision service for %s", rtsp_url)
    # Optionally start a lightweight HTTP health endpoint if HEALTH_PORT set
    try:
        health_port = int(os.getenv("HEALTH_PORT", "0") or 0)
    except Exception:
        health_port = 0

    if health_port:
        def _health_handler():
            import http.server
            import socketserver
            import json
            from datetime import datetime

            class HealthHandler(http.server.BaseHTTPRequestHandler):
                def log_message(self, format, *args):
                    # silence default logging
                    return

                def do_GET(self):
                    if self.path != "/health":
                        self.send_response(404)
                        self.end_headers()
                        return

                    # If YOLO is required, verify model presence before reporting healthy
                    use_yolo = os.getenv("USE_YOLO", "0") == "1"
                    auto_dl = os.getenv("YOLO_AUTO_DOWNLOAD", "0") == "1"
                    model_path = os.getenv("YOLO_MODEL_PATH", "/models/ppe_best.pt")
                    model_present = False
                    try:
                        model_present = bool(model_path and os.path.exists(model_path))
                    except Exception:
                        model_present = False

                    if use_yolo or auto_dl:
                        if not model_present:
                            payload = {"status": "starting", "reason": "model_missing", "required": True}
                            b = json.dumps(payload).encode("utf-8")
                            self.send_response(503)
                            self.send_header("Content-Type", "application/json")
                            self.send_header("Content-Length", str(len(b)))
                            self.end_headers()
                            self.wfile.write(b)
                            return

                    payload = {"status": "ok", "mode": "vision_service", "uptime": datetime.utcnow().isoformat() + "Z", "model_present": model_present}
                    b = json.dumps(payload).encode("utf-8")
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Content-Length", str(len(b)))
                    self.end_headers()
                    self.wfile.write(b)

            try:
                with socketserver.TCPServer(("0.0.0.0", health_port), HealthHandler) as httpd:
                    httpd.timeout = 1
                    logger.info("Health endpoint listening on %s", health_port)
                    while not STOP.is_set():
                        httpd.handle_request()
            except Exception:
                logger.exception("Health server failed")

        t = threading.Thread(target=_health_handler, daemon=True)
        t.start()

    while not STOP.is_set():
        try:
            run_rtsp_once(rtsp_url)
        except Exception:
            logger.exception("Error in RTSP loop")
        # sleep with wake-up check
        for _ in range(int(max(1, interval * 10))):
            if STOP.is_set():
                break
            time.sleep(interval / 10.0)
    logger.info("RTSP vision service stopped")


if __name__ == "__main__":
    rtsp = os.getenv("RTSP_URL", "file:./tests/fixtures/sample_frame.jpg")
    interval = float(os.getenv("RTSP_POLL_INTERVAL", "1.0"))
    run_loop(rtsp, interval)
