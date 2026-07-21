import os
import sys
import importlib
from pathlib import Path

import pytest

from backend.app import vision_model


def test_load_model_with_fake_ultralytics(monkeypatch, tmp_path):
    # Prepare environment to require YOLO
    monkeypatch.setenv("USE_YOLO", "1")
    model_path = tmp_path / "yolov8x.pt"
    model_path.write_text("fake-model")
    monkeypatch.setenv("YOLO_MODEL_PATH", str(model_path))

    # Create a fake 'ultralytics' module with YOLO class
    class FakeYOLO:
        def __init__(self, path):
            self.path = path

        def __call__(self, img):
            # emulate results container
            class B:
                pass

            class R:
                def __init__(self):
                    self.boxes = []

            return [R()]

    fake_mod = type(sys)('ultralytics')
    setattr(fake_mod, 'YOLO', FakeYOLO)
    sys.modules['ultralytics'] = fake_mod

    # Reload vision_model to ensure it picks up fake module
    importlib.reload(vision_model)

    model = vision_model.load_model()
    assert model is not None
    # model should be instance of FakeYOLO
    assert isinstance(model, FakeYOLO)
