import os
import time
import threading
import asyncio
import logging
from datetime import datetime

import numpy as np
import httpx

logger = logging.getLogger(__name__)

RTSP_SOURCE = os.getenv("RTSP_SOURCE", "rtsp://localhost:8554/live")
FRAME_SKIP = int(os.getenv("VISION_FRAME_SKIP", 5))


from .vision_model import load_model, infer_image, ppe_heuristic


def stub_detect(frame: np.ndarray):
    return []


class RTSPCaptureThread(threading.Thread):
    def __init__(self, source, queue, stop_event):
        super().__init__(daemon=True)
        self.source = source
        self.queue = queue
        self.stop_event = stop_event

    def run(self):
        import cv2

        while not self.stop_event.is_set():
            try:
                cap = cv2.VideoCapture(self.source)
                if not cap.isOpened():
                    logger.warning("RTSP source not opened, retrying in 5s")
                    time.sleep(5)
                    continue

                while not self.stop_event.is_set():
                    ret, frame = cap.read()
                    if not ret:
                        logger.warning("Frame read failed, reconnecting")
                        break
                    # push frame (may drop if queue full)
                    try:
                        self.queue.put_nowait(frame)
                    except Exception:
                        # drop frame
                        pass
            except Exception:
                logger.exception("RTSP capture error, reconnecting")
                time.sleep(2)


async def process_frames(queue: "asyncio.Queue", model):
    async with httpx.AsyncClient() as client:
        while True:
            frame = await queue.get()
            # frame is a numpy array - run detection in threadpool if needed
            loop = asyncio.get_event_loop()
            if model is not None:
                try:
                    # run model inference using the wrapper in a threadpool to avoid blocking
                    detections = await loop.run_in_executor(None, infer_image, model, frame)
                except Exception:
                    logger.exception("YOLO detection failed; falling back to stub")
                    detections = stub_detect(frame)
            else:
                detections = stub_detect(frame)

            # run PPE heuristic to summarize PPE state (works with YOLO or CPU fallback)
            try:
                ppe_summary = ppe_heuristic(detections, frame)
            except Exception:
                logger.exception("PPE heuristic failed")
                ppe_summary = {"ppe_ok": True, "reason": "heuristic_error"}

            # Build event payload and send to backend risk evaluator
            event = {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "source": "vision",
                "camera": RTSP_SOURCE,
                "detections": detections,
                "ppe": ppe_summary,
            }
            try:
                await client.post(os.getenv("BACKEND_URL", "http://backend:8000") + "/risk/evaluate", json={"source": "vision", "payload": event}, timeout=5.0)
            except Exception:
                logger.exception("Failed to POST vision event to backend")
            # simple frame skip rate control
            for _ in range(FRAME_SKIP - 1):
                if queue.empty():
                    break
                try:
                    queue.get_nowait()
                except Exception:
                    break


def start_rtsp_worker():
    queue = asyncio.Queue(maxsize=8)
    stop_event = threading.Event()
    t = RTSPCaptureThread(RTSP_SOURCE, queue, stop_event)
    t.start()

    model = load_model()

    loop = asyncio.get_event_loop()
    # schedule the async frame processor
    loop.create_task(process_frames(queue, model))

    return stop_event


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    stop = start_rtsp_worker()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        stop.set()
