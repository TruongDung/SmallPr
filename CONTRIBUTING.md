# 🤝 Contributing Guide

Thank you for considering contributing to the Task Manager application! This guide will help you get started.

## 📋 Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)

## 🌟 Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other contributors

## 🚀 Getting Started

### First Time Setup

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then:
   git clone https://github.com/YOUR_USERNAME/task-manager.git
   cd task-manager
   ```

2. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/task-manager.git
   ```

3. **Install dependencies**
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

4. **Set up environment**
   - Follow [QUICK_START.md](./QUICK_START.md) for environment setup
   - Create `.env` file with required variables

5. **Verify setup**
   ```bash
   npm test
   cd client && npm test
   ```

### Before You Start Coding

1. **Check existing issues** - Someone might already be working on it
2. **Create an issue** - Discuss your idea before significant work
3. **Read documentation** - Familiarize yourself with the codebase
   - [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
   - [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Code patterns
   - [CODE_MAP.md](./CODE_MAP.md) - Code organization

## 🔄 Development Workflow

### 1. Create a Feature Branch

```bash
# Update your fork
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### Branch Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| New Feature | `feature/description` | `feature/add-task-tags` |
| Bug Fix | `fix/description` | `fix/login-validation` |
| Documentation | `docs/description` | `docs/update-api-guide` |
| Refactoring | `refactor/description` | `refactor/auth-service` |
| Performance | `perf/description` | `perf/optimize-queries` |
| Tests | `test/description` | `test/add-task-tests` |

### 2. Make Your Changes

Follow these principles:
- ✅ Write clean, readable code
- ✅ Follow existing patterns
- ✅ Add comments for complex logic
- ✅ Update documentation if needed
- ✅ Write/update tests
- ✅ Keep changes focused and atomic

### 3. Test Your Changes

```bash
# Run backend tests
npm test

# Run frontend tests
cd client
npm test

# Manual testing
npm run dev  # Terminal 1
cd client && npm run dev  # Terminal 2
```

### 4. Commit Your Changes

See [Commit Guidelines](#commit-guidelines) below.

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## 📝 Coding Standards

### JavaScript/Node.js (Backend)

**Style:**
```javascript
// ✅ GOOD
function createTask(userId, data) {
  const { title, description } = data;
  
  if (!title) {
    throw new Error('Title is required');
  }
  
  return runAsync(
    'INSERT INTO tasks (title, description, user_id) VALUES ($1, $2, $3) RETURNING *',
    [title, description, userId]
  );
}

// ❌ BAD
function createTask(userId,data){
  return runAsync('INSERT INTO tasks (title, description, user_id) VALUES ($1, $2, $3) RETURNING *',[data.title,data.description,userId]);
}
```

**Best Practices:**
- Use `const` by default, `let` when needed, never `var`
- Use destructuring for cleaner code
- Always use parameterized queries (prevent SQL injection)
- Add JSDoc comments for functions
- Handle errors appropriately
- Use async/await instead of callbacks

### TypeScript/React (Frontend)

**Style:**
```typescript
// ✅ GOOD
interface Task {
  id: number;
  title: string;
  description?: string;
}

export function TaskCard({ task, onUpdate }: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  const handleSave = async () => {
    try {
      await onUpdate(task.id, { title });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };
  
  return (
    <div className="task-card">
      {/* Component JSX */}
    </div>
  );
}

// ❌ BAD
export function TaskCard(props) {
  return <div>{props.task.title}</div>
}
```

**Best Practices:**
- Use TypeScript types/interfaces
- Use functional components with hooks
- Destructure props
- Use meaningful variable names
- Keep components small and focused
- Extract complex logic to custom hooks
- Add error handling

### File Organization

**Backend:**
```
src/server/
├── routes/
│   └── feature.routes.js          # Route definitions
├── services/
│   └── feature.service.js         # Business logic
├── schemas/
│   └── feature.schema.js          # Validation
└── middleware/
    └── featureMiddleware.js       # Middleware
```

**Frontend:**
```
client/src/
├── api/
│   └── featureApi.ts              # API calls
├── hooks/
│   └── useFeature.ts              # Custom hooks
├── features/
│   └── feature/
│       ├── FeatureList.tsx        # Components
│       └── featureHelpers.ts      # Utilities
└── components/
    └── SharedComponent.tsx        # Reusable components
```

## 📬 Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
# Good commits
git commit -m "feat(tasks): add task tagging functionality"
git commit -m "fix(auth): resolve session timeout issue"
git commit -m "docs: update API documentation"
git commit -m "test(tasks): add unit tests for task service"

# With body
git commit -m "feat(tasks): add task tagging functionality

- Add tags table and migration
- Implement tag CRUD endpoints
- Add tag UI components
- Add real-time tag updates"
```

### Commit Best Practices

- ✅ Write in present tense ("add feature" not "added feature")
- ✅ Keep subject line under 72 characters
- ✅ Capitalize the subject line
- ✅ Don't end subject with a period
- ✅ Use imperative mood ("change" not "changes")
- ✅ Separate subject from body with blank line
- ✅ Explain what and why, not how

## 🔀 Pull Request Process

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests pass locally
- [ ] No console.log() or debugger statements
- [ ] No merge conflicts with main

### PR Title Format

Same as commit messages:
```
feat(tasks): add task tagging functionality
fix(auth): resolve session timeout issue
```

### PR Description Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing
How was this tested?

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review performed
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Review Process

1. **Automated checks** run (tests, linting)
2. **Code review** by maintainers
3. **Feedback addressed** by contributor
4. **Approved** by at least one maintainer
5. **Merged** by maintainer

### After Your PR is Merged

```bash
# Update your local main branch
git checkout main
git pull upstream main

# Delete feature branch
git branch -d feature/your-feature-name
git push origin --delete feature/your-feature-name
```

## 🧪 Testing Requirements

### Backend Tests

**Required for:**
- New services
- New routes
- Bug fixes
- Refactoring

**Example:**
```javascript
// src/server/services/tasks.service.test.js
describe('TasksService', () => {
  describe('createTask', () => {
    it('should create task with valid data', async () => {
      const task = await createTask(1, {
        title: 'Test Task',
        description: 'Test Description'
      });
      
      expect(task).toHaveProperty('id');
      expect(task.title).toBe('Test Task');
    });
    
    it('should reject task without title', async () => {
      await expect(
        createTask(1, { description: 'Test' })
      ).rejects.toThrow('Title is required');
    });
  });
});
```

### Frontend Tests

**Required for:**
- New components
- Custom hooks
- Utility functions
- Bug fixes

**Example:**
```typescript
// client/src/features/tasks/TaskCard.test.tsx
describe('TaskCard', () => {
  it('should render task title', () => {
    const task = { id: 1, title: 'Test Task' };
    render(<TaskCard task={task} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });
  
  it('should call onUpdate when saved', async () => {
    const onUpdate = jest.fn();
    const task = { id: 1, title: 'Test Task' };
    
    render(<TaskCard task={task} onUpdate={onUpdate} />);
    
    const editButton = screen.getByText('Edit');
    await userEvent.click(editButton);
    
    const saveButton = screen.getByText('Save');
    await userEvent.click(saveButton);
    
    expect(onUpdate).toHaveBeenCalled();
  });
});
```

### Test Coverage

Aim for:
- **>80%** for business logic (services)
- **>70%** for route handlers
- **>60%** for UI components

Check coverage:
```bash
npm test -- --coverage
```

## 📚 Documentation Requirements

Update documentation when:
- Adding new features
- Changing APIs
- Modifying architecture
- Adding dependencies
- Changing configuration

Files to update:
- `README.md` - If feature list changes
- `ARCHITECTURE.md` - If design changes
- `DEVELOPER_GUIDE.md` - If patterns change
- `CODE_MAP.md` - If structure changes
- Inline code comments

## 🐛 Bug Reports

Use this template:

```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., Windows 10]
- Node.js version: [e.g., 18.17.0]
- Browser: [e.g., Chrome 120]

## Screenshots
If applicable

## Additional Context
Any other relevant information
```

## 💡 Feature Requests

Use this template:

```markdown
## Feature Description
Clear description of the feature

## Use Case
Why is this feature needed?

## Proposed Solution
How should it work?

## Alternatives Considered
Other approaches you've thought about

## Additional Context
Any other relevant information
```

## ❓ Questions?

- Check [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)
- Search existing issues
- Ask in discussions
- Reach out to maintainers

## 🎉 Recognition

Contributors will be:
- Listed in the repository
- Mentioned in release notes
- Credited for their work

Thank you for contributing! 🙏

---

## Quick Reference

### Common Commands

```bash
# Development
npm run dev                    # Start backend
cd client && npm run dev       # Start frontend

# Testing
npm test                       # Backend tests
cd client && npm test          # Frontend tests

# Linting
npm run lint                   # Lint backend (if configured)
cd client && npm run lint      # Lint frontend (if configured)

# Git
git checkout -b feature/name   # Create branch
git add .                      # Stage changes
git commit -m "type: message"  # Commit
git push origin feature/name   # Push
```

### Links

- [Quick Start](./QUICK_START.md)
- [Developer Guide](./DEVELOPER_GUIDE.md)
- [Architecture](./ARCHITECTURE.md)
- [Code Map](./CODE_MAP.md)
