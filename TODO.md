# Thermal Eye - Critical Fixes TODO

## Repository Architecture Discovery
- **Backend**: FastAPI (Python) with SQLAlchemy ORM
- **Frontend**: React 18 + Tailwind CSS + Leaflet.js for maps
- **Database**: SQLite (config suggests PostgreSQL but using SQLite locally)
- **PDF**: ReportLab library
- **OCR**: EasyOCR with Pillow preprocessing  
- **Email**: Built-in smtplib with MIMEMultipart
- **AI**: OpenRouter API with mistral-7b-instruct:free model

## Critical Issues Identified
1. Email template has undefined `line_desc` variable (line 669-674)
2. PDF generation has syntax error in `rows.append` (lines 1124-1131)
3. Map only shows tower locations, not exact fault GPS coordinates
4. Two database files exist: `app.db` and `thermal_eye.db`
5. No authentication system implemented
6. Tailwind config has duplicate export (lines 29-63)

## Task Progress

### ✅ DISCOVERY (COMPLETED)
- [x] Repository structure mapped
- [x] Technology stack identified
- [x] Critical bugs located
- [x] Database files discovered

### 🚧 TASK 1 — Map Fault Overlay (IN PROGRESS)
**Acceptance Criteria**: Engineers see exact fault GPS points with severity markers
- [ ] Create FaultLayer component for thermal reading locations
- [ ] Add clustering for performance (>200 markers)
- [ ] Implement severity-based styling (H/M/L)
- [ ] Add detailed popups with temperature/thumbnail
- [ ] Add URL state for deep-linking to faults
- [ ] Write unit tests for mapping utilities
- [ ] Write integration tests for map component

### 📋 TASK 2 — Email Content Fix (PENDING)
**Acceptance Criteria**: No undefined variables, professional HTML+plaintext emails
- [ ] Fix undefined `line_desc` variable in `send_critical_alert_email()`
- [ ] Implement proper email templating
- [ ] Add HTML and plaintext versions
- [ ] Add graceful SMTP failure handling
- [ ] Write email template tests

### 📋 TASK 3 — PDF Report Overlap Fix (PENDING)
**Acceptance Criteria**: No overlapping text, proper column widths, readable headers
- [ ] Fix syntax error in `generate_combined_pdf()` rows.append
- [ ] Implement deterministic column width calculation
- [ ] Add word wrapping for long content
- [ ] Add table header repeat on new pages
- [ ] Write PDF generation tests

### 📋 TASK 4 — Database Consolidation (PENDING)
**Acceptance Criteria**: Single configured DB, successful migrations
- [ ] Standardize to single database file
- [ ] Create Alembic migration setup
- [ ] Write data migration script
- [ ] Add startup checks for legacy data
- [ ] Write database migration tests

### 📋 TASK 5 — Authentication (PENDING)
**Acceptance Criteria**: JWT auth, role-based access, protected routes
- [ ] Implement FastAPI JWT authentication
- [ ] Add user roles (admin/engineer/viewer)
- [ ] Protect critical API endpoints
- [ ] Add frontend auth context and route guards
- [ ] Write authentication tests

### 📋 TASK 6 — Dark Mode Hardening (PENDING)
**Acceptance Criteria**: No regressions in light theme, readable dark theme
- [ ] Fix duplicate Tailwind config
- [ ] Add ThemeProvider with dark class toggle
- [ ] Update components with dark: variants
- [ ] Write theme switching tests

### 📋 TASK 7 — OCR Accuracy (PENDING)
**Acceptance Criteria**: Reduced misreads, confidence logging
- [ ] Add image preprocessing (grayscale, threshold)
- [ ] Implement better regex parsing
- [ ] Add domain constraint validation
- [ ] Write OCR accuracy tests

### 📋 TASK 8 — AI Model Upgrade (PENDING)
**Acceptance Criteria**: Upgraded to paid model, fallback support
- [ ] Configure llama-3.1-8b-instruct as default
- [ ] Add gemma-2-9b-it as fallback
- [ ] Implement client wrapper with retries
- [ ] Write AI client tests

## Testing Strategy
- **Backend**: pytest for unit + integration
- **Frontend**: vitest/jest + React Testing Library 
- **E2E**: Cypress for critical user flows
- **CI**: GitHub Actions workflow (no external secrets)

## Documentation Deliverables
- [ ] `TEST_PLAN.md` with manual verification steps
- [ ] `CHANGELOG.md` with version changes
- [ ] `.env.sample` for required environment variables
- [ ] PR description with screenshots
