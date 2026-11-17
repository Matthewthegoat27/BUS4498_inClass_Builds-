# Publish Event Post Task Specification

> This task is Level 1 because it performs one fixed save-and-read-back action for a post that T4 or a moderator has already decided to publish. It makes no decision of its own.

## Basic Information

- **Task ID:** T5
- **Task name:** Publish Event Post
- **Task type:** Act
- **Task owner:** Club Event Radar Agent; the club moderator owns what appears on the public event list.
- **Automation level (proposed):** L1.

## 1. Task Description

Save the checked event card as a public post on the Club Event Radar page and confirm it by reading it back. The action runs only on a Publish decision from T4 or an explicit Approve decision from a signed-in moderator in H2. When the decision names a replacement post ID, update that earlier post in place instead of adding a second post, so the club never shows two posts for the same event.

The applicable rule is fixed: publish exactly the card that was checked (or approved), keyed by post ID, and report published only after the read-back shows the same club, title, date, time, place, and public status. The workflow needs this task because the system goal only counts a decision that is saved and readable. If the save or read-back fails, nothing is shown as published and the run is operationally incomplete. This task never changes event facts, sends messages, or contacts anyone outside the page.

## 2. Inputs

### Input 1

- **Input name:** Publish decision
- **Contents and format:** Run ID, post ID, decision publish, the checked event card, rule-check evidence reference, and replacement post ID or none.
- **Source:** T4: Decide Publish or Hold.

### Input 2

- **Input name:** Moderator decision
- **Contents and format:** Post ID, decision approve, moderator name and sign-in identity, decision time, the reviewed event card version, and any moderator note. Only an Approve decision reaches this task.
- **Source:** H2: Moderator Reviews Held Post.

- **If a required input is missing or invalid:** Publish nothing when neither a Publish decision nor a signed-in moderator Approve is present, when the card differs from the version that was checked or approved, or when the replacement post ID does not belong to the same club. Mark the run incomplete because of an operational error and return the case to H2: Moderator Reviews Held Post with the mismatch named.

## 3. Outputs

### Output 1

- **Output name:** Published event post
- **Contents and format:** Public post on the Club Event Radar page with official club name, title, date, start and end time, campus place, description, and contact, linked to its post ID and the decision that authorized it.
- **Next task or recipient:** Students browsing the Club Event Radar page; the submitting officer sees status published on their post.
- **Complete when:** The read-back of the post ID shows public status and exactly the checked or approved card, and only one public post exists for that event.

### Output 2

- **Output name:** Publish status
- **Contents and format:** Run ID, post ID, outcome (published, replaced earlier post, failed, or uncertain), time, number of save attempts, and any error category. No credentials or keys.
- **Next task or recipient:** The submitting officer on their post; the club moderator's queue in H2: Moderator Reviews Held Post when the outcome is failed or uncertain. The run completes as C1: Run complete: Published only on a confirmed read-back.
- **Complete when:** The status matches the read-back evidence; failed or uncertain is never shown as published.

## 4. Planned Tools

### Tool 1

- **Tool name:** publish_event_post
- **Input:** Publish decision; Moderator decision.
- **Output:** Published event post; Publish status.
- **Implementation Route:** Database write (insert or update keyed by post ID) to the events table setting the post public, followed by a read-back query of the same post ID and a check that the club has only one public post for that event.
- **Integration approach:** Direct integration.
- **Role in this task:** Make one decided post public and confirm it. The tool cannot change event facts, publish a held post without a moderator Approve, delete another club's post, send messages, or contact anyone.
- **Task timeout:** 10 seconds total for the save, the read-back, and the status record.
- **Maximum retries:** 1.
- **Retry only when:** The save fails with a temporary database connection error, or its outcome is uncertain, and time remains. Before any retry, read back the post ID: if the post is already public with the same card, record published and do not save again. The write is keyed by post ID (an upsert), so a retry updates the same row and cannot create a second post.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record Publish status failed or uncertain with the error category, keep the post marked not published on the officer's page, mark the run incomplete because of an operational error, and send it to the club moderator's queue in H2: Moderator Reviews Held Post. Do not report the post as published or continue as if it succeeded.
