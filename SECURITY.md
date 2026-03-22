# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 0.2.x | ✅ Active |
| 0.1.x | ❌ No longer supported |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability, report it privately:

1. Go to the [Security tab](https://github.com/Dhwanil25/Agentis/security) on GitHub
2. Click **"Report a vulnerability"**
3. Fill in the details — what it is, how to reproduce it, and the potential impact

You can expect an acknowledgement within **48 hours** and a resolution timeline within **7 days** depending on severity.

## What Counts as a Security Issue?

- Exposure of API keys or secrets stored in the browser
- Cross-site scripting (XSS) via agent output rendering
- Injection attacks through the task input
- Unintended data exfiltration to third parties
- Engine middleware endpoints accessible without authentication

## Out of Scope

- Issues in third-party LLM provider APIs (report those to the respective provider)
- Theoretical vulnerabilities with no practical exploit path
- Issues already publicly known

## Our Commitment

- We will keep you updated throughout the investigation
- We will credit you in the release notes if you wish (opt-in)
- We will not take legal action against researchers acting in good faith
