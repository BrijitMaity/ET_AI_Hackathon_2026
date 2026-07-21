from collections import deque
from threading import Lock

_store = deque(maxlen=1000)
_lock = Lock()


def append_event(event: dict):
    with _lock:
        _store.appendleft(event)


def get_recent(n: int = 50):
    with _lock:
        return list(_store)[:n]
