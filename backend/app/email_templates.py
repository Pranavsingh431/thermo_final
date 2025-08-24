#!/usr/bin/env python3
"""
Email template system for Thermal Eye
Provides professional HTML and plaintext email templates
"""

from typing import Dict, Any, Tuple
from datetime import datetime


def generate_critical_alert_email(report_data: Dict[str, Any], ai_summary: str = "") -> Tuple[str, str]:
    """
    Generate professional critical alert email in both HTML and plaintext formats
    
    Args:
        report_data: Dictionary containing thermal report data
        ai_summary: AI-generated summary content
        
    Returns:
        Tuple of (html_body, text_body)
    """
    # Extract and validate data
    tower_name = report_data.get('tower_name', 'Unknown Tower')
    camp_name = report_data.get('camp_name', '')
    voltage_kv = report_data.get('voltage_kv')
    capacity_amps = report_data.get('capacity_amps')
    measured_temp = report_data.get('image_temp')
    threshold = report_data.get('threshold_used')
    delta_t = report_data.get('delta_t')
    priority = report_data.get('priority', 'HIGH')
    timestamp = report_data.get('timestamp', datetime.now())
    latitude = report_data.get('latitude')
    longitude = report_data.get('longitude')
    
    # Build location description
    location_parts = [tower_name or 'Unknown Tower']
    if camp_name:
        location_parts.append(camp_name)
    if voltage_kv:
        voltage_text = f"{voltage_kv} kV"
        if capacity_amps:
            voltage_text += f", {capacity_amps} A"
        location_parts.append(voltage_text)
    
    location_desc = " – ".join(location_parts)
    
    # Format coordinates
    coords_text = ""
    if latitude and longitude:
        coords_text = f"GPS: {latitude:.6f}, {longitude:.6f}"
    
    # Safe number formatting
    def safe_format(value, format_str, default="N/A"):
        try:
            return format_str.format(value) if value is not None else default
        except (ValueError, TypeError):
            return default
    
    # Generate subject line
    subject = f"🔴 Critical Thermal Alert: Immediate Action Required – {location_desc}"
    
    # HTML Email Body
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .header {{ background-color: #dc2626; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 20px; }}
            .alert-box {{ background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }}
            .data-table {{ border-collapse: collapse; width: 100%; margin: 20px 0; }}
            .data-table th, .data-table td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
            .data-table th {{ background-color: #f8f9fa; }}
            .actions {{ background-color: #f8f9fa; padding: 15px; margin: 20px 0; }}
            .footer {{ font-size: 12px; color: #666; margin-top: 30px; }}
            .ai-summary {{ background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🚨 CRITICAL THERMAL ALERT</h1>
            <p>Immediate Action Required</p>
        </div>
        
        <div class="content">
            <h2>Dear Lead Engineer,</h2>
            
            <div class="alert-box">
                <h3>⚠️ Critical Thermal Anomaly Detected</h3>
                <p><strong>Location:</strong> {location_desc}</p>
                <p><strong>Detection Time:</strong> {timestamp.strftime('%B %d, %Y at %H:%M:%S UTC') if isinstance(timestamp, datetime) else timestamp}</p>
                {f'<p><strong>Coordinates:</strong> {coords_text}</p>' if coords_text else ''}
            </div>
            
            <h3>📊 Thermal Analysis Results</h3>
            <table class="data-table">
                <tr>
                    <th>Measurement</th>
                    <th>Value</th>
                    <th>Status</th>
                </tr>
                <tr>
                    <td>Measured Temperature</td>
                    <td>{safe_format(measured_temp, '{:.1f} °C')}</td>
                    <td style="color: #dc2626; font-weight: bold;">CRITICAL</td>
                </tr>
                <tr>
                    <td>Dynamic Threshold</td>
                    <td>{safe_format(threshold, '{:.1f} °C')}</td>
                    <td>Equipment-specific limit</td>
                </tr>
                <tr>
                    <td>Temperature Excess</td>
                    <td>{safe_format(delta_t, '{:+.1f} °C')}</td>
                    <td style="color: #dc2626; font-weight: bold;">ABOVE LIMIT</td>
                </tr>
                <tr>
                    <td>Priority Level</td>
                    <td>{priority}</td>
                    <td>Requires immediate response</td>
                </tr>
            </table>
            
            {f'''
            <div class="ai-summary">
                <h3>🤖 AI Technical Assessment</h3>
                <div style="white-space: pre-line; line-height: 1.6;">{ai_summary}</div>
            </div>
            ''' if ai_summary and ai_summary.strip() else ''}
            
            <div class="actions">
                <h3>🚀 Recommended Immediate Actions</h3>
                <ol>
                    <li><strong>Dispatch inspection personnel</strong> to {tower_name} within the next 2 hours</li>
                    <li><strong>Assess load conditions</strong> and consider temporary load reduction if feasible</li>
                    <li><strong>Prepare contingency plans</strong> for rerouting or backup supply in case of equipment de-energization</li>
                    <li><strong>Schedule follow-up thermal imaging</strong> check within 24 hours</li>
                    <li><strong>Document findings</strong> and update maintenance records</li>
                </ol>
            </div>
            
            <p><strong>Please treat this alert with the highest priority to ensure system reliability and operational safety.</strong></p>
            
            <div class="footer">
                <p>Best regards,<br>
                <strong>Thermal Eye Monitoring System</strong><br>
                Automated Thermal Inspection Platform<br>
                Report ID: {report_data.get('id', 'N/A')} | Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Plaintext Email Body
    text_body = f"""
🚨 CRITICAL THERMAL ALERT - IMMEDIATE ACTION REQUIRED

Dear Lead Engineer,

This is to notify you of a critical thermal anomaly detected during inspection.

LOCATION DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Equipment: {location_desc}
• Detection Time: {timestamp.strftime('%B %d, %Y at %H:%M:%S UTC') if isinstance(timestamp, datetime) else timestamp}
{f'• GPS Coordinates: {coords_text}' if coords_text else ''}

THERMAL ANALYSIS RESULTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Measured Temperature: {safe_format(measured_temp, '{:.1f} °C')}
• Dynamic Threshold: {safe_format(threshold, '{:.1f} °C')}
• Excess Above Threshold: {safe_format(delta_t, '{:+.1f} °C')}
• Priority Level: {priority}

This temperature deviation exceeds the permissible limit and may indicate potential 
overheating or equipment stress.

{f'''
AI TECHNICAL ASSESSMENT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{ai_summary}
''' if ai_summary and ai_summary.strip() else ''}

RECOMMENDED IMMEDIATE ACTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Dispatch inspection personnel to {tower_name} within the next 2 hours
2. Assess load conditions and consider temporary load reduction if feasible  
3. Prepare contingency plans for rerouting or backup supply in case of de-energization
4. Schedule follow-up thermal imaging check within 24 hours
5. Document findings and update maintenance records

Please treat this alert with the highest priority to ensure system reliability 
and operational safety.

Best regards,
Thermal Eye Monitoring System
Automated Thermal Inspection Platform
Report ID: {report_data.get('id', 'N/A')} | Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}
    """
    
    return subject, html_body, text_body


def generate_batch_alert_email(
    critical_count: int, 
    warning_count: int, 
    normal_count: int,
    total_count: int,
    top_critical_faults: list = None,
    ai_summary: str = ""
) -> Tuple[str, str]:
    """
    Generate batch processing alert email
    
    Args:
        critical_count: Number of critical faults
        warning_count: Number of warning faults  
        normal_count: Number of normal readings
        total_count: Total images processed
        top_critical_faults: List of most severe critical faults
        ai_summary: AI-generated batch summary
        
    Returns:
        Tuple of (html_body, text_body)
    """
    timestamp = datetime.now()
    
    # Subject line
    subject = f"🚨 Thermal Inspection Batch Complete: {critical_count} Critical, {warning_count} Warning ({total_count} total)"
    
    # HTML version
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .header {{ background-color: #1f2937; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 20px; }}
            .stats {{ display: flex; justify-content: space-around; margin: 20px 0; }}
            .stat-box {{ text-align: center; padding: 15px; border-radius: 8px; }}
            .critical {{ background-color: #fef2f2; border: 2px solid #dc2626; }}
            .warning {{ background-color: #fefce8; border: 2px solid #eab308; }}
            .normal {{ background-color: #f0fdf4; border: 2px solid #22c55e; }}
            .fault-list {{ background-color: #f8f9fa; padding: 15px; margin: 15px 0; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📊 Thermal Inspection Batch Report</h1>
            <p>Batch Processing Complete - {timestamp.strftime('%B %d, %Y at %H:%M:%S UTC')}</p>
        </div>
        
        <div class="content">
            <h2>Batch Processing Summary</h2>
            
            <div class="stats">
                <div class="stat-box critical">
                    <h3>🔴 CRITICAL</h3>
                    <h1>{critical_count}</h1>
                    <p>Require immediate action</p>
                </div>
                <div class="stat-box warning">
                    <h3>🟡 WARNING</h3>
                    <h1>{warning_count}</h1>
                    <p>Require monitoring</p>
                </div>
                <div class="stat-box normal">
                    <h3>🟢 NORMAL</h3>
                    <h1>{normal_count}</h1>
                    <p>Within limits</p>
                </div>
            </div>
            
            <p><strong>Total Images Processed:</strong> {total_count}</p>
            
            {f'''
            <div class="fault-list">
                <h3>🚨 Top Critical Faults Requiring Immediate Attention</h3>
                <ul>
                {''.join([f'<li><strong>{fault.get("tower_name", "Unknown")}</strong> - {fault.get("image_temp", "N/A")}°C (Δ{fault.get("delta_t", "N/A"):+.1f}°C)</li>' for fault in (top_critical_faults or [])[:5]])}
                </ul>
            </div>
            ''' if top_critical_faults and critical_count > 0 else ''}
            
            {f'''
            <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
                <h3>🤖 AI Batch Analysis</h3>
                <div style="white-space: pre-line; line-height: 1.6;">{ai_summary}</div>
            </div>
            ''' if ai_summary and ai_summary.strip() else ''}
            
            <p>Detailed individual reports and combined PDF are available in the system dashboard.</p>
        </div>
    </body>
    </html>
    """
    
    # Plaintext version
    text_body = f"""
📊 THERMAL INSPECTION BATCH COMPLETE

Batch Processing Summary - {timestamp.strftime('%B %d, %Y at %H:%M:%S UTC')}

RESULTS OVERVIEW:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 CRITICAL: {critical_count} (require immediate action)
🟡 WARNING:  {warning_count} (require monitoring)  
🟢 NORMAL:   {normal_count} (within limits)
📊 TOTAL:    {total_count} images processed

{f'''
TOP CRITICAL FAULTS REQUIRING IMMEDIATE ATTENTION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{chr(10).join([f'• {fault.get("tower_name", "Unknown")} - {fault.get("image_temp", "N/A")}°C (Δ{fault.get("delta_t", "N/A"):+.1f}°C)' for fault in (top_critical_faults or [])[:5]])}
''' if top_critical_faults and critical_count > 0 else ''}

{f'''
AI BATCH ANALYSIS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{ai_summary}
''' if ai_summary and ai_summary.strip() else ''}

Detailed individual reports and combined PDF are available in the system dashboard.

Best regards,
Thermal Eye Monitoring System
Generated: {timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}
    """
    
    return subject, html_body, text_body
