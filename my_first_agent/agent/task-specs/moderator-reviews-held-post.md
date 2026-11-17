# Moderator Reviews Held Post Task Specification

> This task is Level 0 because a signed-in club moderator makes the decision. Software displays the held post with its evidence and records the moderator's choice; it never approves, rejects, or answers on the moderator's behalf.

## Basic Information

- **Task ID:** H2
- **Task name:** Moderator Reviews Held Post
- **Task type:** Verify
- **Task owner:** The signed-in club moderator.
- **Automation level (proposed):** L0; the moderator reviews the evidence and decides. The planned tool only supports the review.

## 1. Task Description

A signed-in club moderator opens a held post in the moderator queue, reads the event card, the hold reason, and T3's rule-by-rule evidence, and makes one of three decisions: Approve (the post may be published as reviewed), Ask the officer (save one specific question for the officer), or Reject (close the post with a plain-language reason). The moderator may also write or switch on a moderator lesson for future posts; a lesson can make later posts wait but can never publish one.

The moderator's judgment is the decision authority for every held post. The agent never overrides it, and completion of an automated run never means a held post was approved. The queue also shows cases the system could not finish (a failed read, extraction, rule check, decision save, or publish) and officer questions whose deadline expired, so a person always owns them. The workflow needs this task because the system goal forbids publishing any post that fails a rule or has an unresolved club or place without a human decision.

## 2. Inputs

### Input 1

- **Input name:** Held post
- **Contents and format:** Run ID, post ID, the event card, the plain-language hold reason, T3's rule-check result with Evidence summary and Unresolved issues, and whether the hold came from a rule outcome or a technical failure.
- **Source:** T4: Decide Publish or Hold, or T3: Check Posting Rules when it escalates directly.

### Input 2

- **Input name:** Operational exception
- **Contents and format:** Context load failure, Extraction failure, a failed decision save, a failed or uncertain Publish status, or an expired officer question, each with run ID, post ID, failure category or expiry time, and attempts made.
- **Source:** T1: Retrieve Announcement and Club Context, T2: Extract Event Card, T4: Decide Publish or Hold, T5: Publish Event Post, or H1: Request Missing Details from Officer.

### Input 3

- **Input name:** Moderator response
- **Contents and format:** The moderator's decision (Approve, Ask the officer, or Reject), the post ID and card version reviewed, the question text or reject reason when applicable, any lesson created or switched on, the moderator's signed-in identity, and decision time. This input is absent until the moderator acts.
- **Source:** The signed-in club moderator on the moderator page.

- **If a required input is missing or invalid:** If the held post lacks its evidence or card, keep it held and show the moderator what is missing; the moderator may ask the officer or reject, but cannot approve a card version that was not displayed. A response from someone who is not signed in as a moderator is not recorded. Without a moderator response the post stays held.

## 3. Outputs

### Output 1

- **Output name:** Moderator decision
- **Contents and format:** Post ID, decision (Approve, Ask the officer, or Reject), moderator name and sign-in identity, decision time, the reviewed card version, and the question or reject reason. An Approve applies only to the card version reviewed.
- **Next task or recipient:** Approve goes to T5: Publish Event Post; Ask the officer goes to H1: Request Missing Details from Officer; Reject closes the post as C2: Held post closed with reason, shown to the officer.
- **Complete when:** The decision is saved, linked to the correct post and card version, confirmed by read-back, and visible to the officer.

### Output 2

- **Output name:** Moderator lesson
- **Contents and format:** Lesson ID, lesson text, author, creation time, and on or off switch. A lesson can only add a reason to hold.
- **Next task or recipient:** The lessons table, read by T1: Retrieve Announcement and Club Context on later runs.
- **Complete when:** The lesson is saved with its switch state and confirmed by read-back. This output is optional and produced only when the moderator writes a lesson.

### Output 3

- **Output name:** Review status
- **Contents and format:** Post ID, status (held awaiting moderator, overdue, decided), assignment time, response deadline, and the person currently responsible.
- **Next task or recipient:** The moderator queue and the officer's post page.
- **Complete when:** The status is saved and visible; an overdue post remains held and unpublished.

## 4. Planned Tools

### Tool 1

- **Tool name:** record_moderator_review
- **Input:** Held post; Operational exception; Moderator response when provided.
- **Output:** Moderator decision; Moderator lesson; Review status.
- **Implementation Route:** Authenticated moderator page operations (moderator sign-in) display the held post and evidence from the events table and save the moderator's decision and any lesson to the events and lessons tables, with read-back before showing the decision as saved.
- **Integration approach:** Direct integration.
- **Role in this task:** Show the evidence and capture the moderator's decision. The tool supplies no decision, cannot approve or reject on its own, cannot publish directly (an Approve is handed to T5), sends no email or outside message, and cannot change event facts.
- **Task timeout:** Human response deadline: 24 hours after the post is held. This is a review target, not an automatic approval. Each supporting display or save operation has a 5-second limit; no automated run waits for the moderator.
- **Maximum retries:** Not applicable — manual task.
- **Retry only when:** Not applicable — manual task.
- **On timeout, exhausted retries, or an error that cannot be retried:** When the 24-hour deadline passes, mark the post overdue, keep it held and unpublished, and move it to the lead moderator (the Club Event Radar administrator) for decision; a missed deadline is never approval. If saving a decision fails or its outcome is uncertain, read back the post before saving again so an Approve is not sent to T5 twice; if it still cannot be confirmed, keep the post held, show the moderator the save failure, and do not publish.
