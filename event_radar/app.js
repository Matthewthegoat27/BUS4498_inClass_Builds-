(function () {
  "use strict";

  const config = window.EVENT_RADAR_CONFIG || {};
  const hasSupabaseLibrary = Boolean(window.supabase && window.supabase.createClient);
  const supabaseClient = hasSupabaseLibrary && config.supabaseUrl && config.publishableKey
    ? window.supabase.createClient(config.supabaseUrl, config.publishableKey)
    : null;

  const board = document.getElementById("event-board");
  const boardStatus = document.getElementById("board-status");
  const form = document.getElementById("event-form");
  const submitButton = document.getElementById("submit-button");
  const resultBox = document.getElementById("post-result");
  const allFilterButtons = Array.from(document.querySelectorAll(".chip[data-filter]"));
  const moderatorPanel = document.getElementById("moderator-panel");
  const moderatorSignInForm = document.getElementById("moderator-signin-form");
  const moderatorSignInButton = document.getElementById("moderator-signin-button");
  const moderatorSignOutButton = document.getElementById("moderator-signout-button");
  const moderatorSession = document.getElementById("moderator-session");
  const moderatorMessage = document.getElementById("moderator-message");
  const moderatorStatus = document.getElementById("moderator-status");
  const waitingBoard = document.getElementById("waiting-board");

  const eventColumns = "id, created_at, status, title, club, event_date, start_time, end_time, place_name, place_detail, cost, free_food, summary, flyer_url";
  let events = [];
  let activeFilter = "all";
  let moderatorUser = null;
  let activeModeratorId = null;

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = String(text);
    return element;
  }

  function formatDateParts(dateText) {
    if (!dateText || !/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return null;
    const [year, month, day] = dateText.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return {
      date,
      month: new Intl.DateTimeFormat("en-US", { month: "short" }).format(date),
      day: String(day),
      weekday: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date),
    };
  }

  function formatTime(timeText) {
    if (!timeText) return "";
    const match = /^(\d{1,2}):(\d{2})/.exec(timeText);
    if (!match) return "";
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return "";
    const suffix = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
  }

  function eventWhen(event, dateParts) {
    const dateLabel = dateParts
      ? `${dateParts.weekday}, ${dateParts.month} ${dateParts.day}`
      : "Date to be announced";
    const start = formatTime(event.start_time);
    const end = formatTime(event.end_time);
    if (start && end) return `${dateLabel} · ${start} to ${end}`;
    if (start) return `${dateLabel} · ${start}`;
    return dateLabel;
  }

  function allowedFlyerUrl(value) {
    if (typeof value !== "string" || !value.trim() || !config.supabaseUrl) return null;
    try {
      const projectUrl = new URL(config.supabaseUrl);
      const flyerUrl = new URL(value);
      if (flyerUrl.origin !== projectUrl.origin) return null;
      if (!flyerUrl.pathname.startsWith("/storage/v1/object/public/flyers/")) return null;
      return flyerUrl.href;
    } catch {
      return null;
    }
  }

  function renderEvent(event) {
    const item = makeElement("li", "event");
    const dateParts = formatDateParts(event.event_date);
    const dateBox = makeElement("div", dateParts ? "date" : "date tba");
    if (dateParts) {
      dateBox.append(
        makeElement("span", "mon", dateParts.month),
        makeElement("span", "day", dateParts.day),
      );
    } else {
      dateBox.append(makeElement("span", "day", "TBA"));
    }

    const body = makeElement("div", "event-body");
    body.append(makeElement("p", "when", eventWhen(event, dateParts)));
    body.append(makeElement("h3", "", event.title || "Club event"));

    const metaParts = [event.club, event.place_name, event.place_detail].filter((value) => typeof value === "string" && value.trim());
    if (metaParts.length) body.append(makeElement("p", "meta", metaParts.join(" · ")));
    if (event.summary) body.append(makeElement("p", "summary", event.summary));

    const tags = makeElement("p", "tags");
    if (typeof event.cost === "string" && event.cost.trim()) {
      tags.append(makeElement("span", "tag", event.cost.trim()));
    }
    if (event.free_food) tags.append(makeElement("span", "tag food", "🍕 Free food"));
    if (tags.childElementCount) body.append(tags);

    item.append(dateBox, body);
    const flyerUrl = allowedFlyerUrl(event.flyer_url);
    if (flyerUrl) {
      const flyer = makeElement("img", "flyer");
      flyer.src = flyerUrl;
      flyer.alt = `Flyer for ${event.title || "club event"}`;
      flyer.loading = "lazy";
      item.append(flyer);
    }
    return item;
  }

  function renderEvents() {
    board.replaceChildren();
    const visibleEvents = activeFilter === "food"
      ? events.filter((event) => event.free_food === true)
      : events;

    if (!visibleEvents.length) {
      const message = events.length && activeFilter === "food"
        ? "No upcoming events are tagged with free food."
        : "No events yet. Post the first one!";
      board.append(makeElement("li", "empty", message));
      return;
    }

    visibleEvents.forEach((event) => board.append(renderEvent(event)));
  }

  async function loadEvents() {
    if (!supabaseClient) {
      boardStatus.textContent = "The event board could not connect. Check that the Supabase library and config.js are available.";
      events = [];
      renderEvents();
      return;
    }

    boardStatus.textContent = "Loading events…";
    const { data, error } = await supabaseClient
      .from("events")
      .select(eventColumns)
      .eq("status", "published")
      .order("event_date", { ascending: true, nullsFirst: false })
      .order("start_time", { ascending: true });

    if (error) {
      boardStatus.textContent = "Events couldn’t be loaded. Check the database setup and try Refresh.";
      events = [];
      renderEvents();
      return;
    }

    events = Array.isArray(data) ? data : [];
    boardStatus.textContent = events.length
      ? `${events.length} upcoming ${events.length === 1 ? "event" : "events"}`
      : "The board is ready for its first event.";
    renderEvents();
  }

  function renderReviewEvent(event) {
    const item = renderEvent(event);
    const body = item.querySelector(".event-body");
    if (!body) return item;

    const review = makeElement("div", "review");
    review.append(makeElement("p", "why", `Why it’s waiting: ${event.status_reason || "A moderator needs to review this post."}`));
    review.append(makeElement("p", "original", `Original post: ${event.announcement || ""}`));

    const actions = makeElement("p", "actions");
    const approveButton = makeElement("button", "", "Approve");
    approveButton.type = "button";
    approveButton.addEventListener("click", () => reviewEvent(event, "published", approveButton));
    const rejectButton = makeElement("button", "ghost", "Reject");
    rejectButton.type = "button";
    rejectButton.addEventListener("click", () => reviewEvent(event, "rejected", rejectButton));
    actions.append(approveButton, rejectButton);
    review.append(actions);
    body.append(review);
    return item;
  }

  async function loadWaitingPosts() {
    if (!supabaseClient || !moderatorUser) return;
    moderatorStatus.textContent = "Loading posts for review…";
    try {
      const { data, error } = await supabaseClient
        .from("events")
        .select("id, created_at, status, status_reason, announcement, title, club, event_date, start_time, end_time, place_name, place_detail, cost, free_food, summary, flyer_url")
        .eq("status", "waiting")
        .order("created_at", { ascending: true });

      if (error) {
        moderatorStatus.textContent = "Waiting posts couldn’t be loaded. Check the database permissions and try again.";
        waitingBoard.replaceChildren();
        return;
      }

      waitingBoard.replaceChildren();
      const waitingPosts = Array.isArray(data) ? data : [];
      if (!waitingPosts.length) {
        waitingBoard.append(makeElement("li", "empty", "No posts are waiting for review."));
        moderatorStatus.textContent = "The review list is up to date.";
        return;
      }

      waitingPosts.forEach((post) => waitingBoard.append(renderReviewEvent(post)));
      moderatorStatus.textContent = `${waitingPosts.length} ${waitingPosts.length === 1 ? "post is" : "posts are"} waiting for review.`;
    } catch {
      moderatorStatus.textContent = "Waiting posts couldn’t be loaded. Check your connection and try again.";
      waitingBoard.replaceChildren();
    }
  }

  function syncModeratorUser(user) {
    moderatorUser = user || null;
    const signedIn = Boolean(moderatorUser);
    moderatorSignInForm.hidden = signedIn;
    moderatorSession.hidden = !signedIn;

    if (!signedIn) {
      activeModeratorId = null;
      waitingBoard.replaceChildren();
      moderatorStatus.textContent = "";
      moderatorMessage.textContent = "Sign in to review waiting posts.";
      return;
    }

    moderatorMessage.textContent = `Signed in as ${moderatorUser.email || "moderator"}.`;
    moderatorPanel.open = true;
    if (activeModeratorId !== moderatorUser.id) {
      activeModeratorId = moderatorUser.id;
      loadWaitingPosts();
    }
  }

  async function reviewEvent(event, nextStatus, button) {
    if (!supabaseClient || !moderatorUser) return;
    button.disabled = true;
    moderatorStatus.textContent = nextStatus === "published" ? "Approving post…" : "Rejecting post…";

    try {
      const { data, error } = await supabaseClient
        .from("events")
        .update({
          status: nextStatus,
          status_reason: nextStatus === "published" ? "" : "Rejected by moderator.",
          reviewed_at: new Date().toISOString(),
          reviewed_by: moderatorUser.id,
        })
        .eq("id", event.id)
        .eq("status", "waiting")
        .select("id")
        .maybeSingle();

      if (error) {
        moderatorStatus.textContent = "That post couldn’t be updated. Check the database permissions and try again.";
        return;
      }
      if (!data) {
        moderatorStatus.textContent = "That post was already reviewed. Refresh the list to see the latest posts.";
        await loadWaitingPosts();
        return;
      }

      await loadWaitingPosts();
      if (nextStatus === "published") await loadEvents();
    } catch {
      moderatorStatus.textContent = "That post couldn’t be updated. Check your connection and try again.";
    } finally {
      if (button.isConnected) button.disabled = false;
    }
  }

  function showResult(status, message, reasons) {
    const allowedStatuses = ["published", "waiting", "rejected", "duplicate"];
    const resultStatus = allowedStatuses.includes(status) ? status : "error";
    const labels = {
      published: "Published",
      waiting: "Waiting for review",
      rejected: "Not posted",
      duplicate: "Already posted",
      error: "Something went wrong",
    };

    resultBox.className = `result ${resultStatus}`;
    resultBox.replaceChildren(makeElement("p", "result-label", labels[resultStatus]));
    if (message) resultBox.append(makeElement("p", "", message));

    if (Array.isArray(reasons) && reasons.length) {
      const list = makeElement("ul", "reasons");
      reasons.forEach((reason) => {
        if (typeof reason === "string" && reason.trim()) list.append(makeElement("li", "", reason));
      });
      if (list.childElementCount) resultBox.append(list);
    }
    resultBox.hidden = false;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!config.supabaseUrl || !config.publishableKey) {
      showResult("error", "Supabase isn’t configured yet. Check event_radar/config.js.");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Checking…";
    resultBox.hidden = true;

    try {
      const response = await fetch(`${config.supabaseUrl}/functions/v1/submit-event`, {
        method: "POST",
        headers: { apikey: config.publishableKey },
        body: new FormData(form),
      });
      let result;
      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok || !result || result.ok !== true) {
        showResult("error", result && result.message ? result.message : "The event agent couldn’t process this post. Please try again.");
        return;
      }

      showResult(result.status, result.message, result.reasons);
      form.reset();
      if (result.status === "published") await loadEvents();
      if (result.status === "waiting" && moderatorUser) await loadWaitingPosts();
    } catch {
      showResult("error", "The event agent couldn’t be reached. Check your connection and try again.");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Check and post";
    }
  });

  document.getElementById("refresh-button").addEventListener("click", loadEvents);
  allFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter === "food" ? "food" : "all";
      allFilterButtons.forEach((filterButton) => {
        filterButton.setAttribute("aria-pressed", String(filterButton === button));
      });
      renderEvents();
    });
  });

  moderatorSignInForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!supabaseClient) {
      moderatorMessage.textContent = "Supabase isn’t configured. Check event_radar/config.js.";
      return;
    }

    moderatorSignInButton.disabled = true;
    moderatorSignInButton.textContent = "Signing in…";
    moderatorMessage.textContent = "Checking your sign-in…";
    try {
      const email = document.getElementById("moderator-email").value.trim();
      const password = document.getElementById("moderator-password").value;
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        moderatorMessage.textContent = "Sign-in failed. Check the email and password, then try again.";
        return;
      }
      moderatorSignInForm.reset();
      syncModeratorUser(data.user);
    } catch {
      moderatorMessage.textContent = "Sign-in failed. Check your connection and try again.";
    } finally {
      moderatorSignInButton.disabled = false;
      moderatorSignInButton.textContent = "Sign in";
    }
  });

  moderatorSignOutButton.addEventListener("click", async () => {
    if (!supabaseClient) return;
    moderatorSignOutButton.disabled = true;
    const { error } = await supabaseClient.auth.signOut();
    moderatorSignOutButton.disabled = false;
    if (error) {
      moderatorMessage.textContent = "Sign-out failed. Try again.";
      return;
    }
    syncModeratorUser(null);
  });

  if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => syncModeratorUser(session?.user || null));
    });
    supabaseClient.auth.getSession().then(({ data, error }) => {
      if (error) {
        moderatorMessage.textContent = "Your sign-in status couldn’t be checked. Try refreshing the page.";
        return;
      }
      syncModeratorUser(data.session?.user || null);
    }).catch(() => {
      moderatorMessage.textContent = "Your sign-in status couldn’t be checked. Try refreshing the page.";
    });
  }

  loadEvents();
})();
