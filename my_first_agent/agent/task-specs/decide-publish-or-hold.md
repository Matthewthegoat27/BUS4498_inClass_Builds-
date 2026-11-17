# Decide Publish or Hold Task Specification

> This task is Level 1 because it applies one fixed, written decision rule to T3's rule-check result. It uses no model and makes no judgment call; every case the rule does not clearly allow to publish is held for a moderator.

## Basic Information

- **Task ID:** T4
- **Task name:** Decide Publish or Hold
- **Task type:** Decide
- **Task owner:** Club Event Radar Agent; the club moderator owns the decision rule and decides every held post.
- **Automation level (proposed):** L1.

## 1. Task Description

Apply the workflow's fixed decision rule to one completed rule-check result. Decide publish only when all of the following are true: every posting rule is pass (none fail or undetermined), the club is matched to one official club, the place is matched to one campus place, no earlier post conflicts, and no enabled moderator lesson requires review. Every other case is held, with a plain-language reason that names the first failing condition and its evidence (for example, Held: the place Bldg 3 lounge is not a recognized campus place).

When T3 found that this card updates the club's earlier post for the same event, mark the decision as a replacement of that post ID so T5 replaces it instead of adding a second post. This task does not publish, change event facts, or write rules; it only produces a decision record. The workflow needs it so the publish choice is consistent, explainable, and never made by a model. A held decision is a completed, visible outcome, not a failure.

## 2. Inputs

### Input 1

- **Input name:** Rule-check result
- **Contents and format:** T3's complete outbound deliverable: Status, run ID and post ID, rule-by-rule result (pass, fail, or undetermined), club match and place match, earlier-post comparison (none, update of a post ID, duplicate, or conflict), applicable lessons, Evidence summary, Unresolved issues, and Handoff note.
- **Source:** T3: Check Posting Rules.

### Input 2

- **Input name:** Event card
- **Contents and format:** The checked event card for the same post ID (club, title, date, start and end time, place, description, contact, with stated-or-missing flags).
- **Source:** T2: Extract Event Card (saved in the events table).

- **If a required input is missing or invalid:** A rule-check result with Status escalated, any undetermined rule, or a missing club or place match is never treated as a pass; decide hold and send it to H2: Moderator Reviews Held Post. A mismatched or missing run ID or post ID between the two inputs is an operational error: make no decision, mark the run incomplete, and show it in the moderator queue for H2.

## 3. Outputs

### Output 1

- **Output name:** Publish decision
- **Contents and format:** Run ID, post ID, decision publish, the checked event card, the rule-check evidence reference, and replacement post ID when this card updates an earlier post (otherwise none).
- **Next task or recipient:** T5: Publish Event Post.
- **Complete when:** Every condition of the decision rule is met, the decision is saved on the post, and the card passed to T5 is identical to the card T3 checked.

### Output 2

- **Output name:** Held post
- **Contents and format:** Run ID, post ID, decision hold, a plain-language hold reason naming the failing condition, the full rule-check result and evidence, the event card, and whether the cause was a rule outcome or a technical failure in T3.
- **Next task or recipient:** H2: Moderator Reviews Held Post; the officer sees the hold reason on their post.
- **Complete when:** The hold status and reason are saved and confirmed by read-back, and the reason is visible to the officer.

## 4. Planned Tools

### Tool 1

- **Tool name:** decide_publish_or_hold
- **Input:** Rule-check result; Event card.
- **Output:** Publish decision; Held post.
- **Implementation Route:** Functions/scripts that evaluate the fixed decision rule on the structured fields, followed by a database write of the decision and hold reason to the post in the events table and a read-back.
- **Integration approach:** Direct integration.
- **Role in this task:** Apply the written rule and record the decision. The tool cannot change the event card, publish a post, approve a held post, use a lesson as a reason to publish, or contact anyone.
- **Task timeout:** 5 seconds total for the rule evaluation, the save, and the read-back.
- **Maximum retries:** 0.
- **Retry only when:** Not applicable. If the save outcome is uncertain, read back the post status first; the decision is keyed by post ID and run ID, so a later save overwrites the same record and cannot create a duplicate.
- **On timeout, exhausted retries, or an error that cannot be retried:** Do not send anything to T5. Mark the run incomplete because of an operational error, keep the post unpublished, and show it in the moderator queue for H2: Moderator Reviews Held Post with the failure category. A failed decision step is never treated as publish.
