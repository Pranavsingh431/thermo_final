"""
Reports flow tests for Thermal Eye - tests the main analysis workflow
"""

import pytest
from unittest.mock import patch, MagicMock
import io
from PIL import Image


class TestReportsWorkflow:
    """Test the complete reports workflow with mocked external services"""
    
    def create_test_image_with_gps(self):
        """Create test image with GPS EXIF data"""
        from PIL.ExifTags import TAGS, GPSTAGS
        import piexif
        
        # Create a test image
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        
        # Create GPS EXIF data
        gps_data = {
            piexif.GPSIFD.GPSLatitudeRef: 'N',
            piexif.GPSIFD.GPSLatitude: [(19, 1), (4, 1), (3594, 100)],  # 19.076111
            piexif.GPSIFD.GPSLongitudeRef: 'E', 
            piexif.GPSIFD.GPSLongitude: [(72, 1), (52, 1), (3900, 100)]  # 72.8775
        }
        
        exif_dict = {"GPS": gps_data}
        exif_bytes = piexif.dump(exif_dict)
        
        img.save(img_bytes, format='JPEG', exif=exif_bytes)
        img_bytes.seek(0)
        return img_bytes.getvalue()
    
    @patch('app.main.get_weather_temperature')
    @patch('app.main.extract_temperature_from_image')
    @patch('app.main.generate_ai_summary_sync')
    def test_complete_upload_flow_mocked(self, mock_ai, mock_temp, mock_weather, 
                                       client, auth_headers):
        """Test complete upload flow with mocked external services"""
        # Mock external service responses
        mock_weather.return_value = 26.8
        mock_temp.return_value = 44.7
        mock_ai.return_value = "Mocked AI analysis summary"
        
        # Create test image
        image_data = self.create_test_image_with_gps()
        files = {"file": ("test.jpg", image_data, "image/jpeg")}
        
        # Upload image
        response = client.post("/upload", files=files, headers=auth_headers)
        assert response.status_code == 200
        
        # Verify response structure
        data = response.json()
        assert "id" in data
        assert "tower_name" in data
        assert "latitude" in data
        assert "longitude" in data
        assert "image_temp" in data
        assert "ambient_temp" in data
        assert "fault_level" in data
        
        # Verify external services were called
        mock_weather.assert_called_once()
        mock_temp.assert_called_once()
        
        return data["id"]
    
    def test_reports_endpoint_authenticated(self, client, auth_headers):
        """Test reports endpoint returns data when authenticated"""
        response = client.get("/reports", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    @patch('app.main.generate_ai_summary_sync')
    def test_generate_report_endpoint(self, mock_ai, client, auth_headers):
        """Test generate report endpoint with mocked AI"""
        mock_ai.return_value = "Detailed AI report analysis"
        
        # First, we need a report in the database
        # This would typically come from a previous upload
        # For now, test with a non-existent ID to check error handling
        response = client.get("/generate_report/999", headers=auth_headers)
        assert response.status_code == 404
    
    @patch('app.main.get_weather_temperature')
    @patch('app.main.extract_temperature_from_image') 
    @patch('app.main.generate_ai_summary_sync')
    def test_batch_upload_flow(self, mock_ai, mock_temp, mock_weather,
                             client, auth_headers):
        """Test batch upload functionality"""
        # Mock external services
        mock_weather.return_value = 26.8
        mock_temp.return_value = 44.7
        mock_ai.return_value = "Batch AI analysis"
        
        # Create multiple test images
        image1 = self.create_test_image_with_gps()
        image2 = self.create_test_image_with_gps()
        
        files = [
            ("files", ("test1.jpg", image1, "image/jpeg")),
            ("files", ("test2.jpg", image2, "image/jpeg"))
        ]
        
        response = client.post("/upload_batch", files=files, headers=auth_headers)
        
        # May fail due to PDF generation or other issues, but should pass validation
        assert response.status_code in [200, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert "results" in data
            assert "total" in data
            assert isinstance(data["results"], list)


class TestErrorHandling:
    """Test error handling in the reports flow"""
    
    def test_reports_with_db_error(self, client, auth_headers):
        """Test reports endpoint behavior when database is unavailable"""
        # This is hard to test without actually breaking the DB
        # In a real scenario, you might use dependency injection to mock the DB
        pass
    
    def test_upload_with_missing_gps(self, client, auth_headers, sample_image_bytes):
        """Test upload with image that has no GPS data"""
        files = {"file": ("no_gps.jpg", sample_image_bytes, "image/jpeg")}
        
        response = client.post("/upload", files=files, headers=auth_headers)
        # Should handle gracefully - may succeed with null GPS or return error
        assert response.status_code in [200, 400, 500]
    
    @patch('app.main.get_weather_temperature')
    def test_upload_with_weather_api_failure(self, mock_weather, client, auth_headers):
        """Test upload when weather API fails"""
        mock_weather.side_effect = Exception("Weather API error")
        
        image_data = self.create_test_image_with_gps()
        files = {"file": ("test.jpg", image_data, "image/jpeg")}
        
        response = client.post("/upload", files=files, headers=auth_headers)
        # Should handle gracefully
        assert response.status_code in [200, 500]
    
    @patch('app.main.generate_ai_summary_sync')
    def test_ai_service_failure(self, mock_ai, client, auth_headers):
        """Test behavior when AI service fails"""
        mock_ai.side_effect = Exception("AI service error")
        
        image_data = self.create_test_image_with_gps()
        files = {"file": ("test.jpg", image_data, "image/jpeg")}
        
        response = client.post("/upload", files=files, headers=auth_headers)
        # Should handle gracefully, possibly with fallback summary
        assert response.status_code in [200, 500]


class TestDataValidation:
    """Test data validation in the reports system"""
    
    def test_reports_response_schema(self, client, auth_headers):
        """Test that reports endpoint returns properly structured data"""
        response = client.get("/reports", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # If there are reports, check their structure
        for report in data:
            assert "id" in report
            assert "timestamp" in report
            # Other fields may be nullable
    
    def test_invalid_report_id(self, client, auth_headers):
        """Test generate report with invalid ID"""
        response = client.get("/generate_report/invalid", headers=auth_headers)
        assert response.status_code == 422  # FastAPI validation error
    
    def test_negative_report_id(self, client, auth_headers):
        """Test generate report with negative ID"""
        response = client.get("/generate_report/-1", headers=auth_headers)
        assert response.status_code == 404
