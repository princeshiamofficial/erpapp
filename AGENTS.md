# AGENTS.md

Welcome to the **ERP App** repository. This project is a premium enterprise management system built with Next.js, Genkit AI, and MySQL.

This file provides guidance for AI agents working on this codebase.

## Repository Overview
- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **AI Integration**: [Genkit AI](https://firebase.google.com/docs/genkit)
- **Database**: MySQL (via `mysql2`)
- **Styling**: Tailwind CSS & Radix UI
- **Real-time**: Socket.io

## Agent Resources
Detailed instructions and workflows for agents can be found in the `.agent/` directory:

### 🛠️ Workflows
Common tasks and procedures:
- [Development Workflow](.agent/workflows/dev.md): How to run the app locally.
- [Deployment Workflow](.agent/workflows/deploy.md): Procedures for shipping to production.
- [AI Workflow](.agent/workflows/genkit.md): Managing Genkit AI flows and development.

### 🧠 Skills
Specific knowledge bases:
- [Coding Standards](.agent/skills/coding.md): Best practices for this codebase.

### 👤 Persona
- [Interaction Style](.agent/persona.md): User's communication preferences and language requirements.

## Interaction Guidelines
- **Premium UI**: Always prioritize high-end design. Use Radix UI components, Framer Motion for transitions, and curated Color palettes.
- **AI-First**: When building features, consider how Genkit AI can enhance the user experience (e.g., smart summaries, automated forms).
- **Safety**: Ensure all database operations are sanitized and follow the established Zod validation patterns.
