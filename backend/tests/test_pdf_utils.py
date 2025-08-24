#!/usr/bin/env python3
"""
Unit tests for PDF generation utilities
"""

import pytest
import tempfile
import os
from unittest.mock import Mock, patch
from datetime import datetime

from app.pdf_utils import PDFLayoutManager, create_combined_pdf_enhanced, create_simple_fallback_pdf
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch


class TestPDFLayoutManager:
    """Test PDF layout manager functionality"""
    
    def test_initialization_default(self):
        """Test PDFLayoutManager initialization with defaults"""
        layout = PDFLayoutManager()
        
        assert layout.pagesize == letter
        assert layout.page_width == letter[0]
        assert layout.page_height == letter[1]
        assert layout.margins['top'] == 1.0
        assert layout.margins['bottom'] == 1.0
        assert layout.margins['left'] == 0.75
        assert layout.margins['right'] == 0.75
        
        # Check content area calculation
        expected_width = letter[0] - (0.75 + 0.75) * inch
        expected_height = letter[1] - (1.0 + 1.0) * inch
        assert layout.content_width == expected_width
        assert layout.content_height == expected_height
    
    def test_initialization_custom_margins(self):
        """Test PDFLayoutManager with custom margins"""
        custom_margins = {
            'top': 0.5,
            'bottom': 0.5,
            'left': 1.0,
            'right': 1.0
        }
        layout = PDFLayoutManager(margins=custom_margins)
        
        assert layout.margins == custom_margins
        expected_width = letter[0] - (1.0 + 1.0) * inch
        assert layout.content_width == expected_width
    
    def test_calculate_table_column_widths_equal_priority(self):
        """Test column width calculation with equal priorities"""
        layout = PDFLayoutManager()
        columns = [
            {'header': 'Col1', 'priority': 1.0},
            {'header': 'Col2', 'priority': 1.0},
            {'header': 'Col3', 'priority': 1.0}
        ]
        
        widths = layout.calculate_table_column_widths(columns)
        
        assert len(widths) == 3
        # All widths should be approximately equal
        expected_width = layout.content_width / 3
        for width in widths:
            assert abs(width - expected_width) < 0.01 * inch
    
    def test_calculate_table_column_widths_different_priorities(self):
        """Test column width calculation with different priorities"""
        layout = PDFLayoutManager()
        columns = [
            {'header': 'Small', 'priority': 1.0},
            {'header': 'Large', 'priority': 2.0},
            {'header': 'Medium', 'priority': 1.5}
        ]
        
        widths = layout.calculate_table_column_widths(columns)
        
        assert len(widths) == 3
        # Large column should be wider than small column
        assert widths[1] > widths[0]  # Large > Small
        assert widths[2] > widths[0]  # Medium > Small
        assert widths[1] > widths[2]  # Large > Medium
        
        # Total should equal content width
        assert abs(sum(widths) - layout.content_width) < 0.01 * inch
    
    def test_calculate_table_column_widths_minimum_enforced(self):
        """Test that minimum column width is enforced"""
        layout = PDFLayoutManager()
        min_width = 1.0  # 1 inch minimum
        
        columns = [
            {'header': 'Tiny', 'priority': 0.1},
            {'header': 'Huge', 'priority': 10.0}
        ]
        
        widths = layout.calculate_table_column_widths(columns, min_col_width=min_width)
        
        # First column should be at least minimum width
        assert widths[0] >= min_width * inch
    
    def test_wrap_text_for_column_short_text(self):
        """Test text wrapping for text that fits in column"""
        layout = PDFLayoutManager()
        text = "Short text"
        col_width = 2.0 * inch
        
        result = layout.wrap_text_for_column(text, col_width)
        
        assert result == text
        assert '\n' not in result
    
    def test_wrap_text_for_column_long_text(self):
        """Test text wrapping for text that needs wrapping"""
        layout = PDFLayoutManager()
        text = "This is a very long piece of text that should be wrapped across multiple lines"
        col_width = 1.0 * inch  # Small column
        
        result = layout.wrap_text_for_column(text, col_width)
        
        # Should contain line breaks
        assert '\n' in result
        # Should not exceed 3 lines
        lines = result.split('\n')
        assert len(lines) <= 3
    
    def test_wrap_text_for_column_none_input(self):
        """Test text wrapping with None input"""
        layout = PDFLayoutManager()
        
        result = layout.wrap_text_for_column(None, 2.0 * inch)
        assert result == 'N/A'
    
    def test_wrap_text_for_column_non_string_input(self):
        """Test text wrapping with non-string input"""
        layout = PDFLayoutManager()
        
        result = layout.wrap_text_for_column(12345, 2.0 * inch)
        assert result == '12345'
    
    def test_create_enhanced_table_style_with_header(self):
        """Test enhanced table style creation with header"""
        layout = PDFLayoutManager()
        
        style = layout.create_enhanced_table_style(has_header=True)
        
        # Should have header styling commands
        commands = style.getCommands()
        assert len(commands) > 0
        
        # Check for header background command
        bg_commands = [cmd for cmd in commands if cmd[0] == 'BACKGROUND']
        assert len(bg_commands) > 0
    
    def test_create_enhanced_table_style_no_header(self):
        """Test enhanced table style creation without header"""
        layout = PDFLayoutManager()
        
        style = layout.create_enhanced_table_style(has_header=False)
        
        commands = style.getCommands()
        assert len(commands) > 0
        
        # Should still have grid and basic styling
        grid_commands = [cmd for cmd in commands if cmd[0] == 'GRID']
        assert len(grid_commands) > 0


