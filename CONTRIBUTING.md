# Contributing to MarkdownFlows

First off, thank you for considering contributing to MarkdownFlows! It's people like you that make MarkdownFlows such a great tool.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct: be respectful, inclusive, and constructive.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues as you might find that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed after following the steps**
- **Explain which behavior you expected to see instead and why**
- **Include screenshots if possible**
- **Include your environment details** (OS, Node.js version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a step-by-step description of the suggested enhancement**
- **Provide specific examples to demonstrate the steps**
- **Describe the current behavior and explain which behavior you expected to see instead**
- **Explain why this enhancement would be useful**

### Pull Requests

- Fill in the required template
- Do not include issue numbers in the PR title
- Follow the TypeScript/JavaScript styleguide
- Include screenshots and animated GIFs in your pull request whenever possible
- End all files with a newline
- Avoid platform-dependent code

## Development Setup

1. Fork and clone the repo
2. Run `npm install` to install dependencies
3. Run `npm start` to start the development server
4. Create a branch for your changes

### Project Structure

```
src/
├── main.ts              # Electron main process
├── preload.ts           # IPC bridge between main and renderer
├── renderer.tsx         # React entry point
├── App.tsx              # Root React component
├── pages/               # Page components
├── components/          # Reusable UI components
├── services/            # Backend services (main process)
└── lib/                 # Utility functions
```

### Coding Guidelines

- Use TypeScript for all new code
- Follow existing code style (enforced by ESLint/Prettier)
- Write meaningful commit messages
- Add comments for complex logic
- Keep functions small and focused

### Testing Your Changes

Before submitting a PR:

1. Run `npm run lint` to check for linting errors
2. Test your changes manually in development mode
3. Test both with and without an OpenAI API key configured
4. Test on different diagram types if your change affects rendering

## Style Guides

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

### TypeScript Style Guide

- Use meaningful variable and function names
- Prefer `const` over `let` when possible
- Use async/await over raw promises
- Type all function parameters and return values
- Use interfaces for object shapes

### Component Guidelines

- Use functional components with hooks
- Keep components focused on a single responsibility
- Extract reusable logic into custom hooks
- Use proper TypeScript types for props

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

Thank you for contributing! 🎉
