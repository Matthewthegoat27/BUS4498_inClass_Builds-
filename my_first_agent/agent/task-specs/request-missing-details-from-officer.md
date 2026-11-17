# Request Missing Details from Officer Task Specification

> This task is Level 0 because the club officer supplies the missing event facts. Software only displays the saved question and records the officer's reply; it never supplies or assumes an answer.

## Basic Information

- **Task ID:** H1
- **Task name:** Request Missing Details from Officer
- **Task type:** Retrieve
- **Task owner:** The submitting club officer.
- **Automation level (proposed):** L0; the officer supplies or corrects the missing facts. The planned tool only supports the handoff.

## 1. Task Description

When T2 finds that the club, date, start time, or place is missing, or when a moderator in H2 asks the officer a question, save one specific question on the officer's post and end the active run as awaiting officer. The officer reads the question on the Club Event Radar page and replies with the missing fact, a corrected announcement, or a statement that the event is cancelled.

The officer's knowledge of their own event is the human judgment this task depends on. Software may display the question and record the reply, but it cannot fill in a date, time, place, or club, choose between two possibilities, or treat silence as confirmation. The workflow needs this task because the system goal forbids inventing or guessing event facts. A reply starts a new bounded run for that one post through T1; T2 runs again only when the officer changed the announcement text.

## 2. Inputs

### Input 1

- **Input name:** Missing details request
- **Contents and format:** Run ID, post ID, the partial event card, the list of missing required fields, and one specific question; or a moderator question for the officer from H2 with the moderator's name and the post ID.
- **Source:** T2: Extract Event Card, or H2: Moderator Reviews Held Post when the moderator selects Ask the officer.

### Input 2

- **Input name:** Officer reply
- **Contents and format:** The officer's typed answer or corrected announcement text, or an explicit Cancel event choice, with reply time and the question ID it answers. This input is absent until the officer responds.
- **Source:** The submitting club officer on the Club Event Radar page.

- **If a required input is missing or invalid:** If the request does not name an answerable question, keep the post awaiting officer and send it to the club moderator in H2: Moderator Reviews Held Post to correct the question. If the reply is empty or still lacks a required fact, keep the post awaiting officer and show which field is still missing. Never substitute an assumed answer.

## 3. Outputs

### Output 1

- **Output name:** Officer question status
- **Contents and format:** Question ID, run ID, post ID, the exact question, the missing fields, assignment time, response deadline, and status (awaiting officer, answered, cancelled, or expired). Visible to the officer on their post.
- **Next task or recipient:** The submitting officer on the Club Event Radar page; the events table record for the post.
- **Complete when:** The question and status are saved and confirmed by read-back, the post shows awaiting officer, and no dependent check or publish step continues.

### Output 2

- **Output name:** Officer reply record
- **Contents and format:** Question ID, post ID, the officer's answer or corrected text exactly as entered, reply time, and whether the announcement text changed.
- **Next task or recipient:** T1: Retrieve Announcement and Club Context on a new bounded run for this post only (or the post is closed when the officer cancels).
- **Complete when:** The reply is saved, linked to the correct question, and confirmed by read-back.

## 4. Planned Tools

### Tool 1

- **Tool name:** request_missing_details
- **Input:** Missing details request; Officer reply when provided.
- **Output:** Officer question status; Officer reply record.
- **Implementation Route:** Authenticated page operations display the saved question on the officer's post and save the officer's reply as a record in the events table, with read-back before reporting it saved.
- **Integration approach:** Direct integration.
- **Role in this task:** Show the question, capture the officer's reply, and keep the awaiting-officer status. The tool supplies no answer, does not edit the event card on its own, sends no email or outside message, and makes no judgment about the facts.
- **Task timeout:** Human response deadline: 48 hours after the question is saved, or 24 hours before the event's stated date when that is sooner. The active automated run ends immediately on handoff; each supporting display or save operation has a 5-second limit.
- **Maximum retries:** Not applicable — manual task.
- **Retry only when:** Not applicable — manual task.
- **On timeout, exhausted retries, or an error that cannot be retried:** When the response deadline passes, mark the question expired, keep the post unpublished, and send the case to the club moderator's queue in H2: Moderator Reviews Held Post to close or follow up; a missed deadline is not approval and never publishes the post. If saving the question or reply fails or its outcome is uncertain, read back the record before saving again so no duplicate question appears; if it still cannot be confirmed, mark the run incomplete because of an operational error and show it in the moderator queue.
