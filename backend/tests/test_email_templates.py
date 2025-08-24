#!/usr/bin/env python3
"""
Unit tests for email template system
"""

import pytest
from datetime import datetime
from app.email_templates import generate_critical_alert_email, generate_batch_alert_email


class TestCriticalAlertEmail:
    """Test critical alert email generation"""
    
    def test_generate_critical_alert_basic(self):
        """Test basic critical alert email generation"""
        report_data = {
            'id': 123,
            'tower_name': 'Tower A',
            'camp_name': 'North Camp',
            'voltage_kv': 220,
            'capacity_amps': 900,
            'image_temp': 45.2,
            'threshold_used': 35.0,
            'delta_t': 10.2,
            'priority': 'CRITICAL',
            'latitude': 19.076047,
            'longitude': 72.877656,
            'timestamp': datetime(2024, 1, 15, 10, 30, 0)
        }
        
        ai_summary = "Critical overheating detected requiring immediate action."
        
        subject, html_body, text_body = generate_critical_alert_email(report_data, ai_summary)
        
        # Test subject line
        assert "🔴 Critical Thermal Alert" in subject
        assert "Tower A" in subject
        assert "North Camp" in subject
        assert "220 kV" in subject
        
        # Test HTML body content
        assert "CRITICAL THERMAL ALERT" in html_body
        assert "Tower A" in html_body
        assert "North Camp" in html_body
        assert "45.2 °C" in html_body
        assert "35.0 °C" in html_body
        assert "+10.2 °C" in html_body
        assert "GPS: 19.076047, 72.877656" in html_body
        assert ai_summary in html_body
        assert "Report ID: 123" in html_body
        
        # Test text body content
        assert "CRITICAL THERMAL ALERT" in text_body
        assert "Tower A" in text_body
        assert "45.2 °C" in text_body
        assert ai_summary in text_body
        
        # Test HTML structure
        assert "<!DOCTYPE html>" in html_body
        assert "<table" in html_body
        assert "class=\"data-table\"" in html_body
    
    def test_generate_critical_alert_minimal_data(self):
        """Test email generation with minimal data"""
        report_data = {
            'tower_name': None,
            'image_temp': None,
            'threshold_used': None,
            'delta_t': None
        }
        
        subject, html_body, text_body = generate_critical_alert_email(report_data)
        
        # Should handle missing data gracefully
        assert "Unknown Tower" in subject
        assert "N/A" in html_body
        assert "N/A" in text_body
        
        # Should still be valid HTML
        assert "<!DOCTYPE html>" in html_body
        assert "</html>" in html_body
    
    def test_generate_critical_alert_no_coordinates(self):
        """Test email generation without GPS coordinates"""
        report_data = {
            'tower_name': 'Tower B',
            'image_temp': 42.0,
            'latitude': None,
            'longitude': None
        }
        
        subject, html_body, text_body = generate_critical_alert_email(report_data)
        
        # Should not include GPS section when coordinates missing
        assert "GPS:" not in html_body
        assert "GPS:" not in text_body
    
    def test_generate_critical_alert_no_ai_summary(self):
        """Test email generation without AI summary"""
        report_data = {
            'tower_name': 'Tower C',
            'image_temp': 40.0
        }
        
        subject, html_body, text_body = generate_critical_alert_email(report_data, "")
        
        # Should not include AI section when summary is empty
        assert "AI Technical Assessment" not in html_body
        assert "AI TECHNICAL ASSESSMENT" not in text_body
    
    def test_safe_number_formatting(self):
        """Test safe formatting of numerical values"""
        report_data = {
            'tower_name': 'Tower D',
            'image_temp': 'invalid',  # Invalid data type
            'threshold_used': None,
            'delta_t': float('inf')  # Invalid number
        }
        
        subject, html_body, text_body = generate_critical_alert_email(report_data)
        
        # Should handle invalid numbers gracefully
        assert "N/A" in html_body
        assert "N/A" in text_body
        # Should not crash or contain error messages


