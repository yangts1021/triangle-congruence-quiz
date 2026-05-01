/* 三角形全等題庫 — 單頁練習應用 */
"use strict";

const PROPERTY_OPTIONS = ["SSS", "SAS", "ASA", "AAS", "RHS"];
const TYPE_LABEL = {
  multiple_choice_congruent: "找出全等三角形",
  vertex_correspondence: "寫出對應頂點",
  judge_congruent: "判斷是否全等",
  judge_congruent_with_figure: "判斷是否全等(圖形題)",
  matching_combined: "綜合配對",
  matching_single_pair: "綜合(找全等對)",
};

const CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩";

const ATTEMPTS_KEY = "tcq_attempts_v1";
const STATS_KEY    = "tcq_question_stats_v1";
const MAX_ATTEMPTS = 50;

const state = {
  view: "loading",         // loading | home | quiz | result | history
  questions: [],           // full bank
  selected: [],            // questions in current quiz
  answers: {},             // id -> answer obj
  submitted: false,
  currentMode: "20",       // remembered for recording attempts
  viewingAttemptId: null,  // when reviewing a past attempt
};

const $app = document.getElementById("app");

/* ---------------- helpers ---------------- */

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) {
    for (const k in attrs) {
      if (k === "class") e.className = attrs[k];
      else if (k === "html") e.innerHTML = attrs[k];
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] === true) e.setAttribute(k, "");
      else if (attrs[k] != null && attrs[k] !== false) e.setAttribute(k, attrs[k]);
    }
  }
  for (const kid of kids) {
    if (kid == null || kid === false) continue;
    e.appendChild(typeof kid === "string" ? document.createTextNode(kid) : kid);
  }
  return e;
}

function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

function pairKey(a, b) {
  return [a, b].sort().join("");
}

/* ---------------- stats / attempts (localStorage) ---------------- */

function loadStats() {
  try { return JSON.parse(localStorage.getItem(STATS_KEY) || "{}"); }
  catch { return {}; }
}
function saveStats(s) { localStorage.setItem(STATS_KEY, JSON.stringify(s)); }

function loadAttempts() {
  try { return JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || "[]"); }
  catch { return []; }
}
function saveAttempts(arr) {
  // keep most recent
  const trimmed = arr.slice(-MAX_ATTEMPTS);
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(trimmed));
}

function recordAttempt(results, mode) {
  const stats = loadStats();
  const ts = Date.now();
  for (const r of results) {
    const id = r.q.id;
    const s = stats[id] || { shown: 0, correct: 0, wrong: 0, last_wrong_at: null, last_seen_at: null, last_correct: null };
    s.shown += 1;
    s.last_seen_at = ts;
    if (r.r.correct === true) {
      s.correct += 1;
      s.last_correct = true;
    } else if (r.r.correct === false) {
      s.wrong += 1;
      s.last_wrong_at = ts;
      s.last_correct = false;
    }
    stats[id] = s;
  }
  saveStats(stats);

  const attempt = {
    id: "a_" + ts,
    timestamp: ts,
    mode,
    total: results.length,
    correct: results.filter(r => r.r.correct === true).length,
    wrong:   results.filter(r => r.r.correct === false).length,
    ungraded:results.filter(r => r.r.correct == null).length,
    questions: results.map(r => ({
      id: r.q.id,
      correct: r.r.correct,
      answer: r.ans,
    })),
  };
  const attempts = loadAttempts();
  attempts.push(attempt);
  saveAttempts(attempts);
  return attempt.id;
}

function getWrongPool() {
  const stats = loadStats();
  return state.questions.filter(q => stats[q.id] && stats[q.id].last_correct === false);
}

