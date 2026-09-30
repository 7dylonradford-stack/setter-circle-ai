# The Setter Circle — AI Roleplay Pro

This build keeps the website design but replaces scripted prospect replies with a real OpenAI-powered roleplay engine.

## Architecture
- Prospect AI: stays in character and holds full multi-turn context.
- Evaluator AI: silently evaluates each turn and updates trust, interest, patience, signals and coaching.
- Debrief AI: performs a deep final review with eight skill scores and tailored feedback.
- API key stays server-side.

## Run locally
1. Install Node.js 20+.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Put your OpenAI API key in `.env`.
5. Run `npm start`.
6. Open http://localhost:3000

## Deploy
Deploy the whole folder to a Node-compatible host and add `OPENAI_API_KEY` as a secret/environment variable. Do not put the key in `public/index.html`.

## Production upgrades recommended
- Replace the in-memory session Map with Redis/Postgres.
- Add authentication/student accounts.
- Add rate limits and per-user quotas.
- Persist transcripts and score history.
- Add an instructor dashboard and scenario builder.
- Add streaming for prospect replies.
- Add a scenario library authored from real anonymized setter conversations.
