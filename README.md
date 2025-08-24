# 🔥 Thermal Eye - Advanced Thermal Inspection System

[![CI/CD Pipeline](https://github.com/YOUR_USERNAME/thermal-eye/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/thermal-eye/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![Node.js 18+](https://img.shields.io/badge/node.js-18+-green.svg)](https://nodejs.org/)

A professional-grade thermal imaging analysis system designed for electrical infrastructure monitoring. Built for **Tata Power** with enterprise-level security, authentication, and comprehensive reporting capabilities.

> **🔒 Security Note**: This repository contains only the thermal analysis application code. All sensitive infrastructure data (KML files, actual thermal images, transmission line coordinates) are excluded for security and remain in private systems only.

## 🌟 Features

### 🔍 **Advanced Analysis Engine**
- **EasyOCR Integration**: Automated temperature extraction from thermal images
- **GPS Coordinate Extraction**: EXIF data parsing for precise location mapping
- **Dynamic Thresholds**: Intelligent fault classification based on equipment specifications
- **AI-Powered Assessment**: OpenRouter integration with Mistral-7B and LLaMA-3.1-8B models

### 🗺️ **Interactive Mapping**
- **Real-time Visualization**: Leaflet.js maps with fault overlay markers
- **Tower Management**: Nearest tower identification and distance calculation
- **Geographic Clustering**: Spatial analysis for infrastructure planning

### 📊 **Comprehensive Reporting**
- **PDF Generation**: Professional reports with charts and analysis
- **Batch Processing**: Multiple image analysis with combined reporting
- **Email Notifications**: Automated critical alert system
- **Export Capabilities**: Multiple format support for data sharing

### 🔐 **Enterprise Security**
- **JWT Authentication**: Secure token-based user management
- **Role-Based Access**: Admin and user permission levels
- **Rate Limiting**: Protection against abuse and DoS attacks
- **File Validation**: Comprehensive upload security checks

### 🎨 **Modern Interface**
- **Dark/Light Themes**: Professional UI with theme persistence
- **Responsive Design**: Mobile-first approach with TailwindCSS
- **Real-time Updates**: Live status and progress indicators
- **Intuitive Navigation**: Sidebar-based navigation with breadcrumbs

## 🚀 Quick Start

### ⚡ **One-Command Setup & Start**

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/thermal-eye.git
cd thermal-eye

# 2. Complete setup (one-time only)
./setup.sh

# 3. Start the application
./start.sh

# 🎉 Access at http://localhost:3000
```

### 🐳 **Docker Quick Start**
```bash
# Clone and start with Docker
git clone https://github.com/YOUR_USERNAME/thermal-eye.git
cd thermal-eye
cp ENV.sample .env  # Edit with your API keys
./start.sh --docker
```

### 📋 **Quick Commands**

| Task | Command |
|------|---------|
| **Initial Setup** | `./setup.sh` |
| **Start Development** | `./start.sh` |
| **Start with Docker** | `./start.sh --docker` |
| **Start Production** | `./start.sh --production` |
| **Stop All Services** | `./stop.sh` |
| **Run All Tests** | `./dev.sh test` |
| **View All Commands** | `./dev.sh help` |

### 🔑 **Default Login**
- **Email**: `admin@example.com`
- **Password**: `admin123`

### 🌐 **Access URLs**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

> 📖 **Detailed Instructions**: See [RUN_GUIDE.md](RUN_GUIDE.md) for comprehensive startup options

## 🧪 Testing

### Backend Tests
```bash
cd backend
python -m pytest -v --cov=app
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Full Test Suite
```bash
# Run all tests
npm run test:all
```

## 📚 API Documentation

The API is fully documented using FastAPI's automatic documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

- `POST /upload` - Single thermal image analysis
- `POST /upload_batch` - Batch image processing
- `GET /reports` - List all analysis reports
- `GET /generate_report/{report_id}` - Generate PDF report
- `POST /auth/login` - User authentication
- `GET /health` - System health check

## 🗄️ Database

### Development (SQLite)
- Default: `thermal_reports.db`
- Automatic creation on first run

### Production (PostgreSQL)
```bash
# Set DATABASE_URL in .env
DATABASE_URL=postgresql://user:password@localhost/thermal_eye
```

### Migrations
```bash
cd backend
alembic upgrade head
```

## 🚢 Deployment

### Docker (Recommended)
```bash
# Build and run with Docker Compose
docker-compose up --build
```

### Manual Deployment
1. Build frontend: `npm run build`
2. Set production environment variables
3. Start backend: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
4. Serve frontend build files with Nginx/Apache

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `sqlite:///./thermal_reports.db` |
| `SECRET_KEY` | JWT signing secret | `your-secret-key-here` |
| `OPENROUTER_API_KEY` | AI model API key | Required |
| `OPENWEATHER_API_KEY` | Weather data API key | Required |
| `SMTP_SERVER` | Email server | `smtp.gmail.com` |
| `SMTP_USER` | Email username | Required |
| `SMTP_PASSWORD` | Email password | Required |

### Theme Configuration
- Light/Dark/System theme support
- Persistent user preferences
- Consistent styling across all components

## 📁 Project Structure

```
thermal_eye/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── auth/           # Authentication module
│   │   ├── middleware/     # Custom middleware
│   │   ├── migrations/     # Database migrations
│   │   ├── models.py       # Database models
│   │   ├── main.py         # FastAPI application
│   │   └── config.py       # Configuration
│   ├── tests/              # Backend tests
│   └── requirements.txt    # Python dependencies
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Page components
│   │   ├── utils/          # Utility functions
│   │   └── App.js          # Main application
│   ├── public/             # Static assets
│   └── package.json        # Node dependencies
├── .github/                # GitHub Actions workflows
├── docs/                   # Documentation
└── ENV.sample              # Environment template
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow PEP 8 for Python code
- Use ESLint for JavaScript/React
- Write tests for new features
- Update documentation as needed
- Use conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` folder
- **Issues**: Use GitHub Issues for bug reports
- **Discussions**: Use GitHub Discussions for questions

## 🔄 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

## 🏗️ Built With

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - Database ORM
- **Alembic** - Database migrations
- **EasyOCR** - Optical character recognition
- **ReportLab** - PDF generation
- **python-jose** - JWT handling

### Frontend
- **React 18** - UI framework
- **TailwindCSS** - Utility-first styling
- **Leaflet** - Interactive mapping
- **Axios** - HTTP client
- **React Router** - Client-side routing

### DevOps
- **GitHub Actions** - CI/CD pipeline
- **Docker** - Containerization
- **Pytest** - Backend testing
- **React Testing Library** - Frontend testing

---

**Made with ❤️ for Tata Power's infrastructure monitoring needs**