function formatTimestamp(ts) {
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function modeLabel(mode) {
  if (mode === "all") return "全部題目";
  if (mode === "wrong") return "錯題複習";
  return mode + " 題";
}

function parseCorrespondence(q) {
  // Returns {first, second} extracted from q.answer.correspondence (e.g., "△ABC ≅ △DFE")
  const s = (q && q.answer && q.answer.correspondence) || "";
  const m = s.match(/△?\s*([A-Za-z]+)\s*[≅=]\s*△?\s*([A-Za-z]+)/);
  if (m) return { first: m[1].toUpperCase(), second: m[2].toUpperCase() };
  const fallback = (q && q.given && q.given.triangle_1 && q.given.triangle_1.name) || "";
  return { first: fallback.toUpperCase(), second: "" };
}

function normVertex(s) {
  return (s || "").replace(/[^A-Za-z]/g, "").toUpperCase();
}

/* ---------------- screens ---------------- */

function renderHome() {
  clear($app);
  const total = state.questions.length;

  const propertyStats = {};
  const typeStats = {};
  for (const q of state.questions) {
    const prop = q.answer && q.answer.property;
    if (prop) propertyStats[prop] = (propertyStats[prop] || 0) + 1;
    typeStats[q.type] = (typeStats[q.type] || 0) + 1;
  }

  const wrongCount = getWrongPool().length;
  const attempts = loadAttempts();

  const home = el("div", { class: "home-card" },
    el("h2", null, "選擇練習方式"),

    el("div", null,
      el("div", { class: "answer-field" },
        el("label", null, "題數"),
        el("div", { class: "option-row" },
          el("label", null,
            el("input", { type: "radio", name: "mode", value: "20", checked: true }),
            "隨機 20 題"
          ),
          el("label", null,
            el("input", { type: "radio", name: "mode", value: "all" }),
            `全部 ${total} 題`
          ),
          el("label", { class: wrongCount === 0 ? "disabled" : "" },
            el("input", { type: "radio", name: "mode", value: "wrong", disabled: wrongCount === 0 }),
            `🔁 錯題複習 (${wrongCount})`
          ),
        ),
      ),

      el("div", { class: "answer-field" },
        el("label", null, "題型(可複選)"),
        el("div", { class: "option-row" },
          ...Object.keys(TYPE_LABEL).filter(t => (typeStats[t] || 0) > 0).map(t =>
            el("label", null,
              el("input", { type: "checkbox", name: "type", value: t, checked: true }),
              `${TYPE_LABEL[t]}（${typeStats[t] || 0}）`
            )
          ),
        ),
      ),

      el("div", { class: "answer-field" },
        el("label", null, "出題順序"),
        el("div", { class: "option-row" },
          el("label", null,
            el("input", { type: "radio", name: "order", value: "shuffle", checked: true }),
            "隨機"
          ),
          el("label", null,
            el("input", { type: "radio", name: "order", value: "sequential" }),
            "依原順序"
          ),
        ),
      ),
    ),

    el("div", { class: "btn-group" },
      el("button", { class: "btn", onclick: startQuiz }, "開始練習"),
      el("button", {
        class: "btn btn-secondary",
        disabled: attempts.length === 0,
        onclick: () => { state.view = "history"; renderHistory(); window.scrollTo(0,0); }
      }, `📝 作答紀錄 (${attempts.length})`),
    ),
  );

  const stats = el("div", { class: "home-card" },
    el("h2", null, "題庫統計"),
    el("div", { class: "stats" },
      ...PROPERTY_OPTIONS.map(p =>
        el("div", null,
          el("b", null, String(propertyStats[p] || 0)),
          el("span", null, p),
        )
      ),
    ),
  );

  $app.appendChild(home);
  $app.appendChild(stats);
}

function startQuiz() {
  const mode = document.querySelector('input[name="mode"]:checked').value;
  const order = document.querySelector('input[name="order"]:checked').value;
  const types = Array.from(document.querySelectorAll('input[name="type"]:checked')).map(i => i.value);

  if (types.length === 0) {
    alert("請至少選擇一種題型");
    return;
  }

  let pool;
  if (mode === "wrong") {
    pool = getWrongPool().filter(q => types.includes(q.type));
    // for wrong mode, sort by oldest mistake first so they don't keep re-encountering the same ones
    const stats = loadStats();
    pool.sort((a, b) => (stats[a.id].last_wrong_at || 0) - (stats[b.id].last_wrong_at || 0));
    if (order === "shuffle") pool = shuffle(pool);
  } else {
    pool = state.questions.filter(q => types.includes(q.type));
    if (order === "shuffle") pool = shuffle(pool);
    if (mode === "20") pool = pool.slice(0, 20);
  }

  if (pool.length === 0) {
    alert(mode === "wrong" ? "目前沒有錯題可複習(請先答錯一些題目 🙂)" : "沒有符合條件的題目");
    return;
  }

  state.selected = pool;
  state.answers = {};
  state.submitted = false;
  state.currentMode = mode;
  state.view = "quiz";
  renderQuiz();
  window.scrollTo(0, 0);
}

function renderQuiz() {
  clear($app);

  const progress = el("div", { class: "progress-bar" },
    el("span", null, `共 ${state.selected.length} 題`),
    el("button", {
      class: "btn btn-secondary",
      onclick: () => { if (confirm("確定回到首頁？目前進度將消失")) { state.view = "home"; renderHome(); } }
    }, "回首頁"),
  );
  $app.appendChild(progress);

  state.selected.forEach((q, idx) => {
    $app.appendChild(renderQuestionCard(q, idx));
  });

  const submit = el("div", { class: "btn-group", style: "justify-content:center;margin-top:20px" },
    el("button", { class: "btn", onclick: submitQuiz }, "送出答案"),
  );
  $app.appendChild(submit);
}

function renderQuestionCard(q, idx) {
  const card = el("div", { class: "q-card", id: `q-${q.id}` });

  const header = el("div", { class: "q-header" },
    el("span", { class: "q-num" }, `第 ${idx + 1} 題`),
    el("span", { class: "q-meta" },
      `頁 ${q.page} ・ 題 ${q.question_number}`,
      el("span", { class: "q-tag" }, TYPE_LABEL[q.type] || q.type),
      el("span", { class: "q-tag" }, "★".repeat(q.difficulty || 1)),
    ),
  );
  card.appendChild(header);
  card.appendChild(el("div", { class: "q-instruction" }, q.instruction || ""));

  if (q.image) {
    card.appendChild(el("img", { class: "q-image", src: q.image, alt: q.id, loading: "lazy" }));
  }

  card.appendChild(renderAnswerInputs(q));
  return card;
}

function renderAnswerInputs(q) {
  const wrap = el("div", { class: "answer-row", id: `a-${q.id}` });
  const aid = (suffix) => `${q.id}--${suffix}`;

  const propSelect = (suffix, includeNone) => el("select", { id: aid(suffix) },
    el("option", { value: "" }, "── 請選擇 ──"),
    ...PROPERTY_OPTIONS.map(p => el("option", { value: p }, p)),
    includeNone ? el("option", { value: "none" }, "不全等 / 無") : null,
  );

  if (q.type === "multiple_choice_congruent") {
    wrap.appendChild(
      el("div", { class: "answer-field" },
        el("label", null, "全等的兩個三角形"),
        el("select", { id: aid("pair") },
          el("option", { value: "" }, "── 請選擇 ──"),
          el("option", { value: "甲乙" }, "甲、乙"),
          el("option", { value: "甲丙" }, "甲、丙"),
          el("option", { value: "乙丙" }, "乙、丙"),
          el("option", { value: "none" }, "皆不全等"),
        ),
      )
    );
    wrap.appendChild(
      el("div", { class: "answer-field" },
        el("label", null, "全等性質"),
        propSelect("prop", true),
      )
    );
  } else if (q.type === "vertex_correspondence") {
    const firstName = parseCorrespondence(q).first || "ABC";
    wrap.appendChild(
      el("div", { class: "answer-field" },
        el("label", null, "對應頂點(只填第二個三角形)"),
        el("div", { class: "corr-input" },
          el("span", { class: "corr-prefix" }, `△${firstName} ≅ △`),
          el("input", {
            id: aid("corr"),
            type: "text",
            placeholder: "如 DFE",
            autocomplete: "off",
            autocapitalize: "characters",
            spellcheck: "false",
            maxlength: 6,
          }),
        ),
      )
    );
    wrap.appendChild(
      el("div", { class: "answer-field" },
        el("label", null, "全等性質"),
        propSelect("prop", false),
      )
    );
  } else if (q.type === "judge_congruent" || q.type === "judge_congruent_with_figure") {
    wrap.appendChild(
      el("div", { class: "answer-field" },
        el("label", null, "是否全等"),
        el("select", { id: aid("yn"),
          onchange: (e) => {
            const propEl = document.getElementById(aid("prop"));
            if (propEl) propEl.disabled = e.target.value !== "yes";
          }
        },
          el("option", { value: "" }, "── 請選擇 ──"),
          el("option", { value: "yes" }, "是,全等"),
          el("option", { value: "no" }, "否,不全等"),
        ),
      )
    );
    wrap.appendChild(
      el("div", { class: "answer-field" },
        el("label", null, "全等性質(若全等)"),
        propSelect("prop", false),
      )
    );
  } else if (q.type === "matching_combined") {
    wrap.appendChild(
      el("div", { class: "answer-field", style: "flex-basis:100%" },
        el("label", null, "綜合題：請於紙上寫出 5 組配對及性質,完成後送出查看參考答案"),
        el("input", { id: aid("note"), type: "text", placeholder: "可在此記下你的答案,例如：①≅⑧(RHS)、②≅⑩(SSS)…", autocomplete: "off" }),
      )
    );
  } else if (q.type === "matching_single_pair") {
    const target = q.given && q.given.target;
    const total = (q.given && q.given.total) || 10;
    const labelText = `與 ${CIRCLED[target-1]} 全等的三角形`;
    const opts = [];
    for (let i = 1; i <= total; i++) if (i !== target) opts.push(i);
    wrap.appendChild(
      el("div", { class: "answer-field" },
        el("label", null, labelText),
        el("select", { id: aid("match") },
          el("option", { value: "" }, "── 請選擇 ──"),
          ...opts.map(n => el("option", { value: String(n) }, CIRCLED[n-1])),
        ),
      )
    );
    wrap.appendChild(
      el("div", { class: "answer-field" },
        el("label", null, "全等性質"),
        propSelect("prop", false),
      )
    );
  }

  return wrap;
}

/* ---------------- grading ---------------- */

function readAnswer(q) {
  const get = (suffix) => {
    const e = document.getElementById(`${q.id}--${suffix}`);
    return e ? e.value.trim() : "";
  };
  if (q.type === "multiple_choice_congruent") {
    return { pair: get("pair"), prop: get("prop") };
  }
  if (q.type === "vertex_correspondence") {
    return { corr: get("corr"), prop: get("prop") };
  }
  if (q.type === "judge_congruent" || q.type === "judge_congruent_with_figure") {
    return { yn: get("yn"), prop: get("prop") };
  }
  if (q.type === "matching_combined") {
    return { note: get("note") };
  }
  if (q.type === "matching_single_pair") {
    return { match: get("match"), prop: get("prop") };
  }
  return {};
}

function gradeQuestion(q, ans) {
  // returns { correct: bool|null, parts: [{label, ok, you, expected}] }
  const parts = [];
  if (q.type === "multiple_choice_congruent") {
    const expectedPair = q.answer.congruent_pair;
    const expectedKey = expectedPair ? pairKey(expectedPair[0], expectedPair[1]) : "none";
    const yourKey = ans.pair === "none" ? "none" : (ans.pair ? pairKey(ans.pair[0], ans.pair[1]) : "");
    const pairOk = yourKey === expectedKey;
    parts.push({
      label: "全等的兩個三角形",
      ok: pairOk,
      you: ans.pair === "none" ? "皆不全等" : (ans.pair ? `${ans.pair[0]}、${ans.pair[1]}` : "(未填)"),
      expected: expectedPair ? `${expectedPair[0]}、${expectedPair[1]}` : "皆不全等",
    });
    const expectedProp = q.answer.property || "none";
    const yourProp = ans.prop || "";
    const propOk = yourProp === expectedProp || (yourProp === "none" && !q.answer.property);
    parts.push({
      label: "全等性質",
      ok: propOk,
      you: ans.prop === "none" ? "不全等 / 無" : (ans.prop || "(未填)"),
      expected: q.answer.property || "─",
    });
    return { correct: pairOk && propOk, parts };
  }
  if (q.type === "vertex_correspondence") {
    const { first, second: expectedSecond } = parseCorrespondence(q);
    const yourSecond = normVertex(ans.corr);
    const corrOk = yourSecond.length > 0 && yourSecond === expectedSecond;
    parts.push({
      label: "對應頂點",
      ok: corrOk,
      you: yourSecond ? `△${first} ≅ △${yourSecond}` : "(未填)",
      expected: q.answer.correspondence || (expectedSecond ? `△${first} ≅ △${expectedSecond}` : "─"),
    });
    const propOk = (ans.prop || "") === (q.answer.property || "");
    parts.push({
      label: "全等性質",
      ok: propOk,
      you: ans.prop || "(未填)",
      expected: q.answer.property || "─",
    });
    return { correct: corrOk && propOk, parts };
  }
  if (q.type === "judge_congruent" || q.type === "judge_congruent_with_figure") {
    const expectedYn = q.answer.is_congruent ? "yes" : "no";
    const ynOk = ans.yn === expectedYn;
    parts.push({
      label: "是否全等",
      ok: ynOk,
      you: ans.yn === "yes" ? "是,全等" : (ans.yn === "no" ? "否,不全等" : "(未填)"),
      expected: q.answer.is_congruent ? "是,全等" : "否,不全等",
    });
    if (q.answer.is_congruent) {
      const propOk = ans.yn === "yes" && (ans.prop || "") === (q.answer.property || "");
      parts.push({
        label: "全等性質",
        ok: propOk,
        you: ans.prop || "(未填)",
        expected: q.answer.property || "─",
      });
      return { correct: ynOk && propOk, parts };
    }
    return { correct: ynOk, parts };
  }
  if (q.type === "matching_combined") {
    const pairsText = (q.answer.pairs || []).map(p => `${cir(p.a)}≅${cir(p.b)}(${p.property})`).join("、");
    parts.push({
      label: "你的記錄",
      ok: null,
      you: ans.note || "(未填)",
      expected: pairsText || "(無)",
    });
    return { correct: null, parts };
  }
  if (q.type === "matching_single_pair") {
    const target = q.given && q.given.target;
    const expectedMatch = q.answer.match;
    const yourMatch = parseInt(ans.match, 10);
    const matchOk = !isNaN(yourMatch) && yourMatch === expectedMatch;
    parts.push({
      label: `與 ${cir(target)} 全等的三角形`,
      ok: matchOk,
      you: yourMatch ? cir(yourMatch) : "(未填)",
      expected: cir(expectedMatch),
    });
    const propOk = (ans.prop || "") === (q.answer.property || "");
    parts.push({
      label: "全等性質",
      ok: propOk,
      you: ans.prop || "(未填)",
      expected: q.answer.property || "─",
    });
    return { correct: matchOk && propOk, parts };
  }
  return { correct: null, parts: [] };
}

function cir(n) {
  // 1..10 -> ①②③④⑤⑥⑦⑧⑨⑩
  const t = ["", "①","②","③","④","⑤","⑥","⑦","⑧","⑨","⑩"];
  return t[n] || String(n);
}

function submitQuiz() {
  const answers = {};
  for (const q of state.selected) answers[q.id] = readAnswer(q);
  state.answers = answers;
  state.submitted = true;

  // Compute results once and persist this attempt
  const results = state.selected.map((q, idx) => {
    const ans = answers[q.id] || {};
    const r = gradeQuestion(q, ans);
    return { q, ans, r, idx };
  });
  state.viewingAttemptId = recordAttempt(results, state.currentMode || "20");
  state.view = "result";
  renderResult();
  window.scrollTo(0, 0);
}

function renderResult() {
  clear($app);

  let correct = 0, wrong = 0, ungraded = 0;
  const results = state.selected.map((q, idx) => {
    const ans = state.answers[q.id] || {};
    const r = gradeQuestion(q, ans);
    if (r.correct === true) correct++;
    else if (r.correct === false) wrong++;
    else ungraded++;
    return { q, ans, r, idx };
  });

  const graded = correct + wrong;
  const score = graded > 0 ? Math.round((correct / graded) * 100) : 0;
  const isPastView = state.viewingAttemptId && state.viewingAttemptId.startsWith("a_") && !state.submitted;

  const summary = el("div", { class: "result-card" },
    el("div", { class: "result-score" },
      `${score}`,
      el("small", null, " 分"),
    ),
    el("div", { style: "color:var(--muted);margin-top:4px" },
      `${correct} 答對 / ${graded} 計分題` + (ungraded ? `（另 ${ungraded} 題自評）` : "")
    ),
    el("div", { class: "breakdown" },
      el("span", null, "✅ ", el("b", { style: "color:var(--correct)" }, String(correct)), " 答對"),
      el("span", null, "❌ ", el("b", { style: "color:var(--wrong)" }, String(wrong)), " 答錯"),
      ungraded ? el("span", null, "📝 ", el("b", null, String(ungraded)), " 自評") : null,
    ),
    el("div", { class: "btn-group", style: "justify-content:center" },
      el("button", { class: "btn", onclick: () => { state.view = "home"; state.viewingAttemptId = null; renderHome(); window.scrollTo(0,0); } }, "回首頁"),
      el("button", { class: "btn btn-secondary", onclick: () => { startReplay(); } }, "重做相同題目"),
      wrong > 0 ? el("button", { class: "btn btn-secondary", onclick: () => { startReplayWrong(results); } }, `🔁 只練錯題 (${wrong})`) : null,
      isPastView ? el("button", { class: "btn btn-secondary", onclick: () => { state.view="history"; renderHistory(); window.scrollTo(0,0); } }, "← 回紀錄") : null,
    ),
  );
  $app.appendChild(summary);

  for (const { q, ans, r, idx } of results) {
    $app.appendChild(renderResultCard(q, ans, r, idx));
  }
}

function startReplayWrong(results) {
  const wrongQs = results.filter(r => r.r.correct === false).map(r => r.q);
  if (wrongQs.length === 0) return;
  state.selected = shuffle(wrongQs);
  state.answers = {};
  state.submitted = false;
  state.viewingAttemptId = null;
  state.currentMode = "wrong";
  state.view = "quiz";
  renderQuiz();
  window.scrollTo(0, 0);
}

function startReplay() {
  state.answers = {};
  state.submitted = false;
  state.viewingAttemptId = null;
  state.view = "quiz";
  renderQuiz();
  window.scrollTo(0, 0);
}

/* ---------------- history view ---------------- */

function renderHistory() {
  clear($app);
  const attempts = loadAttempts().slice().reverse(); // newest first

  const header = el("div", { class: "home-card" },
    el("div", { style: "display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px" },
      el("h2", { style: "margin:0" }, "📝 作答紀錄"),
      el("div", { class: "btn-group" },
        el("button", { class: "btn btn-secondary", onclick: () => { state.view = "home"; renderHome(); window.scrollTo(0,0); } }, "← 回首頁"),
        attempts.length > 0 ? el("button", {
          class: "btn btn-secondary",
          onclick: () => {
            if (confirm(`確定清除全部 ${attempts.length} 筆作答紀錄？(每題的對錯統計也會一起清掉)`)) {
              localStorage.removeItem(ATTEMPTS_KEY);
              localStorage.removeItem(STATS_KEY);
              renderHistory();
            }
          }
        }, "🗑 清除全部") : null,
      ),
    ),
    el("p", { style: "color:var(--muted);font-size:0.9rem;margin:8px 0 0" },
      `共 ${attempts.length} 筆紀錄(最多保留 ${MAX_ATTEMPTS} 筆)`),
  );
  $app.appendChild(header);

  if (attempts.length === 0) {
    $app.appendChild(el("div", { class: "home-card", style: "text-align:center;color:var(--muted)" },
      "還沒有作答紀錄。回首頁開始第一次練習吧！"));
    return;
  }

  for (const a of attempts) {
    $app.appendChild(renderHistoryCard(a));
  }
}

function renderHistoryCard(a) {
  const graded = a.correct + a.wrong;
  const score = graded > 0 ? Math.round((a.correct / graded) * 100) : 0;
  const card = el("div", { class: "home-card", style: "display:flex;flex-direction:column;gap:8px" });

  card.appendChild(el("div", { style: "display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:baseline" },
    el("div", null,
      el("b", { style: "font-size:1.05rem" }, formatTimestamp(a.timestamp)),
      el("span", { class: "q-tag", style: "margin-left:8px" }, modeLabel(a.mode)),
    ),
    el("div", { style: "font-size:1.2rem;font-weight:700;color:var(--accent)" }, `${score} 分`),
  ));

  card.appendChild(el("div", { style: "color:var(--muted);font-size:0.9rem" },
    `${a.total} 題 ・ ✅ ${a.correct} 答對 ・ ❌ ${a.wrong} 答錯` + (a.ungraded ? ` ・ 📝 ${a.ungraded} 自評` : "")
  ));

  card.appendChild(el("div", { class: "btn-group" },
    el("button", {
      class: "btn btn-secondary",
      onclick: () => viewPastAttempt(a.id),
    }, "🔍 看詳解"),
    el("button", {
      class: "btn btn-secondary",
      onclick: () => replayPastAttempt(a.id),
    }, "↻ 重做相同題目"),
    a.wrong > 0 ? el("button", {
      class: "btn btn-secondary",
      onclick: () => replayWrongFrom(a.id),
    }, `🔁 只練錯題 (${a.wrong})`) : null,
    el("button", {
      class: "btn btn-secondary",
      style: "color:var(--wrong)",
      onclick: () => {
        if (!confirm("刪除這筆紀錄？")) return;
        const all = loadAttempts().filter(x => x.id !== a.id);
        saveAttempts(all);
        renderHistory();
      },
    }, "刪除"),
  ));

  return card;
}

function viewPastAttempt(attemptId) {
  const att = loadAttempts().find(a => a.id === attemptId);
  if (!att) return;
  const qmap = Object.fromEntries(state.questions.map(q => [q.id, q]));
  const selected = att.questions.map(qa => qmap[qa.id]).filter(Boolean);
  const answers = {};
  for (const qa of att.questions) answers[qa.id] = qa.answer || {};
  state.selected = selected;
  state.answers = answers;
  state.submitted = false; // viewing past, not new submission
  state.viewingAttemptId = attemptId;
  state.view = "result";
  renderResult();
  window.scrollTo(0, 0);
}

function replayPastAttempt(attemptId) {
  const att = loadAttempts().find(a => a.id === attemptId);
  if (!att) return;
  const qmap = Object.fromEntries(state.questions.map(q => [q.id, q]));
  const selected = att.questions.map(qa => qmap[qa.id]).filter(Boolean);
  if (selected.length === 0) { alert("題目不存在"); return; }
  state.selected = selected;
  state.answers = {};
  state.submitted = false;
  state.viewingAttemptId = null;
  state.currentMode = att.mode;
  state.view = "quiz";
  renderQuiz();
  window.scrollTo(0, 0);
}

function replayWrongFrom(attemptId) {
  const att = loadAttempts().find(a => a.id === attemptId);
  if (!att) return;
  const qmap = Object.fromEntries(state.questions.map(q => [q.id, q]));
  const wrongQs = att.questions.filter(qa => qa.correct === false).map(qa => qmap[qa.id]).filter(Boolean);
  if (wrongQs.length === 0) { alert("這次沒有錯題"); return; }
  state.selected = shuffle(wrongQs);
  state.answers = {};
  state.submitted = false;
  state.viewingAttemptId = null;
  state.currentMode = "wrong";
  state.view = "quiz";
  renderQuiz();
  window.scrollTo(0, 0);
}

function renderResultCard(q, ans, r, idx) {
  const cls = r.correct === true ? "correct" : r.correct === false ? "wrong" : "unknown";
  const card = el("div", { class: `q-card ${cls}` });

  const header = el("div", { class: "q-header" },
    el("span", { class: "q-num" }, `第 ${idx + 1} 題`),
    el("span", { class: "q-meta" },
      `頁 ${q.page} ・ 題 ${q.question_number}`,
      el("span", { class: "q-tag" }, TYPE_LABEL[q.type] || q.type),
      el("span", { class: "q-tag" }, "★".repeat(q.difficulty || 1)),
    ),
  );
  card.appendChild(header);
  card.appendChild(el("div", { class: "q-instruction" }, q.instruction || ""));

  if (q.image) {
    card.appendChild(el("img", { class: "q-image", src: q.image, alt: q.id, loading: "lazy" }));
  }

  const fb = el("div", { class: "feedback" });
  if (r.correct === true) {
    fb.appendChild(el("div", { class: "label-correct" }, "✅ 答對"));
  } else if (r.correct === false) {
    fb.appendChild(el("div", { class: "label-wrong" }, "❌ 答錯"));
  } else {
    fb.appendChild(el("div", { class: "label-info" }, "📝 此題自評(不計分)"));
  }

  const dl = el("dl");
  for (const part of r.parts) {
    const mark = part.ok === true ? "✅" : part.ok === false ? "❌" : "・";
    dl.appendChild(el("dt", null, part.label));
    dl.appendChild(el("dd", null, `你的：${part.you}　／　正解：${part.expected}　${mark}`));
  }
  fb.appendChild(dl);

  if (q.answer && q.answer.explanation) {
    fb.appendChild(el("div", { style: "margin-top:6px;font-size:0.9rem;color:var(--muted)" },
      `說明：${q.answer.explanation}`));
  }
  if (q.answer && q.answer.note) {
    fb.appendChild(el("div", { style: "margin-top:4px;font-size:0.85rem;color:var(--muted)" },
      `註：${q.answer.note}`));
  }
  if (q.answer && q.answer.verified === false) {
    fb.appendChild(el("div", { style: "margin-top:4px;font-size:0.8rem;color:var(--warn)" },
      "⚠ 此題答案未核對教師手冊,請以課本為準"));
  }

  card.appendChild(fb);
  return card;
}

/* ---------------- bootstrap ---------------- */

async function load() {
  $app.innerHTML = '<div class="home-card">載入題庫中…</div>';
  try {
    const res = await fetch("questions.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.questions = data.questions || [];
    state.view = "home";
    renderHome();
  } catch (err) {
    $app.innerHTML = `<div class="home-card"><h2 style="color:var(--wrong)">載入失敗</h2><p>${err.message}</p><p style="color:var(--muted);font-size:0.9rem">請以本地伺服器或 GitHub Pages 開啟,直接以檔案協議(file://)開啟瀏覽器會無法載入 JSON。</p></div>`;
  }
}

load();
