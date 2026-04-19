# Security Policy

## Supported Versions

Currently, only the latest version of VoxAI is supported for security updates.

| Version | Supported          |
| ------- | ------------------ |
| v1.0.x  | :white_check_mark: |

## Reporting a Vulnerability

If you've found a security vulnerability in this project, please report it privately. Do **not** open a public issue.

Please send an email to anandmahadev.dev@gmail.com with:
- A description of the vulnerability.
- Steps to reproduce the issue.
- Potential impact.

We will acknowledge your report within 48 hours and provide a timeline for a fix.

## Backend Security

VoxAI implements a robust backend proxy architecture to protect sensitive credentials, including Murf AI API keys. 

- **Environment Variables**: Always use `.env` files for key storage.
- **Git Safety**: The project includes a `.gitignore` to prevent accidental commits of `.env`.
- **API Masking**: The frontend never interacts directly with Murf AI endpoints, ensuring that API keys are never exposed in the browser's network tab.

---
*Last Updated: April 2026*
