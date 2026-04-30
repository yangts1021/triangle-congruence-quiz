/* 教師核對模式 */
"use strict";

const PROPS = ["SSS", "SAS", "ASA", "AAS", "RHS"];
const STORAGE_KEY = "tcq_review_edits_v1";
const PAIR_OPTS = ["甲乙", "甲丙", "乙丙", "none"];
const TYPE_LABEL = {
  multiple_choice_congruent: "找出全等",
  vertex_correspondence: "對應頂點",
  judge_congruent: "判斷",
  judge_congruent_with_figure: "判斷(圖)",
  matching_combined: "綜合配對",
};

const state = {
  questions: [],
  edits: {},        // id -> partial answer override (only fields the user changed)
  filter: "all",    // all | unverified | verified | dirty
};

const $app = document.getElementById("app");

/* ---------------- helpers ---------------- */

function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    if (k === "class") e.className = attrs[k];
    else if (k === "html") e.innerHTML = attrs[k];
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), attrs[k]);
    else if (attrs[k] === true) e.setAttribute(k, "");
    else if (attrs[k] != null && attrs[k] !== false) e.setAttribute(k, attrs[k]);
  }
  for (const kid of kids) {
    if (kid == null || kid === false) continue;
    e.appendChild(typeof kid === "string" ? document.createTextNode(kid) : kid);
  }
  return e;
}

function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

function loadEdits() {
  try { state.edits = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { state.edits = {}; }
}
function saveEdits() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.edits));
}

function effectiveAnswer(q) {
  // q.answer with edits applied
  return Object.assign({}, q.answer, state.edits[q.id] || {});
}

function isDirty(q) {
  const e = state.edits[q.id];
  if (!e) return false;
  for (const k of Object.keys(e)) {
    const orig = q.answer[k];
    const v = e[k];
    if (JSON.stringify(orig) !== JSON.stringify(v)) return true;
  }
  return false;
}

function setEdit(id, patch) {
  const cur = state.edits[id] || {};
  state.edits[id] = Object.assign({}, cur, patch);
  saveEdits();
}

function clearEdit(id) {
  delete state.edits[id];
  saveEdits();
}

/* ---------------- top toolbar ---------------- */

function renderToolbar() {
  const total = state.questions.length;
  const verified = state.questions.filter(q => effectiveAnswer(q).verified).length;
  const dirty = state.questions.filter(isDirty).length;

  return el("div", { class: "toolbar" },
    el("div", { class: "stats-inline" },
      el("span", null, "總題數 ", el("b", null, String(total))),
      el("span", null, "✓ 已核對 ", el("b", { style: "color:var(--correct)" }, String(verified))),
      el("span", null, "✏ 已修改 ", el("b", { style: "color:var(--accent)" }, String(dirty))),
      el("span", null, "待處理 ", el("b", null, String(total - verified))),
    ),
    el("div", { class: "filter-group" },
      ...["all", "unverified", "verified", "dirty"].map(f =>
        el("button", {
          class: state.filter === f ? "active" : "",
          onclick: () => { state.filter = f; render(); }
        }, ({all:"全部", unverified:"待核對", verified:"已核對", dirty:"已修改"})[f])
      ),
    ),
    el("div", { class: "export-group" },
      el("button", { class: "btn", onclick: exportJSON }, "下載 questions.json"),
      el("button", { class: "btn btn-secondary", onclick: exportCSV }, "下載 questions.csv"),
      el("button", { class: "btn btn-secondary", title: "清除所有未匯出的編輯",
        onclick: () => {
          if (confirm("確定清除所有暫存編輯？(已下載的檔案不受影響)")) {
            state.edits = {}; saveEdits(); render();
          }
        }
      }, "清除暫存"),
    ),
  );
}

/* ---------------- question card ---------------- */

