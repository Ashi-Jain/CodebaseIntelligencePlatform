# Codebase Intelligence Platform

AI-powered repository analyzer that automatically understands and documents any GitHub codebase.

Upload or provide a GitHub repository URL and the platform will:

- Analyze project architecture
- Detect tech stack
- Understand code flow
- Identify important files
- Generate repository documentation using AI

Built using:

- Node.js
- Express.js
- Gemini AI
- GitHub repository parsing

---

# Features

## Intelligent Repository Analysis

The platform automatically:

- Clones repositories
- Scans project structure
- Detects important files dynamically
- Filters unnecessary files
- Sends optimized context to Gemini AI

This reduces:

- token usage
- API cost
- Gemini rate-limit issues

---

# AI Generated Outputs

The platform can generate:

- Repository Overview
- Tech Stack Detection
- Architecture Explanation
- Code Flow Understanding
- Key File Analysis
- Folder Structure Summary
- Backend / Frontend Separation
- API Flow Explanation

---

# Intelligent File Filtering

Instead of sending the entire repository to AI:

✅ Important files are scored dynamically  
✅ Framework-specific files are prioritized  
✅ Large unnecessary files are ignored  
✅ Only optimized code context is sent to Gemini

This makes the platform scalable for large repositories.

---

# Project Structure

```bash
CodebaseIntelligencePlatform/
│
├── backend/
│   │
│   ├── routes/
│   │   └── analyze.js
│   │
│   ├── services/
│   │   ├── geminiService.js
│   │   ├── githubService.js
│   │   ├── filterService.js
│   │   └── parserService.js
│   │
│   ├── utils/
│   │   └── fileScanner.js
│   │
│   ├── temp/
│   │
│   ├── .env
│   ├── .env.example
│   ├── server.js
│   └── package.json
│
├── frontend/
│
└── README.md
```
