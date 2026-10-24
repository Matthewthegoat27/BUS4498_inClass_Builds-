# Club Event Radar — teammate handoff

## What works now

The [website](https://matthewthegoat27.github.io/BUS4498_InClass_Builds/event_radar/) lists published events and lets club officers submit text or a JPG/PNG flyer. The Supabase `submit-event` agent checks posts against the rules, saves them, catches duplicates, and sends photo posts to moderator review. Moderator sign-in and approve/reject controls are in place. The connected Supabase project reports an active agent (version 8, JWT verification off) and an `events` table with row-level security enabled.

## Where things live

- **Repository:** `BUS4498_InClass_Builds`, in the `event_radar/` folder.
- **Supabase project:** Matthewthegoat27's Project — [Project URL](https://nghmzarpalujmmqvauyy.supabase.co).
- **Website files:** `index.html`, `style.css`, `app.js`, and `config.js`.
- **Agent:** `supabase/functions/submit-event/index.ts`; deployment settings are in `supabase/config.toml`.
- **Database changes:** `supabase/migrations/`; the main table is `public.events`.
- **Posting guidance and test cases:** `context/` and `test/sample-announcements.md`.

## Secrets

The agent uses `OPENAI_API_KEY` for AI and `SUPABASE_SECRET_KEYS` (with `SUPABASE_SERVICE_ROLE_KEY` as a fallback) for its database connection. These are set under Supabase → Edge Functions → Secrets. You do not need the values; never put them in the repository or website files.

## How to test

- Submit sample post A once: it should publish if the same event is not already posted. Submit C after A: it should say it was already posted.
- Submit the sample flyer with its clothing-swap text: it should wait for moderator review. Approve it while signed in; it should then appear on the public board with the flyer.
- Post E (the resume workshop with missing details): it should wait and identify the missing date, time, and place.

## What’s next

The optional nightly clean-up has not been set up, so past events may need to be archived manually. A useful next idea is to add the optional scheduled cleanup, then confirm the live Pages site, flyer upload, and moderator review flow after the next upload.

## How we take turns

Before you start, download the latest changes (**pull**) in GitHub Desktop. When you stop, upload your changes (**push**) so the other person can get them. Tell each other before working on the project, and avoid editing the same files at the same time.
