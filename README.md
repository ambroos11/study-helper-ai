# Learnova — AI study space + flashcard learning

A Dutch-first, responsive Next.js prototype combining an AI study tutor with a Quizlet-inspired study-set and flashcard workflow.

## Included
- Premium Learnova dashboard and responsive navigation.
- AI Tutor connected through a server-side OpenAI API route.
- Create and save study sets locally in the browser.
- Add flashcards manually using `term | definition` lines.
- Generate flashcards from pasted course notes using the OpenAI API.
- Interactive flip cards, previous/next controls and shuffle.
- Multiple-choice practice mode with score feedback.
- Sample study sets so the interface can be tested before adding an API key.
- Dutch, English and French language selection for AI requests (the current UI is Dutch-first).

## Run locally
Requirements: Node.js 20 or newer.

1. Extract the ZIP.
2. Open a terminal in the `Learnova` folder.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Copy `.env.example` to `.env.local` and add your OpenAI API key:
   ```env
   OPENAI_API_KEY=your_key_here
   OPENAI_MODEL=gpt-4.1-mini
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```
6. Open http://localhost:3000.

The flashcard library is stored in browser localStorage in this prototype. It is not yet synced between devices or user accounts. The sample flashcards and manual set builder work without an API key; AI Tutor and AI flashcard generation require a configured OpenAI API key and may incur API charges.

## Before public launch
This is a prototype, not a production-ready student platform. Add authentication, per-user database storage, rate limiting, file scanning/validation, secure upload storage, cost quotas, account/data deletion, privacy notices, accessibility checks and age-appropriate consent flows before collecting student accounts or personal information. Never expose `OPENAI_API_KEY` in browser code or commit `.env.local` to Git. Involve a parent/guardian and check relevant provider and Belgian business requirements before setting up paid services or accepting payments.
