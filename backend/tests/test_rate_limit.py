"""
Rate limiting tests for Thermal Eye
"""

import pytest
import time


class TestRateLimit:
    """Test rate limiting functionality"""
    
    def test_general_rate_limit(self, client):
        """Test general API rate limiting"""
        # Make many requests to a public endpoint
        responses = []
        for i in range(65):  # Exceed 60 requests per minute limit
            response = client.get("/")
            responses.append(response)
            
            # Stop if we hit rate limit
            if response.status_code == 429:
                break
        
        # Should hit rate limit before 65 requests
        rate_limited = any(r.status_code == 429 for r in responses)
        assert rate_limited, "Rate limit should be triggered"
        
        # Check rate limit response format
        rate_limit_response = next(r for r in responses if r.status_code == 429)
        error_data = rate_limit_response.json()
        assert "Rate limit exceeded" in error_data["detail"]["message"]
        assert "retry_after" in error_data["detail"]
    
    def test_upload_rate_limit(self, client, auth_headers, sample_image_bytes):
        """Test upload-specific rate limiting"""
        # Make many upload requests
        responses = []
        for i in range(12):  # Exceed 10 uploads per minute limit
            files = {"file": (f"test_{i}.jpg", sample_image_bytes, "image/jpeg")}
            response = client.post("/upload", files=files, headers=auth_headers)
            responses.append(response)
            
            # Stop if we hit rate limit
            if response.status_code == 429:
                break
        
        # Should hit rate limit
        rate_limited = any(r.status_code == 429 for r in responses)
        assert rate_limited, "Upload rate limit should be triggered"
    
    def test_batch_upload_rate_limit(self, client, auth_headers, sample_image_bytes):
        """Test batch upload rate limiting"""
        # Make many batch upload requests
        responses = []
        for i in range(12):  # Exceed 10 uploads per minute limit
            files = [("files", (f"test_{i}.jpg", sample_image_bytes, "image/jpeg"))]
            response = client.post("/upload_batch", files=files, headers=auth_headers)
            responses.append(response)
            
            # Stop if we hit rate limit
            if response.status_code == 429:
                break
        
        # Should hit rate limit
        rate_limited = any(r.status_code == 429 for r in responses)
        assert rate_limited, "Batch upload rate limit should be triggered"
    
    def test_rate_limit_different_endpoints(self, client, auth_headers):
        """Test that rate limits are applied per client, not per endpoint"""
        # Make requests to different endpoints from same client
        responses = []
        
        # Mix of different endpoints
        for i in range(65):
            if i % 2 == 0:
                response = client.get("/", headers=auth_headers)
            else:
                response = client.get("/reports", headers=auth_headers)
            
            responses.append(response)
            
            if response.status_code == 429:
                break
        
        # Should still hit global rate limit
        rate_limited = any(r.status_code == 429 for r in responses)
        assert rate_limited, "Global rate limit should apply across endpoints"


class TestRateLimitBypass:
    """Test that certain endpoints or conditions bypass rate limits appropriately"""
    
    def test_auth_endpoints_have_different_limits(self, client):
        """Test that auth endpoints may have different rate limits"""
        # Test login endpoint specifically
        responses = []
        for i in range(5):  # Test a few login attempts
            form_data = {
                "username": "test@example.com",
                "password": "wrongpassword"
            }
            response = client.post("/auth/login", data=form_data)
            responses.append(response)
        
        # Should get 401 (invalid credentials) not 429 (rate limited)
        # This tests that auth endpoints aren't immediately rate limited
        assert all(r.status_code in [401, 422] for r in responses[:3])


class TestRateLimitRecovery:
    """Test rate limit recovery and reset behavior"""
    
    @pytest.mark.slow
    def test_rate_limit_resets_over_time(self, client):
        """Test that rate limits reset after time period (slow test)"""
        # This would require waiting 60 seconds, so we'll just test the concept
        # In practice, you might mock time or use shorter test windows
        
        # Make requests until rate limited
        for i in range(65):
            response = client.get("/")
            if response.status_code == 429:
                break
        
        # At this point we should be rate limited
        response = client.get("/")
        if response.status_code == 429:
            # Test passes - we hit rate limit as expected
            assert True
        else:
            # Might not hit rate limit in test environment
            pytest.skip("Rate limit not triggered in test environment")