class TestPDFGeneration:
    """Test PDF generation functions"""
    
    def test_create_simple_fallback_pdf(self):
        """Test creation of simple fallback PDF"""
        # Create mock reports
        mock_reports = [
            Mock(fault_level='CRITICAL'),
            Mock(fault_level='WARNING'),
            Mock(fault_level='NORMAL')
        ]
        
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            output_path = tmp_file.name
        
        try:
            result_path = create_simple_fallback_pdf(mock_reports, output_path)
            
            assert result_path == output_path
            assert os.path.exists(output_path)
            assert os.path.getsize(output_path) > 0  # File should have content
            
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)
    
    def test_create_combined_pdf_enhanced_empty_reports(self):
        """Test enhanced PDF creation with empty reports list"""
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            output_path = tmp_file.name
        
        try:
            result_path = create_combined_pdf_enhanced([], output_path)
            
            assert result_path == output_path
            assert os.path.exists(output_path)
            assert os.path.getsize(output_path) > 0
            
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)
    
    def test_create_combined_pdf_enhanced_with_reports(self):
        """Test enhanced PDF creation with sample reports"""
        # Create mock ThermalReport objects
        mock_reports = []
        for i in range(3):
            report = Mock()
            report.id = i + 1
            report.fault_level = ['CRITICAL', 'WARNING', 'NORMAL'][i]
            report.analysis_status = 'success'
            report.image_temp = 35.0 + i * 5
            report.delta_t = 5.0 + i * 2
            report.threshold_used = 30.0
            report.tower_name = f'Tower {i+1}'
            report.camp_name = f'Camp {i+1}'
            report.image_path = f'/path/to/image{i+1}.jpg'
            mock_reports.append(report)
        
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            output_path = tmp_file.name
        
        try:
            result_path = create_combined_pdf_enhanced(mock_reports, output_path)
            
            assert result_path == output_path
            assert os.path.exists(output_path)
            assert os.path.getsize(output_path) > 1000  # Should be substantial file
            
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)
    
    @patch('app.pdf_utils.SimpleDocTemplate')
    def test_create_combined_pdf_enhanced_handles_exceptions(self, mock_doc_class):
        """Test that enhanced PDF creation handles exceptions gracefully"""
        # Mock document to raise exception during build
        mock_doc = Mock()
        mock_doc.build.side_effect = Exception("PDF build failed")
        mock_doc_class.return_value = mock_doc
        
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            output_path = tmp_file.name
        
        try:
            # Should raise exception since both main and fallback fail
            with pytest.raises(Exception):
                create_combined_pdf_enhanced([], output_path)
            
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)


@pytest.fixture
def sample_thermal_reports():
    """Fixture providing sample ThermalReport objects for testing"""
    reports = []
    
    for i in range(5):
        report = Mock()
        report.id = i + 1
        report.fault_level = ['CRITICAL', 'WARNING', 'NORMAL', 'CRITICAL', 'NORMAL'][i]
        report.analysis_status = 'success'
        report.image_temp = 30.0 + i * 3
        report.delta_t = i * 2.5
        report.threshold_used = 28.0 + i
        report.tower_name = f'Tower-{i+1:03d}'
        report.camp_name = f'North-Camp-{i+1}'
        report.image_path = f'/uploads/thermal_image_{i+1:04d}.jpg'
        reports.append(report)
    
    return reports


def test_pdf_generation_integration(sample_thermal_reports):
    """Integration test for PDF generation with realistic data"""
    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
        output_path = tmp_file.name
    
    try:
        result_path = create_combined_pdf_enhanced(sample_thermal_reports, output_path)
        
        # Verify file was created successfully
        assert os.path.exists(result_path)
        assert os.path.getsize(result_path) > 2000  # Should be substantial
        
        # Verify it's a valid PDF (basic check)
        with open(result_path, 'rb') as f:
            header = f.read(4)
            assert header == b'%PDF'  # PDF files start with %PDF
            
    finally:
        if os.path.exists(output_path):
            os.unlink(output_path)


def test_pdf_column_width_math():
    """Test that column width calculations are mathematically correct"""
    layout = PDFLayoutManager()
    
    # Test with 6 columns like in the thermal report
    columns = [
        {'header': 'Image', 'priority': 1.5},
        {'header': 'Temp', 'priority': 0.8},
        {'header': 'Delta', 'priority': 0.8},
        {'header': 'Threshold', 'priority': 1.0},
        {'header': 'Status', 'priority': 0.8},
        {'header': 'Location', 'priority': 2.0}
    ]
    
    widths = layout.calculate_table_column_widths(columns)
    
    # Total width should equal content width
    total_width = sum(widths)
    assert abs(total_width - layout.content_width) < 0.001 * inch
    
    # All widths should be positive
    for width in widths:
        assert width > 0
    
    # Location column should be widest (highest priority)
    location_width = widths[5]
    for i, width in enumerate(widths):
        if i != 5:  # Skip the location column itself
            assert location_width >= width
