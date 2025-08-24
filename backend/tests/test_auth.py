"""
Authentication tests for Thermal Eye
"""

import pytest
from fastapi.testclient import TestClient


class TestAuthentication:
    """Test authentication endpoints and security"""
    
    def test_register_first_admin(self, client):
        """Test registering the first admin user"""
        user_data = {
            "email": "admin@example.com",
            "password": "testpass123",
            "role": "admin"
        }
        
        response = client.post("/auth/register", json=user_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["email"] == user_data["email"]
        assert data["role"] == "admin"
        assert "id" in data
        assert "created_at" in data
    
    def test_register_prevents_duplicate_email(self, client, admin_user):
        """Test that duplicate email registration is prevented"""
        response = client.post("/auth/register", json=admin_user)
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]
    
    def test_register_prevents_additional_users(self, client, admin_user):
        """Test that registration is blocked after first user"""
        new_user_data = {
            "email": "user2@example.com",
            "password": "testpass123",
            "role": "viewer"
        }
        
        response = client.post("/auth/register", json=new_user_data)
        assert response.status_code == 403
        assert "not allowed" in response.json()["detail"]
    
    def test_login_success(self, client, admin_user):
        """Test successful login"""
        form_data = {
            "username": admin_user["email"],
            "password": admin_user["password"]
        }
        
        response = client.post("/auth/login", data=form_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
    
    def test_login_invalid_credentials(self, client, admin_user):
        """Test login with invalid credentials"""
        form_data = {
            "username": admin_user["email"],
            "password": "wrongpassword"
        }
        
        response = client.post("/auth/login", data=form_data)
        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]
    
    def test_login_nonexistent_user(self, client):
        """Test login with non-existent user"""
        form_data = {
            "username": "nonexistent@example.com",
            "password": "password"
        }
        
        response = client.post("/auth/login", data=form_data)
        assert response.status_code == 401
    
    def test_get_user_info_authenticated(self, client, auth_headers, admin_user):
        """Test getting user info with valid token"""
        response = client.get("/auth/me", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["email"] == admin_user["email"]
        assert data["role"] == admin_user["role"]
    
    def test_get_user_info_unauthenticated(self, client):
        """Test getting user info without token"""
        response = client.get("/auth/me")
        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]
    
    def test_get_user_info_invalid_token(self, client):
        """Test getting user info with invalid token"""
        headers = {"Authorization": "Bearer invalid_token"}
        response = client.get("/auth/me", headers=headers)
        assert response.status_code == 401


class TestProtectedEndpoints:
    """Test that endpoints are properly protected"""
    
    def test_reports_requires_auth(self, client):
        """Test that /reports requires authentication"""
        response = client.get("/reports")
        assert response.status_code == 401
    
    def test_upload_requires_auth(self, client, sample_image_bytes):
        """Test that /upload requires authentication"""
        files = {"file": ("test.jpg", sample_image_bytes, "image/jpeg")}
        response = client.post("/upload", files=files)
        assert response.status_code == 401
    
    def test_upload_batch_requires_auth(self, client, sample_image_bytes):
        """Test that /upload_batch requires authentication"""
        files = [("files", ("test.jpg", sample_image_bytes, "image/jpeg"))]
        response = client.post("/upload_batch", files=files)
        assert response.status_code == 401
    
    def test_generate_report_requires_auth(self, client):
        """Test that /generate_report requires authentication"""
        response = client.get("/generate_report/1")
        assert response.status_code == 401
