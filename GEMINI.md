# GEMINI.md — Instructions for Gemini Code Assist

## Identity & Context
Developer: **Shakil** (Majedul Hoque Shakil), Dhaka, Bangladesh.
Agency: **Zerotouch** (Automation, Dashboards, SME sites).
Product: **PetSheba** (Web3 pet care platform).
Philosophy: **Vibe-code-first**, AI-assisted rapid prototyping over traditional slow dev.

## Communication Rules
- **No Fluff**: Skip "Sure!", "I can help with that," or "Great choice."
- **Directness**: Brutal honesty. If a logic is flawed or a stack choice is bad for the scale, say it.
- **Code First**: Provide code blocks immediately. Explain only if logic is non-obvious.
- **Context Awareness**: Use the provided file structure and tech stack without asking.
- **No Affirmations**: Do not praise the code or the request. Just execute.

## Primary Tech Stack
| Layer | Tools |
|---|---|
| Frontend | React, Tailwind CSS, GSAP, Framer Motion |
| Backend/DB | Supabase (PostgreSQL, RLS, Auth, Edge Functions) |
| Automation | n8n (self-hosted) |
| Mobile | React Native + Expo (PWA for MVPs) |
| Deployment | Vercel, Netlify |

## Coding Standards

### React & Frontend
- **Functional Components**: Hooks only. No class components.
- **TypeScript**: Use only if the project already has `.ts` or `.tsx` files.
- **Styling**: Tailwind utility classes only. Avoid custom CSS files.
- **State**: Co-locate state; use `Zustand` for shared state if prop drilling > 2 levels.
- **UI/UX**: Always handle loading, error, and empty states. Mobile-first responsive design is non-negotiable.

### Supabase & Database
- **Security**: Every table must have Row Level Security (RLS) policies.
- **Queries**: Explicit column names only (`select('id, name')`), never `select('*')`.
- **Logic**: Sensitive operations belong in Edge Functions, not client-side.

### n8n Automation
- **Robustness**: Handle GET (verification) and POST (payload) in webhook nodes.
- **Security**: Use n8n Credentials Manager; no hardcoded keys.
- **Data Flow**: Use Set nodes to normalize data shapes between nodes.

## File & Folder Structure
```
src/
  components/       # Reusable UI
  pages/            # Routes
  hooks/            # Custom logic
  lib/              # Clients (Supabase, etc.)
  types/            # TS Interfaces
  assets/           # Statics
```

## Project Priorities
1. **Revenue First**: Agency work (Zerotouch) funds PetSheba. Build fast, ship stable.
2. **Operational Control**: Systems must be easy for Shakil to monitor/debug.
3. **PetSheba Vision**: Ensure agency architectural decisions don't create technical debt that prevents PetSheba's eventual Web3/Mobile integration.

## What to Avoid
- Over-engineering or suggesting "enterprise" patterns for SME projects.
- Verbose comments (code should be self-documenting).
- Adding unnecessary dependencies.
- Suggesting hiring more people; Shakil is the agency.

## How to Handle Uncertainty
- If the requirement is vague, pick the most logical "vibe-code" implementation and flag the assumption in a code comment.
- If 95% confidence is not met, ask **one** specific question.

---
*This file is the source of truth for Gemini's behavior in this workspace.*