function renderCard(q) {
  const ans = effectiveAnswer(q);
  const dirty = isDirty(q);
  const verified = !!ans.verified;
  const cls = "review-card" + (dirty && verified ? " both" : dirty ? " dirty" : verified ? " verified" : "");

  const card = el("div", { class: cls });

  card.appendChild(el("div", { class: "r-head" },
    el("span", { class: "r-id" }, q.id),
    el("span", { class: "r-meta" },
      `頁 ${q.page} ・ 題 ${q.question_number}`,
      el("span", { class: "badge" }, TYPE_LABEL[q.type] || q.type),
      el("span", { class: "badge" }, "★".repeat(q.difficulty || 1)),
      verified ? el("span", { class: "badge ok" }, "已核對") : null,
      dirty ? el("span", { class: "badge edit" }, "已修改") : null,
      (q.answer.verified === false) ? el("span", { class: "badge warn" }, "原始未核對") : null,
    ),
  ));

  const body = el("div", { class: "r-body" });
  const img = el("img", { class: "r-image", src: q.image, alt: q.id, loading: "lazy" });
  img.addEventListener("click", () => openZoom(q.image));
  body.appendChild(img);

  body.appendChild(renderForm(q, ans));
  card.appendChild(body);
  return card;
}

function renderForm(q, ans) {
  const wrap = el("div", { class: "r-form" });
  wrap.appendChild(el("div", { class: "r-original" }, "原始 JSON：", el("b", null, formatAnswer(q, q.answer))));

  if (q.type === "multiple_choice_congruent") {
    const pair = ans.congruent_pair ? ans.congruent_pair.join("") : "none";
    wrap.appendChild(el("div", { class: "r-edit-row" },
      el("div", null,
        el("label", null, "全等三角形"),
        select(["", ...PAIR_OPTS], pair, v => {
          const patch = v === "none" ? { congruent_pair: null }
                                     : v ? { congruent_pair: [v[0], v[1]] }
                                         : { congruent_pair: undefined };
          if (v === "") delete patch.congruent_pair;
          setEdit(q.id, patch);
          rerender(q.id);
        }, v => ({"":"──", "none":"皆不全等"})[v] || v[0]+"、"+v[1]),
      ),
      el("div", null,
        el("label", null, "全等性質"),
        select(["", ...PROPS, "none"], ans.property || (ans.property === null ? "none" : ""), v => {
          setEdit(q.id, { property: v === "none" ? null : (v || undefined) });
          rerender(q.id);
        }, v => ({"":"──", "none":"無"})[v] || v),
      ),
    ));
  } else if (q.type === "vertex_correspondence") {
    wrap.appendChild(el("div", { class: "r-edit-row" },
      el("div", { style: "flex-basis:100%" },
        el("label", null, "對應(完整)"),
        textInput(ans.correspondence || "", v => { setEdit(q.id, { correspondence: v }); rerender(q.id); }),
      ),
      el("div", null,
        el("label", null, "全等性質"),
        select(["", ...PROPS], ans.property || "", v => { setEdit(q.id, { property: v || undefined }); rerender(q.id); }, v => v||"──"),
      ),
      el("div", { style: "flex-basis:100%" },
        el("label", null, "說明(可選)"),
        textInput(ans.explanation || "", v => { setEdit(q.id, { explanation: v || undefined }); rerender(q.id); }),
      ),
    ));
  } else if (q.type === "judge_congruent" || q.type === "judge_congruent_with_figure") {
    wrap.appendChild(el("div", { class: "r-edit-row" },
      el("div", null,
        el("label", null, "是否全等"),
        select(["", "yes", "no"], ans.is_congruent === true ? "yes" : ans.is_congruent === false ? "no" : "", v => {
          const ic = v === "yes" ? true : v === "no" ? false : undefined;
          setEdit(q.id, { is_congruent: ic });
          rerender(q.id);
        }, v => ({"":"──", "yes":"全等", "no":"不全等"})[v]),
      ),
      el("div", null,
        el("label", null, "全等性質"),
        select(["", ...PROPS], ans.property || "", v => { setEdit(q.id, { property: v || undefined }); rerender(q.id); }, v => v||"──"),
      ),
    ));
  } else if (q.type === "matching_combined") {
    const cur = (ans.pairs || []).slice();
    while (cur.length < 5) cur.push({ a: 0, b: 0, property: "" });
    const grid = el("div", null);
    cur.forEach((p, i) => {
      const row = el("div", { class: "matching-grid" },
        select([0,1,2,3,4,5,6,7,8,9,10].map(String), String(p.a||0), v => {
          const next = (effectiveAnswer(q).pairs || cur.slice()).map(x=>Object.assign({},x));
          while (next.length < 5) next.push({ a:0, b:0, property:"" });
          next[i].a = parseInt(v) || 0;
          setEdit(q.id, { pairs: next });
          rerender(q.id);
        }, v => v === "0" ? "①…⑩" : "①②③④⑤⑥⑦⑧⑨⑩"[parseInt(v)-1]),
        select([0,1,2,3,4,5,6,7,8,9,10].map(String), String(p.b||0), v => {
          const next = (effectiveAnswer(q).pairs || cur.slice()).map(x=>Object.assign({},x));
          while (next.length < 5) next.push({ a:0, b:0, property:"" });
          next[i].b = parseInt(v) || 0;
          setEdit(q.id, { pairs: next });
          rerender(q.id);
        }, v => v === "0" ? "①…⑩" : "①②③④⑤⑥⑦⑧⑨⑩"[parseInt(v)-1]),
        select(["", ...PROPS], p.property || "", v => {
          const next = (effectiveAnswer(q).pairs || cur.slice()).map(x=>Object.assign({},x));
          while (next.length < 5) next.push({ a:0, b:0, property:"" });
          next[i].property = v;
          setEdit(q.id, { pairs: next });
          rerender(q.id);
        }, v => v || "──"),
      );
      grid.appendChild(row);
    });
    wrap.appendChild(el("div", { class: "r-edit-row" },
      el("div", { style:"flex-basis:100%" },
        el("label", null, "5 組配對 (a, b, 性質)"),
        grid,
      )
    ));
  }

  // Note + verified actions
  wrap.appendChild(el("div", { class: "r-edit-row" },
    el("div", { style: "flex-basis:100%" },
      el("label", null, "備註(可選)"),
      textInput(ans.note || "", v => { setEdit(q.id, { note: v || undefined }); rerender(q.id); }),
    ),
  ));

  wrap.appendChild(el("div", { class: "r-actions" },
    el("button", { class: ans.verified ? "" : "primary",
      onclick: () => { setEdit(q.id, { verified: !ans.verified }); rerender(q.id); }
    }, ans.verified ? "✓ 已核對(取消)" : "✓ 標記為已核對"),
    el("button", {
      onclick: () => { clearEdit(q.id); rerender(q.id); }
    }, "↶ 還原"),
  ));

  return wrap;
}

