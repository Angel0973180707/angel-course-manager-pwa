/* Angel Course Manager PWA
   - Works with GAS exec URL
   - Supports: list (required), ping (optional)
   - CRUD requires upgraded Code.gs (included in package as CODEGS_UPGRADE.txt)
*/

const DEFAULTS = {
  api: "https://script.google.com/macros/s/AKfycbwUl82fzFmReE8PyOB9G6FJDT-B1MOCZufcLDJ6mvUXIfuFN2YsHpPLS5ZNi93LeHR0SA/exec",
  token: "angel",
  sheetNameHint: "幸福教養課程管理"
};

const els = {
  apiLabel: document.getElementById("apiLabel"),
  apiStatus: document.getElementById("apiStatus"),
  countLabel: document.getElementById("countLabel"),
  filterHint: document.getElementById("filterHint"),
  q: document.getElementById("q"),
  type: document.getElementById("type"),
  status: document.getElementById("status"),
  list: document.getElementById("list"),
  toast: document.getElementById("toast"),
  btnRefresh: document.getElementById("btnRefresh"),
  btnNew: document.getElementById("btnNew"),
  btnExport: document.getElementById("btnExport"),
  btnSettings: document.getElementById("btnSettings"),
  btnPing: document.getElementById("btnPing"),
  btnOpenSheet: document.getElementById("btnOpenSheet"),

  dlgDetail: document.getElementById("dlgDetail"),
  detailTitle: document.getElementById("detailTitle"),
  detailId: document.getElementById("detailId"),
  detailBody: document.getElementById("detailBody"),
  btnEdit: document.getElementById("btnEdit"),
  btnDelete: document.getElementById("btnDelete"),
  btnCloseDetail: document.getElementById("btnCloseDetail"),

  dlgForm: document.getElementById("dlgForm"),
  formTitle: document.getElementById("formTitle"),
  formIdHint: document.getElementById("formIdHint"),
  btnSave: document.getElementById("btnSave"),
  btnCancel: document.getElementById("btnCancel"),
  f_title: document.getElementById("f_title"),
  f_type: document.getElementById("f_type"),
  f_status: document.getElementById("f_status"),
  f_tags: document.getElementById("f_tags"),
  f_summary: document.getElementById("f_summary"),
  f_links: document.getElementById("f_links"),
  f_notes: document.getElementById("f_notes"),

  dlgSettings: document.getElementById("dlgSettings"),
  s_api: document.getElementById("s_api"),
  s_token: document.getElementById("s_token"),
  btnSaveSettings: document.getElementById("btnSaveSettings"),
  btnCloseSettings: document.getElementById("btnCloseSettings"),
};

let state = {
  api: "",
  token: "",
  items: [],
  headers: [],
  selected: null,
  editing: null,
};

function loadSettings() {
  const api = localStorage.getItem("acm_api") || DEFAULTS.api;
  const token = localStorage.getItem("acm_token") || DEFAULTS.token;
  state.api = api;
  state.token = token;
  els.apiLabel.textContent = api.replace(/^https?:\/\//, "");
}

function saveSettings(api, token) {
  localStorage.setItem("acm_api", api.trim());
  localStorage.setItem("acm_token", token.trim());
}

function toast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => els.toast.classList.remove("show"), 2200);
}

function statusText(ok, msg) {
  els.apiStatus.textContent = ok ? "OK" : "需要檢查";
  els.apiStatus.style.color = ok ? "var(--accent)" : "var(--warn)";
  if (msg) toast(msg);
}

async function apiGet(action, extra={}) {
  const url = new URL(state.api);
  url.searchParams.set("action", action);
  url.searchParams.set("token", state.token);
  Object.entries(extra).forEach(([k,v]) => {
    if (v !== undefined && v !== null && String(v).length) url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString(), { cache: "no-store" });
  return res.json();
}

async function apiPost(body) {
  const res = await fetch(state.api, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: state.token, ...body }),
  });
  return res.json();
}

