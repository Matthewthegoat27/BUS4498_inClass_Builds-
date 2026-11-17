# Extract Event Card Task Specification

> This task is Level 2 because it uses one fixed model-supported operation with a predetermined prompt and a fixed output check. The model does not choose tools or decide what to examine next.

## Basic Information

- **Task ID:** T2
- **Task name:** Extract Event Card
- **Task type:** Extract
- **Task owner:** Club Event Radar Agent; the submitting club officer owns the event facts.
- **Automation level (proposed):** L2.

## 1. Task Description

Turn one informal announcement into a structured event card with the fields club as written, title, date, start time, end time, place as written, description, and contact. Send the exact announcement text to the configured text-generation model (Groq, llama-3.3-70b-versatile) in a predetermined prompt that requires a structured response, then check the response with fixed rules: every field is present in the response, each field is marked stated or missing, every stated value appears in or is directly supported by the announcement text, and date and time values use the required formats.

The model-supported operation is extraction only. A field the announcement does not state is marked missing instead of guessed; the model may not fill a date from the flyer photo, an earlier post, or general knowledge, and may not translate a club nickname into an official name (T3 matches the club). The workflow needs this task because T3 and T4 can only check explicit, structured facts. After the check, apply the workflow's fixed routing rule: if club, date, start time, or place is missing, send the card to H1: Request Missing Details from Officer; otherwise send it to T3: Check Posting Rules.

## 2. Inputs

### Input 1

- **Input name:** Submitted announcement
- **Contents and format:** Run ID, post ID, trigger type, officer name and club as typed, submission time, the exact announcement text (plain text), and an optional flyer photo reference marked reference only. On a follow-up run, also the saved event card and the officer's reply.
- **Source:** T1: Retrieve Announcement and Club Context.

- **If a required input is missing or invalid:** If the announcement text is empty or unreadable, do not call the model; return a Missing details request asking the officer to resubmit the text and send it to H1: Request Missing Details from Officer. A missing run ID or post ID is an operational error: stop the run as incomplete and show it in the moderator queue for H2: Moderator Reviews Held Post.

## 3. Outputs

### Output 1

- **Output name:** Event card
- **Contents and format:** Structured record with run ID, post ID, club as written, title, date (YYYY-MM-DD), start time and end time (24-hour HH:MM, campus time zone), place as written, description, contact, and a stated-or-missing flag and supporting announcement excerpt for every field. No field contains a value that is not in the announcement.
- **Next task or recipient:** T3: Check Posting Rules when club, date, start time, and place are all stated.
- **Complete when:** The model response passed every fixed check, every field is flagged, and the card is saved to the events table with status checking and read back.

### Output 2

- **Output name:** Missing details request
- **Contents and format:** Run ID, post ID, the partial event card, the list of required fields that are missing, and one specific question naming exactly what the officer must add (for example, What date and start time is the event?).
- **Next task or recipient:** H1: Request Missing Details from Officer.
- **Complete when:** At least one required field is flagged missing and the request names each missing field.

### Output 3

- **Output name:** Extraction failure
- **Contents and format:** Run ID, post ID, failure category (timeout, model error, invalid structured response, or unsupported value), number of attempts, and time. Contains no guessed event facts.
- **Next task or recipient:** The club moderator's queue in H2: Moderator Reviews Held Post; the officer sees that the post is not yet decided.
- **Complete when:** The failure record is saved and the run is marked incomplete because of an operational error.

## 4. Planned Tools

### Tool 1

- **Tool name:** extract_event_card
- **Input:** Submitted announcement.
- **Output:** Event card; Missing details request when a required field is missing; Extraction failure when the operation fails.
- **Implementation Route:** One web API call to the configured text-generation model (Groq, llama-3.3-70b-versatile) with a fixed extraction prompt and structured output, followed by functions/scripts that check field presence, formats, and that each stated value is supported by the announcement text, then a database write and read-back of the card in the events table.
- **Integration approach:** Direct integration.
- **Role in this task:** Convert the announcement into the event card in a fixed prompt-and-check sequence. The model has no tool access and cannot search, match clubs, publish, hold, or contact anyone.
- **Task timeout:** 30 seconds total for one post, including the model request, checks, and saving the card.
- **Maximum retries:** 1.
- **Retry only when:** The model request times out, returns a temporary server or rate-limit error, or returns a response that is not valid structured output, and time remains. Wait 2 seconds before the retry. The model call creates no record or message; the card is saved only once, keyed by post ID, so a retry cannot create a duplicate card.
- **On timeout, exhausted retries, or an error that cannot be retried:** Save an Extraction failure, mark the run incomplete because of an operational error, and show it in the moderator queue for H2: Moderator Reviews Held Post. Do not send a partial or unchecked card to T3, and do not ask the officer a question generated from a failed response.
