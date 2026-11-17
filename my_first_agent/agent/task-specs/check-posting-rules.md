# Check Posting Rules Task Specification

> This task is Level 3 because what the agent finds at each step decides what it examines next: a missing field, an unmatched club or place, a conflict with the club's earlier post, or a moderator lesson. Those choices are bounded, and every unresolved case goes to a human moderator.

```yaml
# BASIC INFORMATION
task_id: "T3"
task_name: "Check Posting Rules"
task_owner: "Club Event Radar Agent; the club moderator retains final decision authority"

# Agent Inference Configuration
Provider: Groq
Model: "llama-3.3-70b-versatile"
Role: Interpret the supplied event card and rules, select the next permitted subtask, and produce the evidence-backed rule-check result.
Maximum inference requests per task run: 5
On inference failure or exhausted limits: Record the unresolved status and hand the case to the club moderator.
```

## 1. Task Goal

- **Objective:** Produce an evidence-backed rule-check result for one event card: which posting rules pass, which fail, and which cannot be decided, with the exact evidence for each. Confirm that the club is the official club (a nickname becomes the official name, an unknown club is not guessed), that the place is a known campus place, and that the post does not conflict with the club's earlier post. Do not decide whether to publish; T4 makes that decision from this result.

## 2. Inbound Inputs

### Input 1

- **Input name:** Event card
- **What it contains:** Club as written, title, date, start and end time, place as written, description, contact, and a missing-or-stated flag for each field, plus run ID and post ID.
- **Source:** T2: Extract Event Card

### Input 2

- **Input name:** Club record and earlier posts
- **What it contains:** The official club list entry (official name, nicknames, status) and the club's earlier posts with their statuses. A valid empty history is expected for a new club post and is different from an unreadable record.
- **Source:** T1: Retrieve Announcement and Club Context

### Input 3

- **Input name:** Posting rules and campus places
- **What it contains:** The written posting rules (required fields, allowed dates and times, content limits) and the list of recognized campus places with their aliases.
- **Source:** T1: Retrieve Announcement and Club Context

### Input 4

- **Input name:** Moderator lessons
- **What it contains:** The enabled lessons moderators have written, each with an on/off switch. A lesson can make a post wait; it can never make a post publish.
- **Source:** T1: Retrieve Announcement and Club Context

## 3. Tool Permissions and Boundaries

*Name each planned tool and specify its permitted use. Use verb-object names, such as **`retrieve_records`**, usually matching the task or permitted subtask it supports. Tool name identifies the capability; tool type identifies the proposed implementation. No scripts or working integrations are required.*

### Task-Wide Limits

- **Total task timeout:** 60 seconds for one post's task run, including tool calls, retries, and inference. A tool call or retry does not restart this clock.
- **Maximum tool calls:** 8 calls across all tools during one task run; retries count toward this total. The subtask repetition limits in Section 4 also apply.

Tools may use only the supplied inputs for this post. They may not search the web, edit the event card, publish or hold a post, change club records, email anyone, or contact a moderator directly. The agent classifies evidence and prepares the Section 6 deliverable; T4 makes the publish-or-hold decision.

### Tool 1

- **Tool name:** `retrieve_rule_context`
- **Input:** Posting rules and campus places; Moderator lessons
- **Output:** Source-labeled rule and lesson excerpts, plus the matching campus place entries, for the Evidence summary; missing or stale items for Unresolved issues.
- **Implementation Route:** File operations and database queries (read-only) on the posting rules file, the campus places list, and the lessons table.
- **Integration approach:** Direct integration.
- **Role in this task:** Support Check Required Fields, Verify Club and Place, Apply Moderator Lessons, and Form Rule-Check Result by locating the relevant rules, places, and lessons.
- **Task timeout:** Subject to the same 60-second total task deadline. Each call may take at most 5 seconds or the remaining task time, whichever is shorter.
- **Maximum retries:** 1 additional attempt per invocation, subject to the task-wide call and time limits.
- **Retry only when:** A temporary read error prevents completion. Wait 2 seconds and retry only if enough time and call budget remain. Do not retry denied access or a confirmed missing rules file. The tool is read-only, so a retry creates no duplicate records or messages.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the failed read and the number of attempts in Unresolved issues. Set Status to "Escalated to the moderator" and Result to "undetermined." Do not treat an unreadable rule or lesson as a rule that passed.

### Tool 2

- **Tool name:** `lookup_club_record`
- **Input:** Event card; Club record and earlier posts
- **Output:** The matched official club name (or "no match"), the club's status, and any earlier post for the same club with its date, place, and status, for the Evidence summary; an ambiguous or missing match for Unresolved issues.
- **Implementation Route:** Database queries (read-only) on the clubs and events tables, limited to the club named in the event card.
- **Integration approach:** Direct integration.
- **Role in this task:** Support Verify Club and Place and Compare With Earlier Posts by matching the club and finding a conflicting or replaced earlier post.
- **Task timeout:** Subject to the same 60-second total task deadline. Each call may take at most 5 seconds or the remaining task time, whichever is shorter.
- **Maximum retries:** 1 additional attempt per invocation, subject to the task-wide call and time limits.
- **Retry only when:** A temporary database connection error occurs. Wait 2 seconds and retry only if time and call budget remain. Do not retry an empty result; "no match" and "no earlier post" are valid answers. The tool only reads, so a retry cannot create duplicate records.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the failed lookup in Unresolved issues, set Status to "Escalated to the moderator," and write "undetermined" for the club match. Do not assume a club exists or that no earlier post exists.

