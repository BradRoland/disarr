# 🤝 Contributing to HomeLab Discord Bot

Thank you for your interest in contributing to the HomeLab Discord Bot! This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [Getting Started](#-getting-started)
- [Development Setup](#-development-setup)
- [Contributing Guidelines](#-contributing-guidelines)
- [Pull Request Process](#-pull-request-process)
- [Issue Reporting](#-issue-reporting)
- [Feature Requests](#-feature-requests)

## 📜 Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code.

### Our Pledge
- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Docker and Docker Compose
- Git
- Discord Bot Token (for testing)

### Fork and Clone
```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/BradRoland/disarr.git
cd disarr

# Add upstream remote
git remote add upstream https://github.com/originalowner/disarr.git
```

## 🛠️ Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your test configuration
```

### 3. Development Mode
```bash
npm run dev
```

### 4. Docker Development
```bash
# Build development image
docker build -t disarr:dev .

# Run with development configuration
docker-compose -f docker-compose.dev.yml up -d
```

## 📝 Contributing Guidelines

### Types of Contributions

#### 🐛 Bug Fixes
- Fix existing functionality
- Improve error handling
- Resolve compatibility issues

#### ✨ New Features
- Add new bot commands
- Integrate additional services
- Enhance existing functionality

#### 📚 Documentation
- Improve README files
- Add code comments
- Create tutorials or guides

#### 🧪 Testing
- Add unit tests
- Improve test coverage
- Add integration tests

### Code Style Guidelines

#### JavaScript/Node.js
- Use ES6+ features
- Follow async/await patterns
- Use meaningful variable names
- Add JSDoc comments for functions

#### Example:
```javascript
/**
 * Creates a new invite for the specified service
 * @param {Object} inviteData - Invite configuration
 * @param {string} inviteData.service - Service name (plex/jellyfin)
 * @param {string} inviteData.name - User display name
 * @returns {Promise<Object>} Invite result with URL and expiration
 */
async function createInvite(inviteData) {
    try {
        // Implementation here
    } catch (error) {
        console.error('Error creating invite:', error);
        throw error;
    }
}
```

#### Docker
- Use multi-stage builds when appropriate
- Keep images small and secure
- Use specific version tags
- Add health checks

#### Documentation
- Use clear, concise language
- Include code examples
- Update all relevant files
- Use proper markdown formatting

### File Structure
```
src/
├── commands/          # Discord slash commands
├── modules/           # Core functionality modules
└── index.js          # Main application entry point

docs/                 # Additional documentation
config/               # Configuration files
tests/                # Test files
```

## 🔄 Pull Request Process

### Before Submitting
1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Make** your changes
4. **Test** your changes thoroughly
5. **Update** documentation if needed
6. **Commit** with clear messages

### Commit Message Format
```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(dashboard): add real-time updates
fix(docker): resolve socket permission issue
docs(readme): update installation instructions
```

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested locally
- [ ] Added/updated tests
- [ ] All tests pass

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Review Process
1. **Automated checks** must pass
2. **Code review** by maintainers
3. **Testing** in development environment
4. **Approval** from at least one maintainer
5. **Merge** by maintainer

## 🐛 Issue Reporting

### Bug Reports
Use the bug report template and include:

#### Required Information
- **Description**: Clear description of the bug
- **Steps to Reproduce**: Detailed steps to reproduce
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**: OS, Docker version, Node.js version
- **Logs**: Relevant error logs or screenshots

#### Example Bug Report
```markdown
**Describe the bug**
The `/docker` command fails with permission error when trying to list containers.

**To Reproduce**
1. Run `/docker` command
2. Bot responds with "Error getting Docker container status: EACCES"

**Expected behavior**
Bot should list running Docker containers.

**Environment:**
- OS: Ubuntu 22.04
- Docker: 24.0.5
- Node.js: 18.17.0

**Logs:**
```
Error getting Docker container status: Error: connect EACCES /var/run/docker.sock
```

**Additional context**
Docker socket permissions are set to 666, container runs as root.
```

### Feature Requests
Use the feature request template and include:

#### Required Information
- **Feature Description**: Clear description of the feature
- **Use Case**: Why this feature would be useful
- **Proposed Solution**: How you think it should work
- **Alternatives**: Other solutions you've considered
- **Additional Context**: Any other relevant information

## 🎯 Feature Requests

### Guidelines for Feature Requests
- **Search existing issues** first
- **Be specific** about the feature
- **Explain the use case** clearly
- **Consider implementation** complexity
- **Provide examples** when possible

### Feature Categories

#### 🆕 New Integrations
- Additional HomeLab services
- New monitoring capabilities
- External API integrations

#### 🔧 Bot Commands
- New slash commands
- Command enhancements
- Interactive features

#### 📊 Dashboard Features
- New dashboard widgets
- Customization options
- Real-time updates

#### 🔒 Security & Permissions
- Enhanced permission system
- Security improvements
- Access control features

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/docker.test.js

# Run with coverage
npm run test:coverage
```

### Writing Tests
```javascript
const { expect } = require('chai');
const DockerMonitor = require('../src/modules/DockerMonitor');

describe('DockerMonitor', () => {
    it('should initialize with default socket path', () => {
        const monitor = new DockerMonitor();
        expect(monitor.socketPath).to.equal('/var/run/docker.sock');
    });

    it('should handle Docker connection errors gracefully', async () => {
        const monitor = new DockerMonitor();
        const result = await monitor.getContainerStatus();
        expect(result.status).to.equal('offline');
    });
});
```

## 📚 Documentation

### Documentation Types
- **README**: Main project documentation
- **API Docs**: Command and module documentation
- **Deployment**: Setup and deployment guides
- **Contributing**: This file
- **Code Comments**: Inline code documentation

### Documentation Standards
- Use clear, concise language
- Include code examples
- Keep information up-to-date
- Use proper markdown formatting
- Add screenshots when helpful

## 🏷️ Release Process

### Version Numbering
We use [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Version bumped
- [ ] Changelog updated
- [ ] Docker image built and pushed
- [ ] Release notes created

## 💬 Community

### Getting Help
- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and general discussion
- **Discord**: For real-time community support

### Community Guidelines
- Be respectful and helpful
- Search before asking
- Provide clear information
- Help others when you can

## 🙏 Recognition

Contributors will be recognized in:
- README contributors section
- Release notes
- GitHub contributors page

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to the HomeLab Discord Bot! 🎉
