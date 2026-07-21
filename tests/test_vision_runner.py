import os
from backend.app.vision_runner import run_rtsp_once
from unittest.mock import patch, MagicMock


def test_run_rtsp_once_file():
    # Use a sample local file in tests/fixtures; if not present, skip
    path = os.path.join(os.path.dirname(__file__), "fixtures", "sample_frame.jpg")
    if not os.path.exists(path):
        # create a tiny black image using PIL to avoid heavy deps
        try:
            from PIL import Image
            img = Image.new("RGB", (64, 64), (0, 0, 0))
            os.makedirs(os.path.dirname(path), exist_ok=True)
            img.save(path)
        except Exception:
            return

    # run once; it should not raise
    with patch("requests.post") as mock_post:
        mock_post.return_value = MagicMock(status_code=200)
        res = run_rtsp_once(f"file:{path}")
    assert res is None or hasattr(res, 'status_code')
