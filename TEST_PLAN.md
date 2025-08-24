# Thermal Eye - Test Plan & Manual Verification

## Overview
This document outlines manual testing procedures to verify the critical fixes implemented in Thermal Eye v1.1.0.

## 🗺️ Map Fault Overlay Testing

### Test 1: Fault Location Visualization
**Objective**: Verify exact GPS coordinates are displayed on map

**Steps**:
1. Navigate to Dashboard page
2. Upload thermal images with EXIF GPS data
3. Verify fault markers appear at exact coordinates (not nearest tower)
4. Click on fault markers to view detailed popups

**Expected Results**:
- ❏ Fault markers display as diamond/square shapes (distinct from circular tower markers)
- ❏ GPS coordinates shown with 6 decimal precision
- ❏ Fault severity reflected in marker color (red=critical, yellow=warning)
- ❏ Popup shows temperature data, threshold, and "View Report" link

### Test 2: Layer Controls
**Objective**: Verify layer toggle functionality

**Steps**:
1. Open Dashboard map view
2. Use layer control in top-right corner
3. Toggle "Tower Locations" and "Thermal Faults" layers
4. Verify legend updates appropriately

**Expected Results**:
- ❏ Layers can be toggled independently
- ❏ Legend shows both tower and fault symbols
- ❏ Performance remains smooth with 50+ markers

### Test 3: Deep Linking
**Objective**: Test URL state management for fault navigation

**Steps**:
1. Click on a fault marker to view details
2. Copy URL from browser address bar
3. Open URL in new tab/window
4. Verify map centers on selected fault

**Expected Results**:
- ❏ URL contains fault ID and coordinates
- ❏ Map opens focused on correct fault location
- ❏ Fault popup opens automatically

## 📧 Email System Testing

### Test 4: Critical Alert Emails
**Objective**: Verify professional email templates work correctly

**Prerequisites**: Configure SMTP settings in `.env` file

**Steps**:
1. Upload thermal image with temperature > threshold
2. Ensure fault level = CRITICAL
3. Check email inbox for alert
4. Verify email contains both HTML and plaintext versions

**Expected Results**:
- ❏ Email subject includes location and severity indicator
- ❏ HTML version displays properly formatted tables and styling
- ❏ Plaintext version is readable without HTML support
- ❏ AI summary included (if OpenRouter API configured)
- ❏ GPS coordinates and thermal data accurately displayed
- ❏ Professional language and recommended actions provided

### Test 5: Batch Processing Emails
**Objective**: Test multi-image upload email summaries

**Steps**:
1. Upload 5+ thermal images via batch upload
2. Ensure at least one CRITICAL fault is detected
3. Check email for batch summary
4. Verify PDF attachment is included

**Expected Results**:
- ❏ Email shows correct counts (Critical: X, Warning: Y, etc.)
- ❏ Top 5 critical faults listed with details
- ❏ Combined PDF report attached
- ❏ Professional formatting maintained

### Test 6: Email Failure Handling
**Objective**: Test graceful handling of SMTP failures

**Steps**:
1. Temporarily disable SMTP (invalid password in `.env`)
2. Upload critical thermal image
3. Check console logs and `/tmp/outbox` directory

**Expected Results**:
- ❏ Error logged but application continues functioning
- ❏ Email saved as `.eml` file in `/tmp/outbox`
- ❏ No application crash or user-facing errors

## 📄 PDF Generation Testing

### Test 7: Combined Report Layout
**Objective**: Verify PDF table formatting fixes

**Steps**:
1. Upload 10+ thermal images via batch upload
2. Generate combined PDF report
3. Open PDF and examine table layout
4. Verify no text overlap or truncation

**Expected Results**:
- ❏ All table columns fit within page margins
- ❏ No text overflow or overlap between columns
- ❏ Long tower names truncated with "..." indicator
- ❏ Headers repeat on multiple pages
- ❏ Font sizes appropriate and readable

### Test 8: Enhanced PDF Features
**Objective**: Test improved PDF formatting

**Steps**:
1. Generate both single and combined reports
2. Verify enhanced styling and layout
3. Check for proper color coding by fault level

**Expected Results**:
- ❏ Professional appearance with consistent styling
- ❏ Critical faults highlighted with red background
- ❏ Warning faults highlighted with yellow background
- ❏ Summary statistics properly formatted
- ❏ Fallback PDF generated if enhanced version fails

## 🌙 Dark Mode Testing

### Test 9: Theme Switching
**Objective**: Verify dark mode implementation

**Steps**:
1. Open application in browser
2. Check system dark mode preference detection
3. Manually toggle theme if toggle button exists
4. Refresh page and verify theme persistence

**Expected Results**:
- ❏ System preference detected on first visit
- ❏ Theme persists across page refreshes
- ❏ All components readable in both light and dark modes
- ❏ No style regressions in light mode

## 🔧 Backend API Testing

### Test 10: Upload Endpoint
**Objective**: Test single image upload functionality

**Steps**:
1. Use curl or Postman to test `/upload` endpoint
2. Upload valid FLIR image with GPS data
3. Verify response contains all expected fields

**Command**:
```bash
curl -X POST -F "file=@thermal_image.jpg" http://localhost:8000/upload
```

**Expected Results**:
- ❏ 200 status code returned
- ❏ Response includes GPS coordinates, temperature, fault level
- ❏ Database record created successfully
- ❏ Email sent if CRITICAL fault detected

### Test 11: Batch Upload Endpoint
**Objective**: Test multi-image upload functionality

**Steps**:
1. Use curl to upload multiple images to `/upload_batch`
2. Verify combined PDF generation
3. Check response structure

