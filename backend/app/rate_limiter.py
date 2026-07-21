from fastapi import Request, HTTPException
import time
from collections import defaultdict
from .config import settings

class ExponentialBackoffRateLimiter:
    def __init__(self, base_delay: float = settings.AUTH_BASE_DELAY_SECONDS, 
                 max_delay: float = settings.AUTH_MAX_DELAY_SECONDS,
                 max_failures: int = settings.AUTH_MAX_FAILURES_BEFORE_BACKOFF,
                 forget_after: float = settings.AUTH_FORGET_AFTER_SECONDS):
        self.attempts = defaultdict(list)
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.max_failures = max_failures
        self.forget_after = forget_after

    def _cleanup(self, key: str, now: float):
        if key in self.attempts:
            self.attempts[key] = [t for t in self.attempts[key] if now - t < self.forget_after]
            if not self.attempts[key]:
                del self.attempts[key]

    async def check(self, request: Request, identifier: str = None):
        """
        Check if the request should be rate-limited. 
        Enforces limits simultaneously on the client IP and the account identifier (if provided).
        """
        client_ip = request.client.host if request.client else "unknown"
        keys_to_check = [f"ip:{client_ip}"]
        if identifier:
            keys_to_check.append(f"acc:{identifier}")
        
        now = time.time()
        for key in keys_to_check:
            self._cleanup(key, now)
            count = len(self.attempts[key])
            if count >= self.max_failures:
                power = count - self.max_failures
                delay = min(self.max_delay, self.base_delay * (2 ** power))
                
                last_attempt = self.attempts[key][-1]
                time_since_last = now - last_attempt
                
                if time_since_last < delay:
                    wait_time = delay - time_since_last
                    raise HTTPException(
                        status_code=429, 
                        detail=f"Too many attempts. Please try again in {int(wait_time) + 1} seconds."
                    )

    def record_failure(self, request: Request, identifier: str = None):
        client_ip = request.client.host if request.client else "unknown"
        self.attempts[f"ip:{client_ip}"].append(time.time())
        if identifier:
            self.attempts[f"acc:{identifier}"].append(time.time())

    def record_success(self, request: Request, identifier: str = None):
        client_ip = request.client.host if request.client else "unknown"
        if f"ip:{client_ip}" in self.attempts:
            del self.attempts[f"ip:{client_ip}"]
        if identifier and f"acc:{identifier}" in self.attempts:
            del self.attempts[f"acc:{identifier}"]


class StandardRateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.requests = defaultdict(list)
        self.max_requests = max_requests
        self.window_seconds = window_seconds

    def _cleanup(self, key: str, now: float):
        if key in self.requests:
            self.requests[key] = [t for t in self.requests[key] if now - t < self.window_seconds]
            if not self.requests[key]:
                del self.requests[key]

    async def __call__(self, request: Request):
        now = time.time()
        client_ip = request.client.host if request.client else "unknown"
        key = f"ip:{client_ip}"
        
        self._cleanup(key, now)
        
        if len(self.requests[key]) >= self.max_requests:
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Please slow down.")
            
        self.requests[key].append(now)


# Instantiate the global limiters
auth_limiter = ExponentialBackoffRateLimiter()
public_limiter = StandardRateLimiter(settings.PUBLIC_RATE_LIMIT_REQUESTS, settings.PUBLIC_RATE_LIMIT_WINDOW_SECONDS)
authenticated_limiter = StandardRateLimiter(settings.AUTHENTICATED_RATE_LIMIT_REQUESTS, settings.AUTHENTICATED_RATE_LIMIT_WINDOW_SECONDS)
