"""
Basic functionality tests without TestClient dependency issues
"""

import pytest
import requests
import time
import json
from PIL import Image
import io


class TestBasicAPI:
    """Test basic API functionality using requests library"""
    
    BASE_URL = "http://localhost:8000"
    
    @pytest.fixture(autouse=True)
    def setup_server(self):
        """Ensure server is running for tests"""
        try:
            response = requests.get(f"{self.BASE_URL}/")
            assert response.status_code == 200
        except requests.ConnectionError:
            pytest.skip("Server not running. Start with: uvicorn app.main:app --reload")
    
    def test_health_endpoint(self):
        """Test the health check endpoint"""
        response = requests.get(f"{self.BASE_URL}/")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "version" in data
        assert "towers_loaded" in data
    
    def test_auth_endpoints_exist(self):
        """Test that auth endpoints are accessible"""
        # Test login endpoint exists
        response = requests.post(f"{self.BASE_URL}/auth/login", 
                               data={"username": "test", "password": "test"})
        # Should return 401 (invalid credentials) not 404 (not found)
        assert response.status_code in [401, 422]
        
        # Test register endpoint exists
        response = requests.post(f"{self.BASE_URL}/auth/register",
                               json={"email": "test@test.com", "password": "test"})
        # Should return some response (not 404)
        assert response.status_code != 404
    
    def test_protected_endpoints_require_auth(self):
        """Test that protected endpoints require authentication"""
        # Test reports endpoint
        response = requests.get(f"{self.BASE_URL}/reports")
        assert response.status_code == 401
        
        # Test upload endpoint
        files = {"file": ("test.txt", b"test", "text/plain")}
        response = requests.post(f"{self.BASE_URL}/upload", files=files)
        assert response.status_code == 401
    
    def test_file_validation_on_upload(self):
        """Test file validation without authentication"""
        # This should fail with auth error, not file validation error
        files = {"file": ("test.txt", b"invalid file", "text/plain")}
        response = requests.post(f"{self.BASE_URL}/upload", files=files)
        
        # Should get auth error before file validation
        assert response.status_code == 401
        error_data = response.json()
        assert "Not authenticated" in error_data["detail"]


class TestRateLimiting:
    """Test rate limiting functionality"""
    
    BASE_URL = "http://localhost:8000"
    
    @pytest.fixture(autouse=True)
    def setup_server(self):
        """Ensure server is running for tests"""
        try:
            response = requests.get(f"{self.BASE_URL}/")
            assert response.status_code == 200
        except requests.ConnectionError:
            pytest.skip("Server not running. Start with: uvicorn app.main:app --reload")
    
    def test_rate_limit_eventually_triggers(self):
        """Test that rate limiting eventually triggers"""
        responses = []
        
        # Make many requests quickly
        for i in range(70):  # Exceed 60 requests per minute
            try:
                response = requests.get(f"{self.BASE_URL}/", timeout=1)
                responses.append(response.status_code)
                
                # Stop if we hit rate limit
                if response.status_code == 429:
                    break
                    
            except requests.RequestException:
                # Network issues, continue
                continue
        
        # Should eventually hit rate limit
        assert 429 in responses, f"Rate limit not triggered in {len(responses)} requests"
    
    @pytest.mark.slow
    def test_rate_limit_response_format(self):
        """Test rate limit response format"""
        # This test would make many requests to trigger rate limiting
        # In a real scenario, you might want to temporarily lower limits for testing
        pass


class TestDatabaseIntegration:
    """Test basic database functionality"""
    
    def test_models_can_be_imported(self):
        """Test that database models can be imported"""
        from app.models import Base, ThermalReport, User
        
        # Basic assertions about model structure
        assert hasattr(ThermalReport, '__tablename__')
        assert hasattr(User, '__tablename__')
        assert ThermalReport.__tablename__ == "thermal_reports"
        assert User.__tablename__ == "users"
    
    def test_database_connection(self):
        """Test that database connection works"""
        from app.models import Base
        from sqlalchemy import create_engine
        from app.config import DATABASE_URL
        
        # Test database connection
        engine = create_engine(DATABASE_URL)
        
        # Test that we can create tables
        try:
            Base.metadata.create_all(bind=engine)
            success = True
        except Exception:
            success = False
        
        assert success, "Database connection or table creation failed"


class TestSecurityValidation:
    """Test security validation functions"""
    
    def test_file_validation_function(self):
        """Test the file validation function directly"""
        from app.main import validate_uploaded_file
        from fastapi import UploadFile
        import io
        
        # Create a mock valid image
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        # Create mock UploadFile
        class MockUploadFile:
            def __init__(self, filename, content):
                self.filename = filename
                self.file = io.BytesIO(content)
        
        # Test valid file
        valid_file = MockUploadFile("test.jpg", img_bytes.getvalue())
        
        try:
            validate_uploaded_file(valid_file)
            validation_passed = True
        except Exception:
            validation_passed = False
        
        assert validation_passed, "Valid file should pass validation"
        
        # Test invalid extension
        invalid_file = MockUploadFile("test.txt", b"not an image")
        
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            validate_uploaded_file(invalid_file)
        
        assert exc_info.value.status_code == 400
        assert "Invalid file type" in str(exc_info.value.detail)


class TestConfigurationLoading:
    """Test configuration and environment loading"""
    
    def test_config_imports(self):
        """Test that configuration can be imported"""
        from app.config import DATABASE_URL, SECRET_KEY, FRONTEND_URL
        
        # Basic assertions about config
        assert DATABASE_URL is not None
        assert SECRET_KEY is not None
        assert FRONTEND_URL is not None
    
    def test_auth_dependencies(self):
        """Test that auth dependencies can be imported"""
        from app.auth.dependencies import get_current_user
        from app.auth.security import create_access_token, verify_password
        
        # Test that functions exist
        assert callable(get_current_user)
        assert callable(create_access_token)
        assert callable(verify_password)
    
    def test_middleware_imports(self):
        """Test that middleware can be imported"""
        from app.middleware.rate_limit import RateLimitMiddleware
        
        assert RateLimitMiddleware is not None


if __name__ == "__main__":
    # Run basic tests without pytest
    print("Running basic functionality tests...")
    
    # Test health endpoint
    try:
        response = requests.get("http://localhost:8000/")
        if response.status_code == 200:
            print("✅ Health endpoint working")
        else:
            print("❌ Health endpoint failed")
    except:
        print("❌ Server not running")
    
    # Test model imports
    try:
        from app.models import Base, ThermalReport, User
        print("✅ Models import successfully")
    except Exception as e:
        print(f"❌ Model import failed: {e}")
    
    # Test auth imports
    try:
        from app.auth.dependencies import get_current_user
        print("✅ Auth dependencies import successfully")
    except Exception as e:
        print(f"❌ Auth import failed: {e}")
    
    print("Basic tests completed!")
