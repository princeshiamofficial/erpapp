# AGENTS.md

Welcome to the **Color Hut** repository. This project is a premium enterprise management system built with Next.js, Genkit AI, and MySQL.

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
- **Banglish Summary**: Provide a concise summary of the work performed in **Banglish** (Bengali written in Latin/English script) after completing each task. **NEVER use direct Bengali Unicode characters (e.g., বাংলা)** — always write Bengali phonetically in English letters only (e.g., "Ami kaj shesh korlam").
- **Summary of Actions**: After the Banglish summary, provide a clear, bulleted "Summary of Actions" in English to detail the specific technical steps taken.
- **Benefit Comparison Table**: Always provide a comparison table in **Banglish** (using Latin/English script, never Unicode Bengali) showing the **Previous State/Implementation** vs. the **Recent State/Benefits** of your changes at the end of each task.
- **Git Push Policy**: NEVER push code to GitHub automatically after completing a task. Only run `git push` when the user explicitly requests/commands to push to GitHub.
- **Safety**: Ensure all database operations are sanitized and follow the established Zod validation patterns.

## Commit Messages & PR Descriptions

**Prefer Conventional Commits**: `type(scope): subject` (scope optional)
Example: `feat(auth): add user authentication`
*Do not reference Claude in commit messages.*

### PR Description Format

- Start with a short, user-facing paragraph describing the product change.
- Add a **Closes** section with relevant issue links (GitHub, Linear, etc.).
- For feature PRs, add **How to test** from a product/UX standpoint.
- For bugfix PRs, use **How to reproduce** when helpful.
- Optionally add a **What changed** section for implementation highlights.
- *Do not* add a "How this was tested" section listing specs/commands.
