#!/usr/bin/env python3
"""
PDF generation utilities for Thermal Eye
Provides enhanced PDF formatting with proper column width calculations
"""

import os
from typing import List, Optional
from datetime import datetime

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.units import inch, cm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


class PDFLayoutManager:
    """Manages PDF layout calculations and prevents text overlap"""
    
    def __init__(self, pagesize=letter, margins=None):
        self.pagesize = pagesize
        self.page_width, self.page_height = pagesize
        
        # Default margins (in inches)
        if margins is None:
            margins = {
                'top': 1.0,
                'bottom': 1.0, 
                'left': 0.75,
                'right': 0.75
            }
        self.margins = margins
        
        # Calculate available content area
        self.content_width = self.page_width - (margins['left'] + margins['right']) * inch
        self.content_height = self.page_height - (margins['top'] + margins['bottom']) * inch
    
    def calculate_table_column_widths(self, column_data: List[dict], min_col_width: float = 0.5) -> List[float]:
        """
        Calculate optimal column widths based on content and available space
        
        Args:
            column_data: List of dicts with 'header', 'sample_content', 'priority' keys
            min_col_width: Minimum column width in inches
            
        Returns:
            List of column widths in inches
        """
        total_cols = len(column_data)
        base_width = self.content_width / total_cols
        
        # Calculate relative priorities
        total_priority = sum(col.get('priority', 1.0) for col in column_data)
        
        widths = []
        for col in column_data:
            priority = col.get('priority', 1.0)
            width = (priority / total_priority) * self.content_width
            width = max(width, min_col_width * inch)  # Enforce minimum
            widths.append(width)
        
        # Normalize to fit within available width while respecting minimums
        current_total = sum(widths)
        if current_total > self.content_width:
            # Calculate how much we need to reduce
            excess = current_total - self.content_width
            # Only scale down non-minimum columns
            scalable_width = sum(w for w in widths if w > min_col_width * inch)
            if scalable_width > 0:
                scale_factor = max(0.5, (scalable_width - excess) / scalable_width)
                for i, w in enumerate(widths):
                    if w > min_col_width * inch:
                        widths[i] = max(min_col_width * inch, w * scale_factor)
        
        return widths
    
    def wrap_text_for_column(self, text: str, col_width: float, font_size: int = 9) -> str:
        """
        Wrap text to fit within column width
        Simple character-based wrapping for ReportLab compatibility
        """
        if not text or not isinstance(text, str):
            return str(text) if text is not None else 'N/A'
        
        # Approximate characters per inch for given font size
        chars_per_inch = 12 - (font_size - 9) * 0.5
        max_chars = int(col_width / inch * chars_per_inch)
        
        if len(text) <= max_chars:
            return text
        
        # Simple word wrapping
        words = text.split()
        lines = []
        current_line = ""
        
        for word in words:
            if len(current_line + " " + word) <= max_chars:
                current_line += (" " + word) if current_line else word
            else:
                if current_line:
                    lines.append(current_line)
                current_line = word[:max_chars]  # Truncate very long words
        
        if current_line:
            lines.append(current_line)
        
        return "\n".join(lines[:3])  # Limit to 3 lines max
    
    def create_enhanced_table_style(self, has_header: bool = True) -> TableStyle:
        """Create a comprehensive table style with proper spacing"""
        style_commands = []
        
        if has_header:
            # Header styling
            style_commands.extend([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('TOPPADDING', (0, 0), (-1, 0), 8),
            ])
        
        # Data row styling
        style_commands.extend([
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ])
        
        # Alternating row colors for readability
        return TableStyle(style_commands)