### Tool 3

- **Tool name:** `check_event_fields`
- **Input:** Event card; Posting rules and campus places
- **Output:** Field-by-field findings (present, missing, or invalid), a date-and-time check against the rules, and a place match or "unknown place," for the Evidence summary; ambiguous comparisons for Unresolved issues.
- **Implementation Route:** Functions/scripts that deterministically compare explicit values (required fields present, date in the allowed range, start before end, place in the campus places list).
- **Integration approach:** Direct integration.
- **Role in this task:** Support Check Required Fields and Verify Club and Place by checking explicit values against the posting rules.
- **Task timeout:** Subject to the same 60-second total task deadline. Each call may take at most 2 seconds or the remaining task time, whichever is shorter.
- **Maximum retries:** 0.
- **Retry only when:** Not applicable. A later check on a changed event card is a new invocation, not a retry, and stays within Section 4's repetition limits and the task-wide budgets.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the failed check in Unresolved issues, set Status to "Escalated to the moderator," and write "undetermined" for the affected rule. Do not interpret a processing error as a rule violation or a pass. The tool is read-only and creates no records or messages, so no duplicate action is possible.

## 4. How the Agent Should Reason

### Permitted Subtask 1

- **Subtask name:** Check Required Fields
- **Subtask description:** Confirm that the club, title, date, start time, place, and contact are present and valid under the posting rules.
- **Subtask boundary:** Use only the event card and the posting rules. Do not infer a missing date, time, or place from other text or from earlier posts.
- **Retry limits:** Perform once with the current event card. Repeat once only if the event card changes.

### Permitted Subtask 2

- **Subtask name:** Verify Club and Place
- **Subtask description:** Match the written club name or nickname to one official club and the written place to one known campus place.
- **Subtask boundary:** Match only against the club list and campus places supplied. Never create a club or place, and never guess between two possible matches; report an ambiguous match as unresolved.
- **Retry limits:** Perform once. Repeat once only if a lookup returns new evidence.

### Permitted Subtask 3

- **Subtask name:** Compare With Earlier Posts
- **Subtask description:** Find whether the club already has a post for the same event, and whether this card updates, duplicates, or conflicts with it.
- **Subtask boundary:** Compare only with the supplied earlier posts for this club. An update replaces the earlier post only when T4 decides to publish; this task never edits a post.
- **Retry limits:** Perform once. Examine no more than two earlier posts that could conflict before handing the case to the moderator.

### Permitted Subtask 4

- **Subtask name:** Apply Moderator Lessons
- **Subtask description:** Check the event card against the enabled lessons and identify any lesson that requires the post to wait.
- **Subtask boundary:** A lesson may add a reason to hold a post; it may never be used as a reason to publish or to override a failed rule.
- **Retry limits:** Perform once with the enabled lessons.

### Permitted Subtask 5

- **Subtask name:** Form Rule-Check Result
- **Subtask description:** Combine the findings into a rule-by-rule result (pass, fail, or undetermined) with evidence, and name the single most important unresolved issue.
- **Subtask boundary:** Do not decide to publish or hold, change any event fact, invent a rule, or imply that a moderator approved the post.
- **Retry limits:** Revise once only if another permitted subtask produces new material evidence or exposes a conflict.

- **Decision guidance:** After each subtask, choose the permitted subtask most likely to resolve the most important remaining uncertainty. Do not follow a fixed sequence. If no permitted subtask can make useful progress, stop and hand the case to the moderator.

## 5. When to Stop or Hand Off to a Human

- **Stop successfully when:** Every posting rule has been classified as pass, fail, or undetermined with cited evidence, the club and place are matched or reported as unmatched, and any conflict with an earlier post or lesson is stated.
- **Hand off early when:** A rule file, club record, or lesson cannot be read; the club or place match is ambiguous; two earlier posts could conflict; a subtask limit or the time or call limit is reached; or judgment requires moderator authority. Record the exact question and stop; take no further action while awaiting review.
- **Hand off to:** The club moderator.

Stop at the first applicable limit or handoff condition.

## 6. Outbound Deliverable

- **Status:** Completed or escalated to the moderator. Include the run ID and post ID. On escalation, distinguish a missing human judgment from an operational error (inference failure, timeout, or tool failure) so T4 never treats a failed check as a pass.
- **Result or recommendation:** A rule-by-rule result (pass, fail, or undetermined) and the club and place match; not a publish-or-hold decision. Write "undetermined" when escalation prevented a supported result.
- **Evidence summary:** A table of each rule with its result, the exact rule reference, and the event card field or record that supports it, plus the club match, place match, earlier-post comparison, and any lesson that applies.
- **Subtasks performed:** The permitted subtasks completed, including any repeated check.
- **Unresolved issues:** Remaining ambiguous or missing evidence. Write "none" only when the task completed with no unresolved issue.
- **Handoff note:** The reason for stopping and the exact question the moderator must answer; write "Not applicable" for a completed task.
- **Next task or recipient:** Send a completed result to T4: Decide Publish or Hold. Send an escalated case to H2: Moderator Reviews Held Post, and keep the run operationally incomplete if the cause was a technical failure.
