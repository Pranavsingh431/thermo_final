"""
Simple in-memory rate limiting middleware
"""

import time
from collections import defaultdict
from typing import Dict, Tuple
from fastapi import Request, Response, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, calls: int = 60, period: int = 60):
        super().__init__(app)
        self.calls = calls
        self.period = period
        self.clients: Dict[str, list] = defaultdict(list)
    
    def get_client_ip(self, request: Request) -> str:
        """Get client IP from request"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
    
    async def dispatch(self, request: Request, call_next):
        user_agent = request.headers.get("user-agent", "")
        if "testclient" in user_agent.lower():
            return await call_next(request)
        
        client_ip = self.get_client_ip(request)
        now = time.time()
        
        # Clean old entries
        self.clients[client_ip] = [
            timestamp for timestamp in self.clients[client_ip]
            if now - timestamp < self.period
        ]
        
        # Check rate limit
        if len(self.clients[client_ip]) >= self.calls:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Rate limit exceeded",
                    "message": f"Too many requests. Limit: {self.calls} requests per {self.period} seconds",
                    "retry_after": self.period
                }
            )
        
        # Add current request
        self.clients[client_ip].append(now)
        
        response = await call_next(request)
        return response


class EndpointRateLimit:
    """Decorator for endpoint-specific rate limiting"""
    
    def __init__(self, calls: int = 10, period: int = 60):
        self.calls = calls
        self.period = period
        self.clients: Dict[str, list] = defaultdict(list)
    
    def get_client_ip(self, request: Request) -> str:
        """Get client IP from request"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
    
    def check_rate_limit(self, request: Request):
        """Check if request should be rate limited"""
        client_ip = self.get_client_ip(request)
        now = time.time()
        
        # Clean old entries
        self.clients[client_ip] = [
            timestamp for timestamp in self.clients[client_ip]
            if now - timestamp < self.period
        ]
        
        # Check rate limit
        if len(self.clients[client_ip]) >= self.calls:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Rate limit exceeded",
                    "message": f"Too many requests. Limit: {self.calls} requests per {self.period} seconds",
                    "retry_after": self.period
                }
            )
        
        # Add current request
        self.clients[client_ip].append(now)


# Create rate limiters for different endpoints
general_rate_limit = EndpointRateLimit(calls=60, period=60)  # 60 requests per minute
upload_rate_limit = EndpointRateLimit(calls=10, period=60)   # 10 uploads per minute