**Command**:
```bash
curl -X POST \
  -F "files=@image1.jpg" \
  -F "files=@image2.jpg" \
  -F "files=@image3.jpg" \
  http://localhost:8000/upload_batch
```

**Expected Results**:
- ❏ All valid images processed
- ❏ Combined PDF path returned
- ❏ Statistics accurately calculated
- ❏ Batch email sent if configured

### Test 12: Reports Endpoint
**Objective**: Test report retrieval and pagination

**Steps**:
1. Upload several thermal images
2. Call `/reports` endpoint
3. Verify data structure and completeness

**Expected Results**:
- ❏ All reports returned with complete metadata
- ❏ GPS coordinates included
- ❏ Timestamps in correct format
- ❏ Fault levels accurately classified

## 🎨 Frontend Integration Testing

### Test 13: Dashboard Page
**Objective**: Test enhanced dashboard functionality

**Steps**:
1. Navigate to Dashboard (`/`)
2. Verify all widgets load correctly
3. Test map interaction and filtering
4. Click "View Details" links

**Expected Results**:
- ❏ Statistics cards show accurate counts
- ❏ Map renders with both towers and faults
- ❏ Recent activity table loads
- ❏ Navigation links work correctly
- ❏ No infinite loading loops

### Test 14: Upload Page
**Objective**: Test multi-file upload interface

**Steps**:
1. Navigate to Upload page (`/upload`)
2. Select multiple thermal images
3. Upload via drag-and-drop or file picker
4. Verify results display correctly

**Expected Results**:
- ❏ Multiple file selection works
- ❏ Upload progress indicators function
- ❏ Results show individual and batch summaries
- ❏ Links to generated PDFs work

### Test 15: Report Details Page
**Objective**: Test individual report viewing

**Steps**:
1. Navigate to specific report (`/report/{id}`)
2. Verify all data displays correctly
3. Test PDF generation and download
4. Check AI summary display

**Expected Results**:
- ❏ All thermal data displayed accurately
- ❏ GPS coordinates shown
- ❏ "Generate PDF" button works
- ❏ "Download PDF" appears after generation
- ❏ AI summary displays properly

## 🚨 Error Handling Testing

### Test 16: Invalid File Upload
**Objective**: Test error handling for invalid inputs

**Steps**:
1. Upload non-image files (txt, pdf, etc.)
2. Upload corrupted image files
3. Upload images without GPS data
4. Verify graceful error handling

**Expected Results**:
- ❏ Appropriate error messages displayed
- ❏ Application remains stable
- ❏ No server crashes or unhandled exceptions

### Test 17: Network Failure Scenarios
**Objective**: Test resilience to network issues

**Steps**:
1. Disconnect from internet during upload
2. Test with slow/unreliable connection
3. Verify timeout handling

**Expected Results**:
- ❏ Clear error messages to user
- ❏ Retry mechanisms work
- ❏ Application state remains consistent

## 📱 Responsive Design Testing

### Test 18: Mobile Compatibility
**Objective**: Verify mobile device compatibility

**Steps**:
1. Open application on mobile device or browser dev tools
2. Test all major pages and functionality
3. Verify map interaction on touch devices

**Expected Results**:
- ❏ All pages render correctly on mobile
- ❏ Map controls accessible via touch
- ❏ Tables scroll horizontally if needed
- ❏ Upload interface works on mobile

## 🔍 Performance Testing

### Test 19: Large Dataset Handling
**Objective**: Test performance with many markers

**Steps**:
1. Upload 100+ thermal images
2. Open Dashboard map view
3. Verify clustering activates
4. Test map interaction responsiveness

**Expected Results**:
- ❏ Initial load time < 5 seconds
- ❏ Map clustering activates automatically
- ❏ Smooth pan/zoom interactions
- ❏ Layer toggles responsive

## ✅ Acceptance Criteria Checklist

### Critical Functionality
- ❏ Map shows exact fault locations (not just towers)
- ❏ Email templates professional and complete
- ❏ PDF reports have no text overlap
- ❏ Dark mode toggle works without breaking layout
- ❏ All navigation links functional

### Data Accuracy  
- ❏ GPS coordinates displayed with 6 decimal precision
- ❏ Temperature thresholds calculated correctly
- ❏ Fault severity classification accurate
- ❏ Email content matches actual data

### User Experience
- ❏ No infinite loading loops
- ❏ Error messages clear and actionable
- ❏ Performance acceptable for 100+ records
- ❏ Mobile interface usable

### System Reliability
- ❏ Email failures don't crash system
- ❏ PDF generation has fallback mechanisms
- ❏ Database operations stable
- ❏ API endpoints return consistent responses

## 📸 Screenshot Requirements

For the PR submission, capture screenshots of:

1. **Enhanced Map View**: Dashboard showing both tower and fault layers
2. **Email Sample**: HTML formatted critical alert email
3. **PDF Report**: Combined batch report showing proper table formatting
4. **Dark Mode**: Application in dark theme
5. **Mobile View**: Dashboard on mobile device
6. **Error Handling**: Example of graceful error display

## 🐛 Known Issues & Workarounds

### Issue 1: OCR Accuracy
- **Problem**: Temperature reading occasionally inaccurate
- **Workaround**: Manual verification of critical readings
- **Status**: Planned for future release

### Issue 2: Database Migration
- **Problem**: Two database files may exist
- **Workaround**: Use primary thermal_eye.db file
- **Status**: Planned consolidation in next release

## 📞 Support Information

If any tests fail or issues are discovered:

1. Check console logs for detailed error messages
2. Verify `.env` configuration matches `ENV.sample`
3. Ensure all dependencies installed via `requirements.txt` and `package.json`
4. Check that backend and frontend servers are running on correct ports
5. Verify database file permissions and accessibility
