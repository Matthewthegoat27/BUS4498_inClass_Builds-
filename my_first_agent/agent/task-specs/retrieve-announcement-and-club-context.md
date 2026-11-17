# Retrieve Announcement and Club Context Task Specification

> This task is Level 1 because it applies fixed reads and fixed presence, format, and version checks. It makes no judgment about the announcement; it only loads and packages the evidence that T2 and T3 need.

## Basic Information

- **Task ID:** T1
- **Task name:** Retrieve Announcement and Club Context
- **Task type:** Retrieve
- **Task owner:** Club Event Radar Agent; the club moderator owns the club list, posting rules, campus places, and moderator lessons.
- **Automation level (proposed):** L1.

## 1. Task Description

When a club officer selects Submit announcement, load the submitted announcement and everything later tasks need to check it: the official club list entry for the club as typed, the club's earlier posts, the posting rules, the campus places list, and the enabled moderator lessons. Apply a fixed rule set: confirm the run ID and announcement text are present and readable, confirm each reference record was read successfully, and record the version or read time of each record. A flyer photo, when attached, is passed along for reference only; its contents are never treated as event facts.

Apply the duplicate rule from the workflow trigger: if identical announcement text from the same officer was submitted within the last 10 minutes, record the submission as a repeat and start no second run. For a follow-up run started by an officer reply (H1) or a moderator answer (H2), load the saved event card and the reply for that one post only; mark that extraction can be skipped unless the officer changed the announcement text.

The workflow needs this task so that every later decision uses the same, traceable evidence. A valid empty earlier-post history (a club's first post) is different from an unreadable record and must never be reported as empty. T1 does not interpret the announcement, guess a club, or change any record.

## 2. Inputs

### Input 1

- **Input name:** Announcement submission
- **Contents and format:** Structured page record with run ID, post ID (new or existing), submitting officer's name and club as typed, submission time, the pasted announcement text (plain text), an optional flyer photo reference, and a trigger type of new submission, officer reply, or moderator answer.
- **Source:** The club officer through the Club Event Radar page (Submit announcement), or the saved reply record from H1: Request Missing Details from Officer or H2: Moderator Reviews Held Post.

### Input 2

- **Input name:** Club records
- **Contents and format:** Rows from the clubs table (official name, nicknames, active or inactive status) and rows from the events table for the club as typed (earlier posts with date, time, place, and status: published, held, awaiting officer, or closed). A valid empty history is expected for a club's first post.
- **Source:** Club Event Radar database (clubs and events tables), maintained by the club moderator.

### Input 3

- **Input name:** Rule and lesson records
- **Contents and format:** The written posting rules file (required fields, allowed dates and times, content limits), the campus places list with aliases, and the moderator lessons table rows that are switched on, each with its version or last-updated time.
- **Source:** Club Event Radar context files (posting-rules and campus-places) and the lessons table, maintained by the club moderator.

- **If a required input is missing or invalid:** Empty or unreadable announcement text: do not start extraction; save a status of awaiting officer and show the officer that the announcement could not be read (H1: Request Missing Details from Officer receives the case). A failed read of the club records, rules, places, or lessons: stop the run as incomplete because of an operational error and show it in the moderator queue for H2: Moderator Reviews Held Post; never substitute an empty list for an unreadable one.

## 3. Outputs

### Output 1

- **Output name:** Submitted announcement
- **Contents and format:** Run ID, post ID, trigger type, officer name and club as typed, submission time, the exact announcement text, optional flyer photo reference marked reference only, and, for a follow-up run, the saved event card and the officer or moderator reply with a flag stating whether extraction may be skipped.
- **Next task or recipient:** T2: Extract Event Card (or T3: Check Posting Rules directly when a follow-up run reuses the saved event card unchanged).
- **Complete when:** The announcement text is present and readable, the run ID and post ID are recorded, and the repeat check has been applied.

### Output 2

- **Output name:** Club record and earlier posts
- **Contents and format:** The club list entry or entries that could match the club as typed (official name, nicknames, status) and the club's earlier posts with statuses, plus a read status of loaded, loaded-empty, or failed.
- **Next task or recipient:** T3: Check Posting Rules.
- **Complete when:** The read succeeded and an empty history is explicitly labeled loaded-empty.

### Output 3

- **Output name:** Posting rules and campus places
- **Contents and format:** The posting rules text and the campus places list with aliases, each with its version or read time.
- **Next task or recipient:** T3: Check Posting Rules.
- **Complete when:** Both records were read successfully and carry a version or read time.

### Output 4

- **Output name:** Moderator lessons
- **Contents and format:** The enabled lessons only, each with lesson ID, text, and on status. A valid empty set is labeled loaded-empty.
- **Next task or recipient:** T3: Check Posting Rules.
- **Complete when:** The lessons table was read successfully and only enabled lessons are included.

### Output 5

- **Output name:** Context load failure
- **Contents and format:** Exception record with run ID, post ID, which record failed, number of attempts, error category, and time. Includes no event facts.
- **Next task or recipient:** The club moderator's queue in H2: Moderator Reviews Held Post; the officer sees that the post is not yet decided.
- **Complete when:** The failure record is saved and the run is marked incomplete because of an operational error, not published or held.

## 4. Planned Tools

### Tool 1

- **Tool name:** retrieve_announcement_context
- **Input:** Announcement submission; Club records; Rule and lesson records.
- **Output:** Submitted announcement; Club record and earlier posts; Posting rules and campus places; Moderator lessons; Context load failure when a read fails.
- **Implementation Route:** Database queries (read-only) on the events, clubs, and lessons tables, and file operations (read-only) on the posting rules and campus places files, followed by functions/scripts for fixed presence, format, repeat, and version checks.
- **Integration approach:** Direct integration.
- **Role in this task:** Load and package the evidence for one post and apply fixed checks. It does not interpret the announcement, choose a club, edit any record, publish or hold a post, or contact anyone.
- **Task timeout:** 10 seconds total for all reads and checks for one post.
- **Maximum retries:** 1.
- **Retry only when:** A temporary database or file read error occurs and time remains. Wait 2 seconds before the retry. Do not retry denied access or a confirmed missing file. The tool only reads, so a retry cannot create a duplicate record or message.
- **On timeout, exhausted retries, or an error that cannot be retried:** Save a Context load failure, mark the run incomplete because of an operational error, and show it in the moderator queue for H2: Moderator Reviews Held Post. Do not continue to T2 or treat any unreadable record as empty.