def create_combined_pdf_enhanced(reports: List, output_path: str) -> str:
    """
    Generate enhanced combined PDF report with proper formatting
    
    Args:
        reports: List of ThermalReport objects
        output_path: Path where PDF should be saved
        
    Returns:
        Path to generated PDF file
    """
    # Initialize PDF layout manager
    layout = PDFLayoutManager(pagesize=letter)
    
    # Create document with calculated margins
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        topMargin=layout.margins['top'] * inch,
        bottomMargin=layout.margins['bottom'] * inch,
        leftMargin=layout.margins['left'] * inch,
        rightMargin=layout.margins['right'] * inch,
    )
    
    story = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.darkblue,
        spaceAfter=20,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.grey,
        spaceAfter=20,
        alignment=TA_CENTER,
        fontName='Helvetica-Oblique'
    )
    
    # Title and metadata
    title = Paragraph("🌡️ Thermal Inspection Combined Report", title_style)
    story.append(title)
    
    subtitle = Paragraph(
        f"Generated: {datetime.now().strftime('%B %d, %Y at %H:%M:%S UTC')}",
        subtitle_style
    )
    story.append(subtitle)
    story.append(Spacer(1, 20))
    
    # Summary statistics
    total = len(reports)
    critical = len([r for r in reports if r.fault_level == 'CRITICAL'])
    warning = len([r for r in reports if r.fault_level == 'WARNING'])
    normal = len([r for r in reports if r.fault_level == 'NORMAL'])
    failed = len([r for r in reports if r.analysis_status != 'success'])
    
    # Summary table with proper column widths
    summary_data = [
        ['Metric', 'Count', 'Percentage'],
        ['Total Images Processed', str(total), '100%'],
        ['🔴 CRITICAL Faults', str(critical), f'{(critical/total*100):.1f}%' if total > 0 else '0%'],
        ['🟡 WARNING Issues', str(warning), f'{(warning/total*100):.1f}%' if total > 0 else '0%'],
        ['🟢 NORMAL Readings', str(normal), f'{(normal/total*100):.1f}%' if total > 0 else '0%'],
        ['❌ Analysis Failed', str(failed), f'{(failed/total*100):.1f}%' if total > 0 else '0%'],
    ]
    
    summary_col_widths = layout.calculate_table_column_widths([
        {'header': 'Metric', 'priority': 2.0},
        {'header': 'Count', 'priority': 1.0},
        {'header': 'Percentage', 'priority': 1.0}
    ])
    
    summary_table = Table(summary_data, colWidths=summary_col_widths)
    summary_table.setStyle(layout.create_enhanced_table_style())
    story.append(summary_table)
    story.append(Spacer(1, 20))
    
    # Detailed results table
    if reports:
        # Define column structure with priorities for width calculation
        detail_columns = [
            {'header': 'Image', 'priority': 1.5},
            {'header': 'Temp (°C)', 'priority': 0.8},
            {'header': 'ΔT (°C)', 'priority': 0.8},
            {'header': 'Threshold (°C)', 'priority': 1.0},
            {'header': 'Status', 'priority': 0.8},
            {'header': 'Location', 'priority': 2.0}
        ]
        
        detail_col_widths = layout.calculate_table_column_widths(detail_columns)
        
        # Build table data with text wrapping
        detail_data = [['Image', 'Temp (°C)', 'ΔT (°C)', 'Threshold (°C)', 'Status', 'Location']]
        
        for r in reports:
            # Prepare data with safe formatting
            image_name = os.path.basename(r.image_path) if r.image_path else f"ID {r.id}"
            temp_val = f"{r.image_temp:.1f}" if r.image_temp is not None else 'N/A'
            delta_val = f"{r.delta_t:+.1f}" if r.delta_t is not None else 'N/A'
            threshold_val = f"{r.threshold_used:.1f}" if r.threshold_used is not None else 'N/A'
            status_val = r.fault_level or 'N/A'
            location_val = f"{r.tower_name or 'Unknown'}"
            if r.camp_name:
                location_val += f" ({r.camp_name})"
            
            # Apply text wrapping for each column
            wrapped_data = [
                layout.wrap_text_for_column(image_name, detail_col_widths[0]),
                temp_val,  # Numbers don't need wrapping
                delta_val,
                threshold_val,
                status_val,
                layout.wrap_text_for_column(location_val, detail_col_widths[5])
            ]
            
            detail_data.append(wrapped_data)
        
        # Create table with calculated widths
        detail_table = Table(
            detail_data,
            colWidths=detail_col_widths,
            repeatRows=1  # Repeat header on new pages
        )
        
        # Apply enhanced styling
        detail_style = layout.create_enhanced_table_style()
        
        # Add status-based row coloring
        for i, r in enumerate(reports, start=1):  # Start at 1 to skip header
            if r.fault_level == 'CRITICAL':
                detail_style.add('BACKGROUND', (0, i), (-1, i), colors.Color(1, 0.9, 0.9))
            elif r.fault_level == 'WARNING':
                detail_style.add('BACKGROUND', (0, i), (-1, i), colors.Color(1, 1, 0.9))
            elif r.fault_level == 'NORMAL':
                detail_style.add('BACKGROUND', (0, i), (-1, i), colors.Color(0.9, 1, 0.9))
        
        detail_table.setStyle(detail_style)
        
        # Add section header
        detail_header = Paragraph("📊 Detailed Analysis Results", styles['Heading2'])
        story.append(detail_header)
        story.append(Spacer(1, 10))
        story.append(detail_table)
    
    # Generate PDF
    try:
        doc.build(story)
        print(f"✅ Enhanced combined PDF generated: {output_path}")
        return output_path
    except Exception as e:
        print(f"❌ Enhanced PDF generation failed: {e}")
        # Fallback to simple PDF
        return create_simple_fallback_pdf(reports, output_path)


def create_simple_fallback_pdf(reports: List, output_path: str) -> str:
    """Create a simple fallback PDF if enhanced generation fails"""
    doc = SimpleDocTemplate(output_path, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []
    
    # Simple title and summary
    story.append(Paragraph("Thermal Inspection Report (Simplified)", styles['Title']))
    story.append(Spacer(1, 20))
    story.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
    story.append(Spacer(1, 20))
    
    # Simple statistics
    total = len(reports)
    critical = len([r for r in reports if r.fault_level == 'CRITICAL'])
    warning = len([r for r in reports if r.fault_level == 'WARNING'])
    
    story.append(Paragraph(f"Total Reports: {total}", styles['Normal']))
    story.append(Paragraph(f"Critical: {critical}", styles['Normal']))
    story.append(Paragraph(f"Warning: {warning}", styles['Normal']))
    
    try:
        doc.build(story)
        print(f"✅ Fallback PDF generated: {output_path}")
        return output_path
    except Exception as e:
        print(f"❌ Fallback PDF generation also failed: {e}")
        raise e