/* ---------------- helpers: form widgets ---------------- */

function select(values, current, onChange, labelFn) {
  const sel = el("select");
  for (const v of values) {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = labelFn ? labelFn(v) : v;
    if (String(v) === String(current)) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener("change", e => onChange(e.target.value));
  return sel;
}

function textInput(value, onChange) {
  const inp = el("input", { type: "text", value: value || "", autocomplete: "off" });
  inp.addEventListener("input", e => onChange(e.target.value));
  return inp;
}

function formatAnswer(q, a) {
  if (q.type === "multiple_choice_congruent") {
    const pair = a.congruent_pair ? a.congruent_pair.join("≅") : "皆不全等";
    return `${pair} ${a.property ? "("+a.property+")" : ""}`;
  }
  if (q.type === "vertex_correspondence") return `${a.correspondence || "?"} (${a.property || "?"})`;
  if (q.type.startsWith("judge_congruent")) {
    return `${a.is_congruent ? "全等" : "不全等"} ${a.property ? "("+a.property+")" : ""}`;
  }
  if (q.type === "matching_combined") {
    return (a.pairs || []).map(p => "①②③④⑤⑥⑦⑧⑨⑩"[p.a-1]+"≅"+"①②③④⑤⑥⑦⑧⑨⑩"[p.b-1]+"("+p.property+")").join(", ");
  }
  return "?";
}

/* ---------------- zoom modal ---------------- */

function openZoom(src) {
  const overlay = el("div", { class: "zoom-overlay", onclick: () => overlay.remove() },
    el("img", { src }));
  document.body.appendChild(overlay);
}

/* ---------------- export ---------------- */

function buildUpdatedData() {
  // Deep clone original; apply edits
  const orig = state.original;
  const out = JSON.parse(JSON.stringify(orig));
  for (const q of out.questions) {
    const e = state.edits[q.id];
    if (!e) continue;
    for (const k of Object.keys(e)) {
      if (e[k] === undefined) delete q.answer[k];
      else q.answer[k] = e[k];
    }
  }
  return out;
}

function downloadFile(name, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function exportJSON() {
  const data = buildUpdatedData();
  downloadFile("questions.json", JSON.stringify(data, null, 2) + "\n", "application/json");
}

function exportCSV() {
  const data = buildUpdatedData();
  const rows = [["id","頁次","題號","圖片","題型","全等性質","答案","難度","已核對","標籤","備註"]];
  for (const q of data.questions) {
    const a = q.answer;
    let prop = a.property || "";
    let answer = "";
    if (q.type === "multiple_choice_congruent") {
      answer = a.congruent_pair ? a.congruent_pair.join("≅") : "皆不全等";
    } else if (q.type === "vertex_correspondence") {
      answer = a.correspondence || "";
    } else if (q.type === "judge_congruent" || q.type === "judge_congruent_with_figure") {
      answer = a.is_congruent ? "全等" : "不全等";
    } else if (q.type === "matching_combined") {
      prop = "混合";
      answer = (a.pairs || []).map(p => `${p.a}≅${p.b}(${p.property})`).join("; ");
    }
    rows.push([
      q.id,
      String(q.page),
      String(q.question_number),
      q.image,
      q.type,
      prop,
      answer,
      String(q.difficulty || ""),
      a.verified ? "是" : "否",
      (q.tags || []).join(","),
      a.note || "",
    ]);
  }
  const csv = "﻿" + rows.map(r => r.map(csvField).join(",")).join("\n") + "\n";
  downloadFile("questions.csv", csv, "text/csv;charset=utf-8");
}

function csvField(v) {
  v = String(v == null ? "" : v);
  if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

/* ---------------- render ---------------- */

function rerender(id) {
  // Update toolbar stats + replace just the affected card
  const tool = document.querySelector(".toolbar");
  const newTool = renderToolbar();
  if (tool) tool.replaceWith(newTool);

  const card = document.getElementById("card-" + id);
  if (!card) { render(); return; }
  const q = state.questions.find(x => x.id === id);
  if (!q) return;
  const nc = renderCard(q);
  nc.id = "card-" + id;
  // Apply current filter — if no longer matches, hide
  if (!matchesFilter(q)) { card.remove(); return; }
  card.replaceWith(nc);
}

function matchesFilter(q) {
  const ans = effectiveAnswer(q);
  if (state.filter === "verified") return !!ans.verified;
  if (state.filter === "unverified") return !ans.verified;
  if (state.filter === "dirty") return isDirty(q);
  return true;
}

function render() {
  clear($app);
  $app.appendChild(renderToolbar());
  for (const q of state.questions) {
    if (!matchesFilter(q)) continue;
    const c = renderCard(q);
    c.id = "card-" + q.id;
    $app.appendChild(c);
  }
  if ($app.children.length === 1) {
    $app.appendChild(el("div", { class: "review-card", style: "color:var(--muted);text-align:center" },
      "沒有符合條件的題目"));
  }
}

/* ---------------- bootstrap ---------------- */

async function load() {
  $app.innerHTML = '<div class="review-card">載入中…</div>';
  try {
    const res = await fetch("questions.json");
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    state.original = data;
    state.questions = data.questions || [];
    loadEdits();
    render();
  } catch (err) {
    $app.innerHTML = '<div class="review-card" style="color:var(--wrong)">載入失敗：' + err.message + '<br><span style="color:var(--muted);font-size:0.9rem">需以本機伺服器或 GitHub Pages 開啟。</span></div>';
  }
}

load();
