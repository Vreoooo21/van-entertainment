import { supabase } from "./supabase.js";
import { escapeHtml } from "./utils.js";

const $ = (id) => document.getElementById(id);

const state = {
    messages: [],
    replyTo: null,
    activeTab: "community",
    loading: false,
    timer: null
};

function getClientId() {
    const storageKey = "van_voice_client_id";
    let value = localStorage.getItem(storageKey);

    if (!value) {
        value = globalThis.crypto?.randomUUID?.()
            || `van-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
        localStorage.setItem(storageKey, value);
    }

    return value;
}

const clientId = getClientId();

function setResult(element, text = "", type = "") {
    if (!element) return;
    element.className = "form-result";
    if (type) element.classList.add(type);
    element.textContent = text;
}

function setButtonBusy(button, busy, busyText, normalText) {
    if (!button) return;
    button.disabled = busy;
    button.textContent = busy ? busyText : normalText;
}

function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("en", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}

function dayKey(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDay(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (dayKey(date) === dayKey(today)) return "Today";
    if (dayKey(date) === dayKey(yesterday)) return "Yesterday";

    return new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "long",
        year: "numeric"
    }).format(date);
}

function initials(name = "V") {
    const clean = String(name).trim();
    if (!clean) return "V";

    return clean
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase();
}

function filteredMessages() {
    const target = $("chatTargetFilter")?.value || "";
    const category = $("chatCategoryFilter")?.value || "";

    return state.messages.filter((item) => {
        const targetMatches = !target || item.target_type === target;
        const categoryMatches = !category || item.category === category;
        return targetMatches && categoryMatches;
    });
}

function renderMessages({ preserveScroll = false } = {}) {
    const list = $("publicVoiceList");
    if (!list) return;

    const oldDistanceFromBottom = list.scrollHeight - list.scrollTop - list.clientHeight;
    const items = filteredMessages();

    if (!items.length) {
        list.innerHTML = `
            <div class="voice-empty">
                <p>No community messages match this filter yet.</p>
            </div>
        `;
        return;
    }

    let currentDay = "";
    const html = [];

    for (const item of items) {
        const itemDay = dayKey(item.created_at);
        if (itemDay !== currentDay) {
            currentDay = itemDay;
            html.push(`<div class="voice-day-separator"><span>${escapeHtml(formatDay(item.created_at))}</span></div>`);
        }

        const target = item.target_name || item.target_type;
        const repliedBlock = item.reply_to_id && item.reply_to_message
            ? `
                <div class="voice-replied-message">
                    <strong>${escapeHtml(item.reply_to_name || "Community member")}</strong>
                    <span>${escapeHtml(item.reply_to_message)}</span>
                </div>
            `
            : "";

        const officialBlock = item.official_response
            ? `
                <div class="voice-official-response">
                    <strong>VAN Official</strong>
                    <p>${escapeHtml(item.official_response)}</p>
                </div>
            `
            : "";

        html.push(`
            <article class="voice-message-row" data-message-id="${escapeHtml(item.id)}">
                <div class="voice-avatar" aria-hidden="true">${escapeHtml(initials(item.display_name))}</div>
                <div class="voice-message-content">
                    <div class="voice-message-heading">
                        <strong>${escapeHtml(item.display_name || "VAN Community Member")}</strong>
                        <span class="voice-message-target">to ${escapeHtml(target)}</span>
                        <time datetime="${escapeHtml(item.created_at)}">${escapeHtml(formatDateTime(item.created_at))}</time>
                    </div>

                    <div class="voice-bubble">
                        ${repliedBlock}
                        <div class="voice-message-meta">
                            <span class="voice-chip">${escapeHtml(item.category)}</span>
                            ${item.visibility === "Anonymous" ? '<span class="voice-chip">Anonymous</span>' : ""}
                        </div>
                        <p>${escapeHtml(item.message)}</p>
                        ${officialBlock}
                    </div>

                    <div class="voice-message-actions">
                        <button type="button" data-reply-message="${escapeHtml(item.id)}">Reply</button>
                        <button type="button" data-report-message="${escapeHtml(item.id)}">Report</button>
                    </div>
                </div>
            </article>
        `);
    }

    list.innerHTML = html.join("");

    if (preserveScroll && oldDistanceFromBottom > 120) {
        list.scrollTop = list.scrollHeight - list.clientHeight - oldDistanceFromBottom;
    } else {
        list.scrollTop = list.scrollHeight;
    }
}

async function loadMessages({ preserveScroll = false, silent = false } = {}) {
    if (state.loading) return;
    state.loading = true;

    const list = $("publicVoiceList");
    if (!silent && list && !state.messages.length) {
        list.innerHTML = '<p class="voice-loading">Loading community messages...</p>';
    }

    const { data, error } = await supabase
        .from("public_feedback_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(150);

    state.loading = false;

    if (error) {
        console.error("VAN Voice load error:", error);
        if (list) {
            list.innerHTML = `<div class="voice-error-state"><p>${escapeHtml(error.message)}</p></div>`;
        }
        return;
    }

    state.messages = (data || []).reverse();
    renderMessages({ preserveScroll });
}

function switchTab(tabName) {
    state.activeTab = tabName;

    document.querySelectorAll("[data-voice-tab]").forEach((button) => {
        const isActive = button.dataset.voiceTab === tabName;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-selected", String(isActive));
    });

    const panelMap = {
        community: $("communityPanel"),
        private: $("privatePanel"),
        tracking: $("trackingPanel")
    };

    Object.entries(panelMap).forEach(([name, panel]) => {
        if (!panel) return;
        const isActive = name === tabName;
        panel.hidden = !isActive;
        panel.classList.toggle("active", isActive);
    });

    if (tabName === "community") {
        loadMessages({ preserveScroll: true, silent: true });
    }
}

document.querySelectorAll("[data-voice-tab]").forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.voiceTab));
});

function clearReply() {
    state.replyTo = null;
    $("voiceReplyPreview").hidden = true;
    $("voiceReplyName").textContent = "";
    $("voiceReplyText").textContent = "";
}

function beginReply(messageId) {
    const message = state.messages.find((item) => item.id === messageId);
    if (!message) return;

    state.replyTo = message;
    $("voiceReplyName").textContent = message.display_name || "VAN Community Member";
    $("voiceReplyText").textContent = message.message;
    $("voiceReplyPreview").hidden = false;
    $("chatMessage").focus();
}

$("cancelVoiceReply")?.addEventListener("click", clearReply);

$("publicVoiceList")?.addEventListener("click", async (event) => {
    const replyButton = event.target.closest("[data-reply-message]");
    if (replyButton) {
        beginReply(replyButton.dataset.replyMessage);
        return;
    }

    const reportButton = event.target.closest("[data-report-message]");
    if (!reportButton) return;

    const reason = globalThis.prompt(
        "Why are you reporting this message? Examples: spam, harassment, personal information, or inappropriate content."
    );

    if (reason === null) return;

    reportButton.disabled = true;
    reportButton.textContent = "Reporting...";

    const { data, error } = await supabase.rpc("report_van_feedback", {
        p_message_id: reportButton.dataset.reportMessage,
        p_reason: reason,
        p_client_id: clientId
    });

    reportButton.disabled = false;
    reportButton.textContent = "Report";

    if (error) {
        globalThis.alert(error.message);
        return;
    }

    const result = data?.[0];
    globalThis.alert(result?.hidden
        ? "Thank you. This message has been hidden for moderator review."
        : "Thank you. Your report has been sent to VAN moderators."
    );

    await loadMessages({ preserveScroll: true, silent: true });
});

$("chatTargetFilter")?.addEventListener("change", () => renderMessages({ preserveScroll: true }));
$("chatCategoryFilter")?.addEventListener("change", () => renderMessages({ preserveScroll: true }));
$("refreshVoiceButton")?.addEventListener("click", () => loadMessages({ preserveScroll: true }));

$("chatAnonymous")?.addEventListener("change", (event) => {
    const nameInput = $("chatName");
    nameInput.disabled = event.target.checked;
    if (event.target.checked) nameInput.value = "";
});

$("communityVoiceForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if ($("chatWebsite").value) return;

    const button = $("chatSubmitButton");
    const result = $("chatResult");
    setResult(result);
    setButtonBusy(button, true, "Sending...", "Send Message");

    const anonymous = $("chatAnonymous").checked;
    const payload = {
        sender_name: anonymous ? "" : $("chatName").value,
        sender_email: "",
        sender_whatsapp: "",
        target_type: $("chatTarget").value,
        target_name: $("chatTargetName").value,
        category: $("chatCategory").value,
        visibility: anonymous ? "Anonymous" : "Public",
        priority: "Normal",
        title: "Community Message",
        message: $("chatMessage").value,
        reply_to_id: state.replyTo?.id || "",
        client_id: clientId
    };

    const { error } = await supabase.rpc("submit_van_feedback", { payload });

    setButtonBusy(button, false, "Sending...", "Send Message");

    if (error) {
        setResult(result, error.message, "error");
        return;
    }

    $("chatMessage").value = "";
    $("chatTargetName").value = "";
    clearReply();
    setResult(result, "Message sent to VAN Voice.", "success");

    await loadMessages({ preserveScroll: false, silent: true });

    window.setTimeout(() => setResult(result), 3500);
});

$("privateVoiceForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if ($("privateWebsite").value) return;

    const button = $("privateSubmitButton");
    const result = $("privateResult");
    setResult(result);
    setButtonBusy(button, true, "Sending...", "Send Private Report");

    const payload = {
        sender_name: $("privateName").value,
        sender_email: $("privateEmail").value,
        sender_whatsapp: $("privateWhatsapp").value,
        target_type: $("privateTarget").value,
        target_name: $("privateTargetName").value,
        category: $("privateCategory").value,
        visibility: "Private",
        priority: $("privatePriority").value,
        title: $("privateTitle").value,
        message: $("privateMessage").value,
        reply_to_id: "",
        client_id: clientId
    };

    const { data, error } = await supabase.rpc("submit_van_feedback", { payload });

    setButtonBusy(button, false, "Sending...", "Send Private Report");

    if (error) {
        setResult(result, error.message, "error");
        return;
    }

    const ticket = data?.[0];
    result.className = "form-result success";
    result.innerHTML = `
        Private report received. Save ticket code
        <strong>${escapeHtml(ticket?.ticket_code || "")}</strong>
        and PIN <strong>${escapeHtml(ticket?.access_pin || "")}</strong>.
    `;

    event.currentTarget.reset();
});

$("trackVoiceForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const result = $("trackVoiceResult");
    result.innerHTML = '<p class="voice-loading">Checking report...</p>';

    const { data, error } = await supabase.rpc("track_van_feedback", {
        p_ticket_code: $("trackTicketCode").value,
        p_access_pin: $("trackTicketPin").value
    });

    if (error || !data?.length) {
        result.innerHTML = '<p class="form-result error">Ticket code or PIN was not found.</p>';
        return;
    }

    const item = data[0];
    result.innerHTML = `
        <article class="voice-track-result">
            <div class="voice-track-badges">
                <span>${escapeHtml(item.status)}</span>
                <span>${escapeHtml(item.category)}</span>
                <span>${escapeHtml(item.target_name || item.target_type)}</span>
            </div>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.message)}</p>
            <hr>
            <strong>VAN Official Response</strong>
            ${item.official_response
                ? `<p>${escapeHtml(item.official_response)}</p>`
                : "<p><em>No official response yet.</em></p>"
            }
        </article>
    `;
});

await loadMessages();

state.timer = window.setInterval(() => {
    if (state.activeTab === "community" && !document.hidden) {
        loadMessages({ preserveScroll: true, silent: true });
    }
}, 8000);

window.addEventListener("beforeunload", () => {
    if (state.timer) window.clearInterval(state.timer);
});