class TestBatchAlertEmail:
    """Test batch alert email generation"""
    
    def test_generate_batch_alert_basic(self):
        """Test basic batch alert email generation"""
        critical_faults = [
            {
                'tower_name': 'Tower A',
                'camp_name': 'North',
                'image_temp': 45.2,
                'delta_t': 10.2,
                'threshold_used': 35.0,
                'id': 1
            },
            {
                'tower_name': 'Tower B',
                'camp_name': 'South',
                'image_temp': 42.8,
                'delta_t': 7.8,
                'threshold_used': 35.0,
                'id': 2
            }
        ]
        
        ai_summary = "Multiple critical anomalies detected across network."
        
        subject, html_body, text_body = generate_batch_alert_email(
            critical_count=2,
            warning_count=3,
            normal_count=5,
            total_count=10,
            top_critical_faults=critical_faults,
            ai_summary=ai_summary
        )
        
        # Test subject line
        assert "🚨 Thermal Inspection Batch Complete" in subject
        assert "2 Critical" in subject
        assert "3 Warning" in subject
        assert "10 total" in subject
        
        # Test HTML body content
        assert "Batch Processing Summary" in html_body
        assert ">2<" in html_body  # Critical count
        assert ">3<" in html_body  # Warning count
        assert ">5<" in html_body  # Normal count
        assert "Tower A" in html_body
        assert "Tower B" in html_body
        assert ai_summary in html_body
        
        # Test text body content
        assert "CRITICAL: 2" in text_body
        assert "WARNING:  3" in text_body
        assert "NORMAL:   5" in text_body
        assert "TOTAL:    10" in text_body
        assert "Tower A" in text_body
        assert ai_summary in text_body
    
    def test_generate_batch_alert_no_critical(self):
        """Test batch email with no critical faults"""
        subject, html_body, text_body = generate_batch_alert_email(
            critical_count=0,
            warning_count=2,
            normal_count=8,
            total_count=10,
            top_critical_faults=[],
            ai_summary=""
        )
        
        # Should not include critical faults section
        assert "Top Critical Faults" not in html_body
        assert "TOP CRITICAL FAULTS" not in text_body
        
        # Should still show counts
        assert ">0<" in html_body  # Critical count
        assert "CRITICAL: 0" in text_body
    
    def test_generate_batch_alert_no_ai_summary(self):
        """Test batch email without AI summary"""
        subject, html_body, text_body = generate_batch_alert_email(
            critical_count=1,
            warning_count=0,
            normal_count=9,
            total_count=10,
            top_critical_faults=[],
            ai_summary=""
        )
        
        # Should not include AI section when summary is empty
        assert "AI Batch Analysis" not in html_body
        assert "AI BATCH ANALYSIS" not in text_body
    
    def test_generate_batch_alert_limits_critical_faults(self):
        """Test that batch email limits critical faults to top 5"""
        # Create 10 critical faults
        critical_faults = [
            {
                'tower_name': f'Tower {i}',
                'image_temp': 40.0 + i,
                'delta_t': 5.0 + i,
                'id': i
            }
            for i in range(10)
        ]
        
        subject, html_body, text_body = generate_batch_alert_email(
            critical_count=10,
            warning_count=0,
            normal_count=0,
            total_count=10,
            top_critical_faults=critical_faults
        )
        
        # Should only include first 5 faults
        assert "Tower 0" in html_body
        assert "Tower 4" in html_body
        assert "Tower 9" not in html_body  # Should be excluded
        
        # Count occurrences in text body
        tower_count = text_body.count("Tower")
        assert tower_count == 5  # Should be exactly 5 towers listed
    
    def test_batch_alert_html_structure(self):
        """Test that batch alert generates valid HTML structure"""
        subject, html_body, text_body = generate_batch_alert_email(
            critical_count=1,
            warning_count=1,
            normal_count=1,
            total_count=3
        )
        
        # Test HTML structure
        assert "<!DOCTYPE html>" in html_body
        assert "<html>" in html_body
        assert "</html>" in html_body
        assert "<head>" in html_body
        assert "<body>" in html_body
        assert 'charset="UTF-8"' in html_body
        
        # Test CSS styling
        assert "background-color" in html_body
        assert "font-family" in html_body


@pytest.fixture
def sample_report_data():
    """Sample thermal report data for testing"""
    return {
        'id': 42,
        'tower_name': 'Test Tower',
        'camp_name': 'Test Camp',
        'voltage_kv': 110,
        'capacity_amps': 600,
        'image_temp': 38.5,
        'threshold_used': 30.0,
        'delta_t': 8.5,
        'priority': 'HIGH',
        'latitude': 19.0,
        'longitude': 72.8,
        'timestamp': datetime(2024, 1, 15, 12, 0, 0)
    }


def test_email_template_encoding_utf8(sample_report_data):
    """Test that email templates handle UTF-8 encoding correctly"""
    # Include special characters in data
    sample_report_data['tower_name'] = 'Tower Tëst 🗼'
    sample_report_data['camp_name'] = 'Çamp Tëst'
    
    ai_summary = "Analysis with special chars: 🌡️ °C ± Δ"
    
    subject, html_body, text_body = generate_critical_alert_email(
        sample_report_data, ai_summary
    )
    
    # Should handle special characters without errors
    assert 'Tower Tëst 🗼' in subject
    assert 'Çamp Tëst' in html_body
    assert '🌡️' in html_body
    assert 'Tower Tëst 🗼' in text_body


def test_email_timestamp_formatting(sample_report_data):
    """Test timestamp formatting in emails"""
    # Test with datetime object
    sample_report_data['timestamp'] = datetime(2024, 1, 15, 10, 30, 45)
    
    subject, html_body, text_body = generate_critical_alert_email(sample_report_data)
    
    # Should format datetime properly
    assert "January 15, 2024 at 10:30:45 UTC" in html_body
    assert "January 15, 2024 at 10:30:45 UTC" in text_body
    
    # Test with string timestamp
    sample_report_data['timestamp'] = "2024-01-15T10:30:45Z"
    
    subject2, html_body2, text_body2 = generate_critical_alert_email(sample_report_data)
    
    # Should handle string timestamps
    assert "2024-01-15T10:30:45Z" in html_body2
