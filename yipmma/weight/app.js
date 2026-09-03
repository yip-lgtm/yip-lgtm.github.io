(function () {
  var MEALS = ["早", "午", "晚", "加"];
  var CHIPS = ["白飯半碗", "白切鴻", "蒸魚", "蛋兩隻", "豆漿", "香蕉", "鴾胸", "豆腐", "菜心", "麥皮", "熱小米粥"];
  CHIPS[6] = "雞胸";
  var meal = "午";
  function hkDate() {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Hong_Kong" });
  }
  function wd() {
    return new Date().toLocaleString("en-US", { timeZone: "Asia/Hong_Kong", weekday: "short" }).slice(0, 3);
  }
  function load() {
    try {
      return JSON.parse(localStorage.getItem("yipmma-v1") || "{}");
    } catch (e) {
      return {};
    }
  }
  function pack(s) {
    return {
      v: 1,
      at: Date.now(),
      date: hkDate(),
      profile: s.profile || {},
      scans: s.scans || [],
      foods: s.foods || [],
      reports: s.reports || [],
      sessions: s.sessions || [],
      runs: s.runs || [],
      weights: s.weights || [],
      remarks: s.remarks || {},
      lastKg: s.lastKg
    };
  }
  function save(s) {
    var e = pack(s);
    localStorage.setItem("yipmma-v1", JSON.stringify(e));
    return e;
  }
  function st() {
    var s = load();
    s.profile = s.profile || {};
    s.foods = s.foods || [];
    s.reports = s.reports || [];
    s.runs = s.runs || [];
    s.scans = s.scans || [];
    s.weights = s.weights || [];
    s.remarks = s.remarks || {};
    s.sessions = s.sessions || [];
    return s;
  }
  function latestScan(s) {
    var a = s.scans || [];
    return a.length ? a[a.length - 1] : null;
  }
  function todayFoods(s) {
    var d = hkDate();
    return (s.foods || []).filter(function (x) {
      return x.date === d;
    });
  }
  function num(id) {
    var n = Number(document.getElementById(id).value);
    return Number.isFinite(n) ? n : null;
  }
  function paintScan() {
    var s = st(),
      sc = latestScan(s),
      p = s.profile || {};
    document.getElementById("h").value = p.heightCm || 168;
    document.getElementById("t").value = p.targetKg || p.boxingTargetKg || 54.5;
    if (!sc) {
      document.getElementById("kg").textContent = "—";
      document.getElementById("bf").textContent = "—";
      document.getElementById("mk").textContent = "—";
      document.getElementById("bmr").textContent = "—";
      document.getElementById("sum").textContent = "未有磅數。下面四格填完再保存。";
      return;
    }
    document.getElementById("kg").textContent = (sc.kg || s.lastKg || "—") + " kg";
    document.getElementById("bf").textContent = sc.bodyFatPct != null ? sc.bodyFatPct + "%" : "—";
    document.getElementById("mk").textContent = sc.muscleKg != null ? sc.muscleKg + " kg" : "—";
    document.getElementById("bmr").textContent = sc.bmr || "—";
    var tgt = Number(p.targetKg || 54.5),
      kg = Number(sc.kg || 0),
      gap = kg && tgt ? (kg - tgt).toFixed(2) : "—";
    document.getElementById("sum").textContent =
      sc.date + " · 高過目標 " + tgt + " kg " + gap + " kg。BMI " + (sc.bmi || "?");
    if (!document.getElementById("inKg").value) {
      document.getElementById("inKg").value = sc.kg != null ? sc.kg : "";
      document.getElementById("inBf").value = sc.bodyFatPct != null ? sc.bodyFatPct : "";
      document.getElementById("inMk").value = sc.muscleKg != null ? sc.muscleKg : "";
      document.getElementById("inBmr").value = sc.bmr != null ? sc.bmr : "";
    }
  }
  function buildScan() {
    var kg = num("inKg"),
      bf = num("inBf"),
      mk = num("inMk"),
      bmr = num("inBmr"),
      h = num("h") || 168;
    if (kg == null) return { ok: false, error: "要有體重 kg" };
    var fatKg = bf != null ? Math.round(((kg * bf) / 100) * 100) / 100 : null;
    var leanKg = fatKg != null ? Math.round((kg - fatKg) * 100) / 100 : null;
    var musclePct = mk != null && kg > 0 ? Math.round((mk / kg) * 1000) / 10 : null;
    var hm = h / 100;
    var bmi = Math.round((kg / (hm * hm)) * 10) / 10;
    var prev = latestScan(st()) || {};
    return {
      ok: true,
      scan: Object.assign({}, prev, {
        date: hkDate(),
        kg: kg,
        bodyFatPct: bf,
        muscleKg: mk,
        bmr: bmr,
        fatKg: fatKg,
        leanKg: leanKg,
        musclePct: musclePct,
        bmi: bmi
      })
    };
  }
  function saveScan() {
    var r = buildScan();
    if (!r.ok) {
      document.getElementById("scanOk").textContent = r.error;
      return;
    }
    var s = st();
    var d = hkDate();
    s.scans = (s.scans || []).filter(function (x) {
      return x.date !== d;
    });
    s.scans.push(r.scan);
    s.scans = s.scans.sort(function (a, b) {
      return a.date.localeCompare(b.date);
    }).slice(-60);
    s.weights = (s.weights || []).filter(function (x) {
      return x.date !== d;
    });
    s.weights.push({ date: d, kg: r.scan.kg });
    s.lastKg = r.scan.kg;
    s.profile = s.profile || {};
    s.profile.heightCm = num("h") || s.profile.heightCm || 168;
    s.profile.targetKg = num("t") || s.profile.targetKg || 54.5;
    var packed = save(s);
    document.getElementById("scanOk").textContent = "已保存 " + d;
    paintScan();
    pushBackup(packed, true);
  }
  function b64(str) {
    var t = new TextEncoder().encode(str),
      n = "";
    t.forEach(function (e) {
      n += String.fromCharCode(e);
    });
    return btoa(n);
  }
  function ghCfg() {
    return {
      token: (document.getElementById("ghToken").value || localStorage.getItem("yipmma-gh-token") || "").trim(),
      repo: (document.getElementById("ghRepo").value || localStorage.getItem("yipmma-gh-repo") || "yip-lgtm/yipmma-data").trim(),
      path: (document.getElementById("ghPath").value || localStorage.getItem("yipmma-gh-path") || "backup/data.json").trim()
    };
  }
  function saveGhCfg() {
    var c = ghCfg();
    localStorage.setItem("yipmma-gh-token", c.token);
    localStorage.setItem("yipmma-gh-repo", c.repo);
    localStorage.setItem("yipmma-gh-path", c.path);
    return c;
  }
  async function pushBackup(data, quiet) {
    var c = saveGhCfg();
    var el = document.getElementById("ghStatus");
    if (!c.token) {
      if (!quiet) el.textContent = "未設 GitHub token，只保存在這部手機。";
      return { ok: false, error: "no token" };
    }
    var parts = c.repo.split("/");
    if (parts.length !== 2) {
      el.textContent = "repo 要 owner/name";
      return { ok: false };
    }
    var url =
      "https://api.github.com/repos/" +
      parts[0] +
      "/" +
      parts[1] +
      "/contents/" +
      c.path.replace(/^\/+/, "");
    var headers = {
      Authorization: "Bearer " + c.token,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json"
    };
    el.textContent = "pushing…";
    try {
      var get = await fetch(url, { headers: headers });
      var sha = null;
      if (get.ok) sha = (await get.json()).sha;
      else if (get.status !== 404) {
        var t = await get.text();
        el.textContent = "讀檔失敗 " + get.status + " " + t.slice(0, 120);
        localStorage.setItem("yipmma-gh-status", el.textContent);
        return { ok: false };
      }
      var payload = {
        message: "backup " + (data.date || hkDate()) + " " + new Date().toISOString(),
        content: b64(JSON.stringify(data, null, 2)),
        branch: "main"
      };
      if (sha) payload.sha = sha;
      var put = await fetch(url, { method: "PUT", headers: headers, body: JSON.stringify(payload) });
      if (!put.ok) {
        var t2 = await put.text();
        el.textContent = "git push 失敗 " + put.status + " " + t2.slice(0, 160);
        localStorage.setItem("yipmma-gh-status", el.textContent);
        return { ok: false };
      }
      var j = await put.json();
      el.textContent = "已 push " + new Date().toLocaleString("zh-HK");
      localStorage.setItem("yipmma-gh-status", el.textContent);
      return { ok: true, url: j.content && j.content.html_url };
    } catch (err) {
      el.textContent = "git push 失敗：網路";
      return { ok: false };
    }
  }
  function renderMeals() {
    var box = document.getElementById("meals");
    box.innerHTML = "";
    MEALS.forEach(function (m) {
      var b = document.createElement("button");
      b.className = "ghost chip" + (m === meal ? " on" : "");
      b.textContent = m;
      b.onclick = function () {
        meal = m;
        renderMeals();
      };
      box.appendChild(b);
    });
  }
  function renderChips() {
    var box = document.getElementById("chips");
    box.innerHTML = "";
    CHIPS.forEach(function (c) {
      var b = document.createElement("button");
      b.className = "ghost chip";
      b.textContent = c;
      b.onclick = function () {
        addFood(c);
      };
      box.appendChild(b);
    });
  }
  function renderFood() {
    var s = st(),
      list = document.getElementById("foodList"),
      arr = todayFoods(s);
    list.innerHTML = "";
    if (!arr.length) {
      list.innerHTML = "<li class='muted'>未記。食完即加。</li>";
      return;
    }
    arr.forEach(function (x) {
      var li = document.createElement("li");
      li.innerHTML = "<span><span class='muted'>" + x.meal + "</span> " + x.text + "</span>";
      var d = document.createElement("button");
      d.className = "del";
      d.textContent = "刪";
      d.onclick = function () {
        var s = st();
        s.foods = (s.foods || []).filter(function (f) {
          return f.id !== x.id;
        });
        save(s);
        renderFood();
      };
      li.appendChild(d);
      list.appendChild(li);
    });
  }
  function addFood(text) {
    text = (text || document.getElementById("food").value || "").trim();
    if (!text) return;
    var s = st();
    s.foods.push({
      id: Date.now() + "-" + Math.random().toString(16).slice(2),
      date: hkDate(),
      meal: meal,
      text: text
    });
    s.foods = s.foods.slice(-400);
    save(s);
    document.getElementById("food").value = "";
    renderFood();
  }
  function payload() {
    var s = st(),
      sc = latestScan(s) || {},
      p = s.profile || {};
    var day = { Sun: "恢復", Mon: "滑步", Tue: "Pivot", Wed: "架勢", Thu: "環繞", Fri: "刺拳", Sat: "移動" }[wd()] || "";
    return {
      date: hkDate(),
      weekday: wd(),
      todaySkill: day,
      heightCm: Number(document.getElementById("h").value || p.heightCm || 168),
      boxingTargetKg: Number(document.getElementById("t").value || p.targetKg || 54.5),
      scan: sc,
      lastKg: s.lastKg || sc.kg,
      foodsToday: todayFoods(s),
      journeyRemark: (s.remarks || {})[hkDate()] || document.getElementById("remark").value || "",
      lastRun: (s.runs || []).slice(-1)[0] || null,
      program: "每日 30 分：洛馬 15 + A-E 15。禁止帶氧熱身。"
    };
  }
  function localReport(d) {
    var kg = d.lastKg,
      tgt = d.boxingTargetKg,
      foods =
        d.foodsToday
          .map(function (x) {
            return x.meal + x.text;
          })
          .join("、") || "未記食";
    var r = d.journeyRemark || "無 remark";
    var gap = kg && tgt ? (Number(kg) - Number(tgt)).toFixed(2) : "?";
    return [
      "1) 而家狀態",
      kg ? "體重 " + kg + " kg，距目標 " + tgt + " kg 差 " + gap + " kg。" : "仍未入今日磅。",
      "Remark：" + r,
      "",
      "2) 目標",
      "外圍型守肌、慢落水。體脂低唔好猜飢。",
      "",
      "3) 飲食",
      "今日：" + foods + "。練完熱小米粥 + 蛋白。",
      "",
      "4) 9 分鐘跑",
      d.lastRun ? "已有距離。只係分析。" : "本週測一次即可。",
      "",
      "5) 訓練",
      "今日：" + d.todaySkill + " · 洛馬 15 + A-E 15。超哥唔好帶氧。"
    ].join("\n");
  }
  async function llm(d) {
    var key = (document.getElementById("key").value || localStorage.getItem("yipmma-openrouter-key") || "").trim();
    if (key) localStorage.setItem("yipmma-openrouter-key", key);
    if (!key) return { ok: true, text: localReport(d), via: "local" };
    var sys =
      "你是香港私教。繁中口語。" +
      d.heightCm +
      "cm 外圍拳擊。每日洛馬 15 + A-E 15。禁止帶氧熱身。五段：狀態(包 remark)、目標、飲食、9分鐘、訓練。守肌肉。";
    try {
      var res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + key,
          "HTTP-Referer": "https://yip-lgtm.github.io/yipmma/",
          "X-Title": "outboxing stance"
        },
        body: JSON.stringify({
          model: "minimax/minimax-m3:free",
          max_tokens: 1200,
          temperature: 0.4,
          messages: [
            { role: "system", content: sys },
            { role: "user", content: JSON.stringify(d) }
          ]
        })
      });
      var j = await res.json();
      var text = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      if (!res.ok) return { ok: false, error: (j.error && j.error.message) || "OpenRouter " + res.status };
      if (!text) return { ok: false, error: "OpenRouter empty" };
      return { ok: true, text: text.trim(), via: "llm" };
    } catch (e) {
      return { ok: true, text: localReport(d) + "\n\n(網路失敗)", via: "local" };
    }
  }
  document.getElementById("saveProf").onclick = function () {
    var s = st();
    s.profile = s.profile || {};
    s.profile.heightCm = num("h") || 168;
    s.profile.targetKg = num("t") || 54.5;
    s.profile.boxingTargetKg = s.profile.targetKg;
    save(s);
  };
  document.getElementById("saveScan").onclick = saveScan;
  document.getElementById("addFood").onclick = function () {
    addFood();
  };
  document.getElementById("food").addEventListener("keydown", function (e) {
    if (e.key === "Enter") addFood();
  });
  document.getElementById("saveRemark").onclick = function () {
    var s = st();
    s.remarks = s.remarks || {};
    s.remarks[hkDate()] = document.getElementById("remark").value.trim();
    save(s);
    document.getElementById("remarkOk").textContent = "已保存 " + hkDate();
  };
  document.getElementById("go").onclick = async function () {
    document.getElementById("err").textContent = "";
    document.getElementById("go").textContent = "分析中…";
    var s = st();
    s.remarks = s.remarks || {};
    s.remarks[hkDate()] = document.getElementById("remark").value.trim();
    save(s);
    var r = await llm(payload());
    document.getElementById("go").textContent = "產生今日報告";
    if (!r.ok) {
      document.getElementById("err").textContent = r.error;
      return;
    }
    document.getElementById("report").textContent = r.text;
    s = st();
    s.reports = [{ date: hkDate(), text: r.text, via: r.via }].concat(s.reports || []).slice(0, 20);
    save(s);
  };
  document.getElementById("pushBtn").onclick = function () {
    pushBackup(pack(st()), false);
  };
  document.getElementById("key").value = localStorage.getItem("yipmma-openrouter-key") || "";
  document.getElementById("ghToken").value = localStorage.getItem("yipmma-gh-token") || "";
  document.getElementById("ghRepo").value = localStorage.getItem("yipmma-gh-repo") || "yip-lgtm/yipmma-data";
  document.getElementById("ghPath").value = localStorage.getItem("yipmma-gh-path") || "backup/data.json";
  document.getElementById("ghStatus").textContent = localStorage.getItem("yipmma-gh-status") || "";
  var s0 = st();
  document.getElementById("remark").value = (s0.remarks || {})[hkDate()] || "";
  var lastR = (s0.reports || [])[0];
  if (lastR && lastR.date === hkDate()) document.getElementById("report").textContent = lastR.text;
  renderMeals();
  renderChips();
  renderFood();
  paintScan();
})();
