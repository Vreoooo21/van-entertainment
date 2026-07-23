import { supabase } from "./supabase.js";
import { fallbackImage, formatDate } from "./utils.js";

const loading = document.getElementById("newsLoading");
const content = document.getElementById("newsDetailContent");
const errorBox = document.getElementById("newsDetailError");

function showError() {
    loading.hidden = true;
    content.hidden = true;
    errorBox.hidden = false;
}

async function loadNewsDetail() {
    const slug = new URLSearchParams(window.location.search).get("slug")?.trim().toLowerCase();

    if (!slug) {
        window.location.replace("news.html");
        return;
    }

    const { data: item, error } = await supabase
        .from("news")
        .select("title,summary,content,publish_date,cover_image,is_published")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

    if (error || !item) {
        if (error) console.error(error);
        showError();
        return;
    }

    document.title = `${item.title} | VAN ENTERTAINMENT`;
    document.getElementById("newsDetailImage").src = item.cover_image || fallbackImage();
    document.getElementById("newsDetailImage").alt = item.title;
    document.getElementById("newsDetailDate").textContent = formatDate(item.publish_date);
    document.getElementById("newsDetailTitle").textContent = item.title;
    document.getElementById("newsDetailSummary").textContent = item.summary || "";

    const body = document.getElementById("newsDetailBody");
    body.innerHTML = "";
    String(item.content || item.summary || "")
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .forEach((paragraph) => {
            const p = document.createElement("p");
            p.textContent = paragraph;
            body.appendChild(p);
        });

    loading.hidden = true;
    errorBox.hidden = true;
    content.hidden = false;
}

await loadNewsDetail();
