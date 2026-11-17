# About the Agentic System

**Club Event Radar Agent**

> **Problem to be solved**: Student club officers announce events in long, informal messages that often leave out the date, time, place, or contact, use a club nickname, or break the campus posting rules. Moderators read each announcement by hand, so posts wait in a queue, mistakes are found late, and an officer may not learn why a post was held. For this course build, use the following assumed baseline: about one in five submitted announcements receives a rules-checked event card and a visible decision (published, or held with a reason) within 15 minutes. The club community needs a bounded, evidence-based workflow that turns an announcement into an event card, checks it against the posting rules and the club's earlier posts, and either publishes it or holds it for a moderator, without letting the agent invent event details or override a moderator.

### System Designer Name

Matthew Estrada

### System Name

Club Event Radar Agent

### System Goal

**For** a student club officer who pastes an event announcement into the Club Event Radar page, **improve** the speed and reliability of getting a correct event post, **measured by** the share of submitted announcements that receive a rules-checked event card and a visible decision (published, or held with a plain-language reason) within 15 minutes **moving from** an assumed baseline of 20% **to** a target of 80%, **without** inventing or guessing event facts, publishing any post that fails a posting rule or has an unresolved club or place, letting a moderator lesson publish a post, overriding a moderator's decision, or contacting anyone outside the Club Event Radar page. A successful run may hold a post or ask the officer a question; a held post still counts as decided when its reason is visible. Records that fail to save, or whose decision cannot be read back, do not count.

### Who Is Better Off When This Works?

The club officer is better off because they see an event card and a clear decision within minutes, and when a post is held they learn exactly which fact or rule needs attention. The moderator is better off because they review only the held posts, each with the agent's evidence and a reason, instead of reading every announcement. Students browsing events are better off because published posts have a date, time, place, and an official club name. Moderators keep final authority: the agent can publish only a post that passes every rule, and it can never publish a post a moderator lesson says should wait. All club records, posts, and moderator lessons stay in the project's database; no API key or secret is stored in this repository.
