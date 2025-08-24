"""
Test configuration and fixtures for Thermal Eye backend tests
"""

import pytest
import tempfile
import os
from starlette.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app, get_db
from app.models import Base


@pytest.fixture(scope="function")
def test_db():
    """Create a temporary test database"""
    # Create temporary database file
    db_fd, db_path = tempfile.mkstemp(suffix='.db')
    os.close(db_fd)
    
    # Create test database engine
    test_engine = create_engine(f"sqlite:///{db_path}")
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    
    # Create all tables
    Base.metadata.create_all(bind=test_engine)
    
    def override_get_db():
        try:
            db = TestingSessionLocal()
            yield db
        finally:
            db.close()
    
    # Override the database dependency
    app.dependency_overrides[get_db] = override_get_db
    
    yield TestingSessionLocal
    
    # Cleanup
    os.unlink(db_path)
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def client(test_db):
    """Create test client with test database"""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="function")
def admin_user(client):
    """Create admin user for testing"""
    user_data = {
        "email": "test_admin@example.com",
        "password": "testpass123",
        "role": "admin"
    }
    
    response = client.post("/auth/register", json=user_data)
    assert response.status_code == 200
    
    return user_data


@pytest.fixture(scope="function")
def admin_token(client, admin_user):
    """Get admin token for authenticated requests"""
    form_data = {
        "username": admin_user["email"],
        "password": admin_user["password"]
    }
    
    response = client.post("/auth/login", data=form_data)
    assert response.status_code == 200
    
    return response.json()["access_token"]


@pytest.fixture(scope="function")
def auth_headers(admin_token):
    """Get authorization headers for authenticated requests"""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def sample_image_bytes():
    """Create a minimal valid image for testing"""
    from PIL import Image
    import io
    
    # Create a small test image
    img = Image.new('RGB', (100, 100), color='red')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    
    return img_bytes.getvalue()