function normalizeFromListResponse(json) {
  // Accept either:
  // 1) {ok:true, items:[...] }  (upgraded API)
  // 2) {ok:true, data:[[headers...],[row...],...] } (minimal API)
  if (!json || !json.ok) return { headers: [], items: [] };
  if (Array.isArray(json.items)) {
    const headers = Object.keys(json.items[0] || {}).length ? Object.keys(json.items[0]) : [];
    return { headers, items: json.items };
  }
  if (Array.isArray(json.data) && json.data.length) {
    const [hdr, ...rows] = json.data;
    const headers = (hdr || []).map(h => String(h||"").trim()).filter(Boolean);
    const items = rows
      .filter(r => Array.isArray(r) && r.some(c => String(c||"").trim() !== ""))
      .map(r => {
        const o = {};
        headers.forEach((h,i) => o[h] = (r[i] ?? ""));
        return o;
      });
    return { headers, items };
  }
  return { headers: [], items: [] };
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function buildTypeOptions(items) {
  const types = unique(items.map(it => String(it.type||"").trim()).filter(Boolean));
  els.type.innerHTML = '<option value="">全部類型</option>' + types.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
}

function getStatusDot(status) {
  const st = String(status||"").toLowerCase();
  if (st === "ready") return '<span class="statusDot"></span>';
  if (st === "archived") return '<span class="statusDot warn"></span>';
  if (st === "draft") return '<span class="statusDot danger"></span>';
  return '<span class="statusDot warn"></span>';
}

function filteredItems() {
  const q = els.q.value.trim().toLowerCase();
  const type = els.type.value.trim().toLowerCase();
  const status = els.status.value.trim().toLowerCase();
  let items = [...state.items];

  if (type) items = items.filter(it => String(it.type||"").toLowerCase() === type);
  if (status) items = items.filter(it => String(it.status||"").toLowerCase() === status);

  if (q) {
    items = items.filter(it => {
      const hay = Object.values(it).map(v => String(v||"").toLowerCase()).join(" | ");
      return hay.includes(q);
    });
  }
  els.filterHint.textContent = `搜尋：${q || "（無）"}｜類型：${type || "全部"}｜狀態：${status || "全部"}`;
  return items;
}

function render() {
  const items = filteredItems();
  els.countLabel.textContent = String(items.length);
  els.list.innerHTML = "";

  if (!items.length) {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<b>目前沒有資料</b>
      <div class="hint" style="margin-top:8px">你可以：①按「重新載入」 ②按「＋新增課程」 ③在試算表新增一筆資料後再回來。</div>`;
    els.list.appendChild(div);
    return;
  }

  items.forEach(it => {
    const el = document.createElement("div");
    el.className = "item";
    const title = it.title || it.name || "(未命名)";
    const id = it.id || "";
    const type = it.type || "";
    const status = it.status || "";
    const tags = it.tags || "";
    const updated = it.updated_at || it.updated || it.modified_at || "";

    el.innerHTML = `
      <div style="min-width:0">
        <h3>${escapeHtml(title)}</h3>
        <div class="meta">
          <span class="tag">${getStatusDot(status)}${escapeHtml(status || "status")}</span>
          ${type ? `<span class="tag">${escapeHtml(type)}</span>` : ""}
          ${tags ? `<span class="tag">${escapeHtml(tags)}</span>` : ""}
        </div>
        <div class="small" style="margin-top:8px">${escapeHtml(id)}${updated ? " · 更新 " + escapeHtml(updated) : ""}</div>
      </div>
      <div class="right">
        <button class="secondary" data-open="${escapeHtml(id)}">查看</button>
      </div>
    `;
    el.querySelector("[data-open]")?.addEventListener("click", () => openDetailById(id, it));
    els.list.appendChild(el);
  });
}

function kv(label, value) {
  const safe = escapeHtml(value || "");
  return `<div class="kv"><div class="k">${escapeHtml(label)}</div><div class="v">${safe || "<span class='hint'>（空）</span>"}</div></div>`;
}

function openDetailById(id, fallbackObj=null) {
  const it = fallbackObj || state.items.find(x => String(x.id||"") === String(id));
  if (!it) return toast("找不到這筆資料");
  state.selected = it;

  els.detailTitle.textContent = it.title || it.name || "課程";
  els.detailId.textContent = it.id ? `id: ${it.id}` : "";

  const prefer = ["type","status","tags","summary","audience","duration","format","outline","objectives","materials","links","assets","notes","created_at","updated_at"];
  const keys = prefer.filter(k => k in it);
  const rest = Object.keys(it).filter(k => !prefer.includes(k) && k !== "title" && k !== "name" && k !== "id");
  const allKeys = keys.concat(rest);

  const body = allKeys.map(k => kv(k, it[k])).join("") || "<div class='hint'>沒有可顯示的欄位</div>";
  els.detailBody.innerHTML = body;

  els.dlgDetail.showModal();
}

function openForm(mode, it=null) {
  state.editing = it ? {...it} : null;
  els.formTitle.textContent = mode === "edit" ? "編修課程" : "新增課程";
  els.formIdHint.textContent = it?.id ? `id: ${it.id}` : "（新建：id 由系統生成）";

  els.f_title.value = it?.title || "";
  els.f_type.value = it?.type || "";
  els.f_status.value = (it?.status || "draft");
  els.f_tags.value = it?.tags || "";
  els.f_summary.value = it?.summary || "";
  els.f_links.value = it?.links || "";
  els.f_notes.value = it?.notes || "";

  els.dlgForm.showModal();
}

function collectForm() {
  return {
    title: els.f_title.value.trim(),
    type: els.f_type.value.trim(),
    status: els.f_status.value,
    tags: els.f_tags.value.trim(),
    summary: els.f_summary.value.trim(),
    links: els.f_links.value.trim(),
    notes: els.f_notes.value.trim(),
  };
}

async function refresh() {
  try {
    statusText(true, "載入中…");
    const json = await apiGet("list");
    const { headers, items } = normalizeFromListResponse(json);
    state.headers = headers;
    state.items = items;
    buildTypeOptions(items);
    statusText(true, "載入完成");
    render();
  } catch (e) {
    console.error(e);
    statusText(false, "載入失敗：請先按「檢測 API」");
  }
}

async function ping() {
  try {
    const json = await apiGet("ping");
    if (json?.ok) statusText(true, json.message || "OK");
    else statusText(false, json?.message || "ping 失敗");
  } catch (e) {
    statusText(false, "ping 失敗：可能 token 或網址不對");
  }
}

function exportJson() {
  const payload = {
    exported_at: new Date().toISOString(),
    count: state.items.length,
    items: state.items
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "courses-backup.json";
  a.click();
  URL.revokeObjectURL(url);
  toast("已匯出 JSON");
}

function openSettings() {
  els.s_api.value = state.api;
  els.s_token.value = state.token;
  els.dlgSettings.showModal();
}

function openSheet() {
  toast("若要打開試算表：請回到 Google 試算表 App（此鍵先做提醒用途）");
}

async function saveCourse() {
  const data = collectForm();
  if (!data.title) return toast("請填 title");

  try {
    if (state.editing && state.editing.id) {
      const res = await apiPost({ action: "update", id: state.editing.id, data });
      if (!res.ok) throw new Error(res.error || "update failed");
      toast("已儲存");
    } else {
      const res = await apiPost({ action: "create", data });
      if (!res.ok) throw new Error(res.error || "create failed");
      toast("已新增");
    }
    els.dlgForm.close();
    await refresh();
  } catch (e) {
    console.warn(e);
    toast("目前 API 可能是只讀版：請先用升級版 Code.gs 才能新增/編修");
  }
}

async function deleteCourse() {
  const it = state.selected;
  if (!it?.id) return toast("沒有 id，無法刪除");
  if (!confirm("確定刪除這筆？")) return;

  try {
    const res = await apiPost({ action: "delete", id: it.id });
    if (!res.ok) throw new Error(res.error || "delete failed");
    toast("已刪除");
    els.dlgDetail.close();
    await refresh();
  } catch (e) {
    console.warn(e);
    toast("目前 API 可能是只讀版：請先用升級版 Code.gs 才能刪除");
  }
}

function wire() {
  els.q.addEventListener("input", render);
  els.type.addEventListener("change", render);
  els.status.addEventListener("change", render);

  els.btnRefresh.addEventListener("click", refresh);
  els.btnPing.addEventListener("click", ping);
  els.btnNew.addEventListener("click", () => openForm("new"));
  els.btnExport.addEventListener("click", exportJson);
  els.btnSettings.addEventListener("click", openSettings);
  els.btnOpenSheet.addEventListener("click", openSheet);

  els.btnCloseDetail.addEventListener("click", () => els.dlgDetail.close());
  els.btnEdit.addEventListener("click", () => {
    if (!state.selected) return;
    els.dlgDetail.close();
    openForm("edit", state.selected);
  });
  els.btnDelete.addEventListener("click", deleteCourse);

  els.btnCancel.addEventListener("click", () => els.dlgForm.close());
  els.btnSave.addEventListener("click", saveCourse);

  els.btnCloseSettings.addEventListener("click", () => els.dlgSettings.close());
  els.btnSaveSettings.addEventListener("click", () => {
    const api = els.s_api.value.trim();
    const token = els.s_token.value.trim();
    if (!api) return toast("請填 API URL");
    saveSettings(api, token);
    loadSettings();
    els.dlgSettings.close();
    toast("設定已儲存");
  });
}

async function init() {
  loadSettings();
  wire();
  await refresh();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(console.warn);
  });
}

init();
