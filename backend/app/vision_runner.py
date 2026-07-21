import os
import time
import requests
import logging
from .vision_model import load_model, infer_image, ppe_heuristic

logger = logging.getLogger(__name__)

RISK_ENDPOINT = os.getenv("RISK_ENDPOINT", "http://localhost:8000/risk/evaluate")


def run_rtsp_once(rtsp_url: str, save_frame: str = None):
    """Capture a single frame from RTSP (via OpenCV) and run inference, then POST to risk endpoint.
    Falls back to using a local image path if rtsp_url starts with 'file:'.
    """
    try:
        import cv2
    except Exception:
        logger.exception("OpenCV not available")
        return None

    cap = None
    frame = None
    try:
        if rtsp_url.startswith("file:"):
            path = rtsp_url[len("file:"):]
            frame = cv2.imread(path)
        else:
            cap = cv2.VideoCapture(rtsp_url)
            # warm up
            for _ in range(3):
                ret, f = cap.read()
            ret, frame = cap.read()
        if frame is None:
            logger.error("No frame captured from %s", rtsp_url)
            return None
        if save_frame:
            cv2.imwrite(save_frame, frame)

        model = load_model()
        # If YOLO not available but auto-download requested, try to fetch a model and reload
        try:
            if model is None and os.getenv("YOLO_AUTO_DOWNLOAD", "0") == "1":
                url = os.getenv("YOLO_MODEL_URL")
                out = os.getenv("YOLO_MODEL_PATH", "models/ppe_best.pt")
                if url:
                    try:
                        # import the helper script from vision/ if available
                        import importlib

                        dm = importlib.import_module("vision.download_model")
                        dm.download(url, Path(out))
                    except Exception:
                        # fallback to subprocess call
                        try:
                            import subprocess
                            subprocess.check_call(["python", "vision/download_model.py", "--url", url, "--out", out])
                        except Exception:
                            logger.exception("Failed to auto-download YOLO model")
                    # attempt to reload model
                    model = load_model()
        except Exception:
            logger.exception("Auto-download/reload step failed")
        detections = infer_image(model, frame)
        ppe = ppe_heuristic(detections)

        payload = {
            "source": "vision",
            "payload": {
                "detections": detections,
                "camera": os.getenv("CAMERA_ID", "camera-rtsp"),
                "ppe": ppe,
            },
        }

        try:
            r = requests.post(RISK_ENDPOINT, json=payload, timeout=3.0)
            logger.info("Posted risk event, status=%s", r.status_code)
            return r
        except Exception:
            logger.exception("Failed to POST to risk endpoint %s", RISK_ENDPOINT)
            return None
    finally:
        try:
            if cap:
                cap.release()
        except Exception:
            pass
