# Contributing to Thermal Eye

Thank you for your interest in contributing to Thermal Eye! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues

1. **Search existing issues** first to avoid duplicates
2. **Use issue templates** when available
3. **Provide detailed information**:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Python/Node versions)
   - Screenshots if applicable

### Submitting Changes

1. **Fork the repository**
2. **Create a feature branch** from `develop`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** following our coding standards
4. **Add tests** for new functionality
5. **Update documentation** if needed
6. **Commit your changes** using conventional commits:
   ```bash
   git commit -m "feat: add new thermal analysis algorithm"
   ```
7. **Push to your fork** and **create a Pull Request**

## 🔧 Development Setup

### Prerequisites

- Python 3.9+
- Node.js 18+
- Git

### Local Development

1. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/thermal-eye.git
   cd thermal-eye
   ```

2. **Set up backend**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   pip install -r requirements-dev.txt  # Development dependencies
   ```

3. **Set up frontend**:
   ```bash
   cd ../frontend
   npm install
   ```

4. **Run tests**:
   ```bash
   # Backend tests
   cd backend && python -m pytest

   # Frontend tests
   cd frontend && npm test
   ```

## 📝 Coding Standards

### Python (Backend)

- **Follow PEP 8** style guidelines
- **Use type hints** for function parameters and return values
- **Write docstrings** for classes and functions
- **Maximum line length**: 127 characters
- **Use Black** for code formatting:
  ```bash
  black app/
  ```
- **Use flake8** for linting:
  ```bash
  flake8 app/
  ```

#### Example:
```python
from typing import List, Optional

def analyze_thermal_image(
    image_path: str, 
    threshold: Optional[float] = None
) -> List[dict]:
    """
    Analyze thermal image for temperature anomalies.
    
    Args:
        image_path: Path to the thermal image file
        threshold: Optional temperature threshold for alerts
        
    Returns:
        List of detected anomalies with metadata
    """
    # Implementation here
    pass
```

### JavaScript/React (Frontend)

- **Use ESLint** configuration provided
- **Follow React best practices**:
  - Functional components with hooks
  - Proper dependency arrays in useEffect
  - Meaningful component and variable names
- **Use Prettier** for formatting
- **CSS-in-JS**: Use TailwindCSS classes

#### Example:
```jsx
import React, { useState, useEffect } from 'react';

const ThermalAnalysis = ({ imageData }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (imageData) {
      analyzeImage(imageData);
    }
  }, [imageData]);

  const analyzeImage = async (data) => {
    setLoading(true);
    try {
      const result = await api.analyzeImage(data);
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Component content */}
    </div>
  );
};

export default ThermalAnalysis;
```

## 🧪 Testing Guidelines

### Backend Testing

- **Write tests for all new functions**
- **Use pytest fixtures** for setup
- **Mock external dependencies** (APIs, file system)
- **Test both success and error cases**
- **Maintain >90% test coverage**

#### Example:
```python
import pytest
from unittest.mock import patch, MagicMock

def test_thermal_analysis_success():
    """Test successful thermal image analysis."""
    with patch('app.services.ocr.extract_temperature') as mock_ocr:
        mock_ocr.return_value = 45.7
        
        result = analyze_thermal_image('test_image.jpg')
        
        assert result['temperature'] == 45.7
        assert result['status'] == 'normal'
```

### Frontend Testing

- **Use React Testing Library**
- **Test user interactions** and component behavior
- **Mock API calls** with MSW
- **Test accessibility** features

#### Example:
```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { UploadComponent } from './UploadComponent';

test('shows upload success message', async () => {
  render(<UploadComponent />);
  
  const fileInput = screen.getByLabelText(/upload file/i);
  const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
  
  fireEvent.change(fileInput, { target: { files: [file] } });
  
  expect(await screen.findByText(/upload successful/i)).toBeInTheDocument();
});
```

## 📋 Pull Request Guidelines

### PR Title

Use conventional commit format:
- `feat: add new feature`
- `fix: resolve bug in thermal analysis`
- `docs: update API documentation`
- `test: add integration tests`
- `refactor: improve code structure`

### PR Description

Include:
- **Clear description** of changes
- **Link to related issues** (`Fixes #123`)
- **Screenshots** for UI changes
- **Breaking changes** if any
- **Testing notes** for reviewers

### Review Process

1. **Automated checks** must pass (CI/CD pipeline)
2. **Code review** by at least one maintainer
3. **Manual testing** if required
4. **Documentation updates** verified
5. **Merge to develop** branch first
6. **Release** from develop to main

## 🚀 Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### Release Steps

1. **Update CHANGELOG.md**
2. **Create release branch** from develop
3. **Update version numbers**
4. **Create pull request** to main
5. **Tag release** after merge
6. **Deploy to production**

## 💬 Communication

### Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and general discussion
- **Pull Request Reviews**: Code-related discussions

### Guidelines

- **Be respectful** and constructive
- **Provide context** for your questions
- **Search existing discussions** before asking
- **Use appropriate labels** and tags

## 🏆 Recognition

Contributors will be recognized in:
- **CONTRIBUTORS.md** file
- **Release notes** for significant contributions
- **README.md** acknowledgments

## 📚 Resources

### Documentation

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://reactjs.org/docs/)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Testing Best Practices](./docs/testing.md)

### Tools

- **Code Quality**: ESLint, Prettier, Black, flake8
- **Testing**: pytest, React Testing Library, Jest
- **CI/CD**: GitHub Actions
- **Documentation**: Markdown, JSDoc

## ❓ Questions?

If you have questions not covered here:

1. **Check the documentation** in `/docs`
2. **Search existing issues** and discussions
3. **Create a new discussion** if needed
4. **Tag maintainers** for urgent issues

Thank you for contributing to Thermal Eye! 🔥
