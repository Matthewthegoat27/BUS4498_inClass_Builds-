import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const GROUPME_API = "https://api.groupme.com/v3";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_JLM_oHVAUugsOn--psADYw_IidXcNg8";
const MAX_MESSAGES = 20;
const MAX_THREAD_MESSAGES = 4;
const THREAD_WINDOW_MS = 10 * 60 * 1000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, apikey",
  "Access-Control-Max-Age": "86400",
};

type GroupMeMessage = {
  id?: string;
  created_at?: number;
  user_id?: string;
  sender_id?: string;
  sender_type?: string;
  system?: boolean;
  text?: string | null;
  name?: string;
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function secretKey(): string | undefined {
  const keysJson = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (keysJson) {
    try {
      const keys = JSON.parse(keysJson);
      if (typeof keys?.default === "string" && keys.default) return keys.default;
    } catch {
      // Use the legacy server-side key if the new-key map is invalid.
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || undefined;
}

function config() {
  return {
    token: Deno.env.get("GROUPME_TOKEN") || "",
    groupId: Deno.env.get("GROUPME_GROUP_ID") || "",
    botId: Deno.env.get("GROUPME_BOT_ID") || "",
    supabaseUrl: Deno.env.get("SUPABASE_URL") || "",
    supabaseKey: secretKey() || "",
  };
}

function database(url: string, key: string) {
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function groupmeHeaders(token: string): HeadersInit {
  return { "X-Access-Token": token, Accept: "application/json" };
}

async function groupmeGet(url: string, token: string): Promise<{ response: any; status: number }> {
  const result = await fetch(url, { headers: groupmeHeaders(token) });
  if (result.status === 304) return { response: null, status: 304 };
  const body = await result.json().catch(() => null);
  if (!result.ok) {
    const error = new Error(`GroupMe returned HTTP ${result.status}.`);
    (error as Error & { status?: number }).status = result.status;
    throw error;
  }
  return { response: body?.response ?? body, status: result.status };
}

async function postBotReply(botId: string, text: string): Promise<void> {
  const response = await fetch(`${GROUPME_API}/bots/post`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bot_id: botId, text: text.slice(0, 900) }),
  });
  if (!response.ok) {
    console.error("GroupMe could not post the event decision:", response.status);
  }
}

async function groupName(token: string, groupId: string): Promise<string> {
  try {
    const result = await groupmeGet(`${GROUPME_API}/groups/${encodeURIComponent(groupId)}`, token);
    const name = result.response?.name;
    return typeof name === "string" && name.trim() ? name.trim() : "GroupMe group";
  } catch {
    return "GroupMe group";
  }
}

async function checkGroupMe(token: string, groupId: string, botId: string) {
  if (!token || !groupId) {
    return jsonResponse({
      ok: true,
      ready: false,
      check: "groupme",
      token_ok: false,
      group_ok: false,
      bot_configured: Boolean(botId),
      message: "GROUPME_TOKEN and GROUPME_GROUP_ID must be set in Supabase Edge Function secrets.",
    });
  }
  let groupOk = false;
  let group = "";
  let status = 0;
  try {
    const result = await groupmeGet(`${GROUPME_API}/groups/${encodeURIComponent(groupId)}`, token);
    groupOk = Boolean(result.response && typeof result.response === "object");
    group = typeof result.response?.name === "string" ? result.response.name : "";
    status = result.status;
  } catch (error) {
    status = (error as Error & { status?: number }).status || 0;
  }
  let botOk: boolean | null = null;
  if (botId && groupOk) {
    try {
      const result = await groupmeGet(`${GROUPME_API}/bots`, token);
      const bots = Array.isArray(result.response) ? result.response : [];
      botOk = bots.some((bot: Record<string, unknown>) => bot.bot_id === botId && bot.group_id === groupId);
    } catch {
      botOk = false;
    }
  }
  const ready = groupOk && (!botId || botOk === true);
  return jsonResponse({
    ok: true,
    ready,
    check: "groupme",
    token_ok: groupOk,
    group_ok: groupOk,
    group_name: group || undefined,
    bot_configured: Boolean(botId),
    bot_ok: botOk,
    groupme_status: status,
    message: ready
      ? "The GroupMe token and group work."
      : groupOk
      ? "The GroupMe token and group work, but the configured bot could not be verified in that group."
      : "GroupMe could not access this group. Check the token and group ID in Supabase Secrets.",
  });
}

function skipped(message: GroupMeMessage): boolean {
  return message.sender_type === "bot" || message.system === true || typeof message.text !== "string" || !message.text.trim();
}

async function getThread(token: string, groupId: string, message: GroupMeMessage): Promise<string[]> {
  if (!message.id || !message.user_id || !message.created_at) return [];
  const url = new URL(`${GROUPME_API}/groups/${encodeURIComponent(groupId)}/messages`);
  url.searchParams.set("before_id", message.id);
  url.searchParams.set("limit", "20");
  try {
    const result = await groupmeGet(url.toString(), token);
    const cutoff = message.created_at - THREAD_WINDOW_MS / 1000;
    const previous = Array.isArray(result.response?.messages) ? result.response.messages as GroupMeMessage[] : [];
    return previous
      .filter((item) => !skipped(item) && String(item.user_id || "") === String(message.user_id) && Number(item.created_at) >= cutoff)
      .sort((a, b) => Number(a.created_at) - Number(b.created_at))
      .slice(-MAX_THREAD_MESSAGES)
      .map((item) => String(item.text).slice(0, 500));
  } catch (error) {
    console.error("Could not load earlier GroupMe messages:", error instanceof Error ? error.message : "unknown error");
    return [];
  }
}

function decisionText(result: Record<string, unknown>): string {
  const status = result.status;
  const event = result.event && typeof result.event === "object" ? result.event as Record<string, unknown> : {};
  const title = typeof event.title === "string" ? event.title.trim() : "";
  const date = typeof event.event_date === "string" ? event.event_date : "";
  const time = typeof event.start_time === "string" ? String(event.start_time).slice(0, 5) : "";
  const place = typeof event.place_name === "string" ? event.place_name : "";
  const details = [date, time, place].filter(Boolean).join(" · ");
  const headline = status === "published"
    ? "Event posted"
    : status === "waiting"
    ? "Event waiting for moderator review"
    : status === "rejected"
    ? "Not posted as an event"
    : status === "duplicate"
    ? "Already posted"
    : "Event check";
  const message = typeof result.message === "string" ? result.message : "The event agent returned a decision.";
  const reasons = Array.isArray(result.reasons)
    ? result.reasons.filter((item): item is string => typeof item === "string").slice(0, 3).join(" ")
    : "";
  return [headline, title, details, message, reasons].filter(Boolean).join(" — ");
}

async function updateCursor(db: ReturnType<typeof createClient>, lastId: string, readCount: number): Promise<void> {
  const { error } = await db.from("channel_cursor").upsert({
    source: "groupme",
    last_id: lastId,
    read_count: readCount,
    updated_at: new Date().toISOString(),
  }, { onConflict: "source" });
  if (error) throw new Error(`Could not save the GroupMe cursor: ${error.message}`);
}

async function handleGet(request: Request, settings: ReturnType<typeof config>): Promise<Response> {
  const url = new URL(request.url);
  if (url.searchParams.get("check") === "groupme") {
    return await checkGroupMe(settings.token, settings.groupId, settings.botId);
  }
  const configured = Boolean(settings.token && settings.groupId && settings.supabaseUrl && settings.supabaseKey);
  if (!configured) {
    return jsonResponse({
      ok: true,
      ready: false,
      last_message_id: "",
      read_count: 0,
      bot: Boolean(settings.botId),
      message: "GroupMe or Supabase secrets are missing from this function.",
    });
  }
  const db = database(settings.supabaseUrl, settings.supabaseKey);
  const { data, error } = await db.from("channel_cursor").select("last_id, read_count").eq("source", "groupme").maybeSingle();
  if (error) {
    console.error("Could not read the GroupMe cursor:", error.message);
    return jsonResponse({ ok: false, ready: false, message: "The GroupMe cursor could not be read." }, 500);
  }
  return jsonResponse({
    ok: true,
    ready: true,
    last_message_id: data?.last_id || "",
    read_count: data?.read_count || 0,
    bot: Boolean(settings.botId),
  });
}

async function handlePost(settings: ReturnType<typeof config>): Promise<Response> {
  if (!settings.token || !settings.groupId) {
    return jsonResponse({ ok: false, message: "GROUPME_TOKEN and GROUPME_GROUP_ID must be set in Supabase Edge Function secrets." }, 503);
  }
  if (!settings.supabaseUrl || !settings.supabaseKey) {
    return jsonResponse({ ok: false, message: "The Supabase database connection is missing its secret key." }, 503);
  }
  const db = database(settings.supabaseUrl, settings.supabaseKey);
  const { data: cursor, error: cursorError } = await db.from("channel_cursor")
    .select("last_id, read_count")
    .eq("source", "groupme")
    .maybeSingle();
  if (cursorError) {
    console.error("Could not read the GroupMe cursor:", cursorError.message);
    return jsonResponse({ ok: false, message: "The GroupMe cursor could not be read." }, 500);
  }

  const messagesUrl = new URL(`${GROUPME_API}/groups/${encodeURIComponent(settings.groupId)}/messages`);
  messagesUrl.searchParams.set("limit", String(MAX_MESSAGES));
  if (cursor?.last_id) messagesUrl.searchParams.set("after_id", cursor.last_id);
  let messages: GroupMeMessage[];
  try {
    const result = await groupmeGet(messagesUrl.toString(), settings.token);
    messages = Array.isArray(result.response?.messages) ? result.response.messages as GroupMeMessage[] : [];
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 502;
    console.error("Could not read GroupMe messages:", error instanceof Error ? error.message : "unknown error");
    return jsonResponse({ ok: false, message: "GroupMe messages could not be read." }, status === 304 ? 200 : 502);
  }

  if (!cursor || !cursor.last_id) {
    const newest = messages[0];
    const firstId = typeof newest?.id === "string" ? newest.id : "";
    await updateCursor(db, firstId, 0);
    return jsonResponse({ ok: true, initialized: true, last_message_id: firstId, read_count: 0, processed: 0 });
  }
  if (!messages.length) {
    return jsonResponse({ ok: true, last_message_id: cursor.last_id || "", read_count: cursor.read_count || 0, processed: 0 });
  }

  const channelName = await groupName(settings.token, settings.groupId);
  let lastId = cursor.last_id || "";
  let readCount = Number(cursor.read_count || 0);
  let processed = 0;

  for (const message of messages) {
    const messageId = typeof message.id === "string" ? message.id : "";
    if (!messageId) continue;
    if (!skipped(message)) {
      const thread = await getThread(settings.token, settings.groupId, message);
      let agentResult: Record<string, unknown> | null = null;
      try {
        const response = await fetch(`${settings.supabaseUrl}/functions/v1/submit-event`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: SUPABASE_PUBLISHABLE_KEY },
          body: JSON.stringify({
            announcement: message.text,
            source: "groupme",
            source_id: messageId,
            source_name: channelName,
            thread_name: typeof message.name === "string" ? message.name : "",
            thread: thread.map((text) => ({ text })),
            recentMessages: thread,
          }),
        });
        agentResult = await response.json().catch(() => null);
        if (!response.ok && !agentResult) agentResult = { ok: false, message: "The event agent could not check this message." };
      } catch (error) {
        console.error("Could not submit a GroupMe message to the event agent:", error instanceof Error ? error.message : "unknown error");
        agentResult = { ok: false, message: "The event agent could not be reached. Please try again later." };
      }
      if (agentResult && agentResult.already_read !== true && settings.botId) {
        await postBotReply(settings.botId, decisionText(agentResult));
      }
      processed++;
    }
    lastId = messageId;
    readCount++;
    try {
      await updateCursor(db, lastId, readCount);
    } catch (error) {
      console.error(error instanceof Error ? error.message : "Could not save the GroupMe cursor.");
      return jsonResponse({ ok: false, message: "The GroupMe cursor could not be saved." }, 500);
    }
  }

  return jsonResponse({ ok: true, last_message_id: lastId, read_count: readCount, processed });
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  const settings = config();
  if (request.method === "GET") return await handleGet(request, settings);
  if (request.method === "POST") return await handlePost(settings);
  return jsonResponse({ ok: false, message: "Use GET to check the reader or POST to read new GroupMe messages." }, 405);
});
