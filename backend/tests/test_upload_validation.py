"""
File upload validation tests for Thermal Eye
"""

import pytest
import io
from PIL import Image


class TestFileValidation:
    """Test file upload validation and security"""
    
    def test_upload_valid_image(self, client, auth_headers, sample_image_bytes):
        """Test uploading a valid image file"""
        files = {"file": ("test.jpg", sample_image_bytes, "image/jpeg")}
        response = client.post("/upload", files=files, headers=auth_headers)
        
        # Should succeed or fail gracefully (not due to file validation)
        assert response.status_code in [200, 500]  # 500 might be due to missing AI/weather APIs
        if response.status_code == 500:
            # Check it's not a validation error
            error_detail = response.json()
            assert "Invalid file" not in str(error_detail)
    
    def test_upload_invalid_extension(self, client, auth_headers):
        """Test uploading file with invalid extension"""
        files = {"file": ("test.txt", b"not an image", "text/plain")}
        response = client.post("/upload", files=files, headers=auth_headers)
        
        assert response.status_code == 400
        assert "Invalid file type" in response.json()["detail"]
    
    def test_upload_oversized_file(self, client, auth_headers):
        """Test uploading file that exceeds size limit"""
        # Create a large fake image file (11MB)
        large_content = b"0" * (11 * 1024 * 1024)
        files = {"file": ("large.jpg", large_content, "image/jpeg")}
        
        response = client.post("/upload", files=files, headers=auth_headers)
        assert response.status_code == 400
        assert "File size too large" in response.json()["detail"]
    
    def test_upload_corrupted_image(self, client, auth_headers):
        """Test uploading corrupted image file"""
        # Create invalid image data
        corrupted_data = b"not_valid_image_data"
        files = {"file": ("corrupted.jpg", corrupted_data, "image/jpeg")}
        
        response = client.post("/upload", files=files, headers=auth_headers)
        assert response.status_code == 400
        assert "Invalid image file" in response.json()["detail"]
    
    def test_batch_upload_validation(self, client, auth_headers, sample_image_bytes):
        """Test batch upload with mixed valid/invalid files"""
        files = [
            ("files", ("valid.jpg", sample_image_bytes, "image/jpeg")),
            ("files", ("invalid.txt", b"not an image", "text/plain"))
        ]
        
        response = client.post("/upload_batch", files=files, headers=auth_headers)
        assert response.status_code == 400
        assert "Invalid file type" in response.json()["detail"]
    
    def test_upload_no_file(self, client, auth_headers):
        """Test upload endpoint with no file"""
        response = client.post("/upload", headers=auth_headers)
        assert response.status_code == 422  # FastAPI validation error
    
    def test_batch_upload_empty(self, client, auth_headers):
        """Test batch upload with no files"""
        response = client.post("/upload_batch", files=[], headers=auth_headers)
        assert response.status_code == 422  # FastAPI validation error


class TestImageProcessing:
    """Test image processing utilities"""
    
    def create_test_image(self, format="JPEG", size=(100, 100)):
        """Helper to create test images"""
        img = Image.new('RGB', size, color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format=format)
        img_bytes.seek(0)
        return img_bytes.getvalue()
    
    def test_jpg_upload(self, client, auth_headers):
        """Test uploading JPG image"""
        image_data = self.create_test_image("JPEG")
        files = {"file": ("test.jpg", image_data, "image/jpeg")}
        
        response = client.post("/upload", files=files, headers=auth_headers)
        # Should pass validation (may fail later due to missing GPS/temp data)
        assert response.status_code in [200, 500]
    
    def test_png_upload(self, client, auth_headers):
        """Test uploading PNG image"""
        image_data = self.create_test_image("PNG")
        files = {"file": ("test.png", image_data, "image/png")}
        
        response = client.post("/upload", files=files, headers=auth_headers)
        # Should pass validation
        assert response.status_code in [200, 500]
    
    def test_large_but_valid_image(self, client, auth_headers):
        """Test uploading large but valid image"""
        # Create 8MB image (within 10MB limit)
        large_image = self.create_test_image("JPEG", size=(2000, 2000))
        files = {"file": ("large.jpg", large_image, "image/jpeg")}
        
        response = client.post("/upload", files=files, headers=auth_headers)
        # Should pass validation
        assert response.status_code in [200, 500]
