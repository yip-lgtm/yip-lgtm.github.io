(function () {
  var extra = [
    { id: "bZnnjK4bQuM", title: "今日練上身兩動作 09:00" },
    { id: "CcxLaHBQ904", title: "今日練上身兩動作 09:30" }
  ];
  var foodTitle = "超哥：做完立即食南瓜小米粥";
  var foodBody =
    "做完立即食南瓜小米粥。小米補脾胃；9 點到 11 點係脾經當令，效果最佳。所以一定要 9 點鐘健身升陽，10 點鐘食小米粥。粥要淡、熱、易消化，再補蛋白。";
  var SKILL = [
    { name: "架勢", gif: "stance.gif", cue: "前腳對對手，後腳外開 45 度。重心兩腳之間，可隨時側移。唔鎖死。" },
    { name: "滑步", gif: "shuffle.gif", cue: "碎步交換，幅度細，頭唔晃。隨時可停再刺拳。" },
    { name: "Pivot", gif: "pivot.gif", cue: "前腳為軸，後腳向外划弧 45–90 度。轉完立刻可以刺拳。" },
    { name: "架勢", gif: "stance.gif", cue: "膝微屈，隨時可推地側移。前手可較低準備刺拳，下頷微收。" },
    { name: "環繞", gif: "ring.gif", cue: "走弧唔走直線。向對手弱手外側移動，刺拳付費，3–5 秒轉節奏。" },
    { name: "刺拳", gif: "jab.gif", cue: "肩先、拳後、即收。唔劈。打完側步離開，唔企原位。" },
    { name: "刺拳", gif: "jab.gif", cue: "測距、斷節奏。打直但唔鎖死肘，回收快過打出。" }
  ];
  function wd() {
    return new Date()
      .toLocaleString("en-US", { timeZone: "Asia/Hong_Kong", weekday: "short" })
      .slice(0, 3);
  }
  function skillToday() {
    var map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return SKILL[map[wd()] || 0];
  }
  function isSession() {
    var p = location.pathname + location.hash + location.search;
    return /session/.test(p) && !/(run=true|run=1)/.test(p);
  }
  function fmt(sec) {
    var m = Math.floor(sec / 60),
      s = sec % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }
  function mountSkill() {
    if (!isSession()) return;
    if (document.getElementById("yip-skill")) return;
    var sk = skillToday();
    var box = document.createElement("div");
    box.id = "yip-skill";
    box.style.cssText =
      "max-width:32rem;margin:16px auto 0;padding:16px 16px 8px;border:1px solid #2a2a2a;border-radius:16px;background:#111;color:#fff;position:relative;z-index:40;";
    box.innerHTML =
      '<p style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#8a8a8a;margin:0 0 6px">30 分鐘 · 技術段</p>' +
      '<h2 style="margin:0;font-size:1.35rem">技術 · ' +
      sk.name +
      "</h2>" +
      '<img alt="" src="/yipmma/skills/' +
      sk.gif +
      '" style="display:block;width:100%;max-height:220px;object-fit:contain;background:#000;border-radius:12px;margin:12px 0">' +
      '<p id="yip-skill-clock" style="font-size:3rem;line-height:1;margin:8px 0;letter-spacing:-.04em">02:30</p>' +
      '<p style="color:#c4c4c4;font-size:14px;line-height:1.6;margin:0 0 12px">' +
      sk.cue +
      "</p>" +
      '<button id="yip-skill-btn" type="button" style="width:100%;border:0;border-radius:999px;padding:12px;font:inherit;font-weight:600;background:#fff;color:#000">開始技術 2.5 分鐘</button>' +
      '<button id="yip-skill-skip" type="button" style="width:100%;margin:8px 0 8px;border:1px solid #2a2a2a;border-radius:999px;padding:10px;font:inherit;background:transparent;color:#fff">跳過，入主課</button>';
    var root = document.getElementById("root");
    if (root && root.parentNode) root.parentNode.insertBefore(box, root);
    else document.body.insertBefore(box, document.body.firstChild);
    var left = 150,
      t = null;
    var clock = document.getElementById("yip-skill-clock");
    var btn = document.getElementById("yip-skill-btn");
    function tick() {
      left -= 1;
      if (clock) clock.textContent = fmt(Math.max(0, left));
      if (left <= 0) {
        clearInterval(t);
        t = null;
        box.style.opacity = "0.7";
        if (btn) btn.textContent = "技術完成 · 可開始主課";
      }
    }
    btn.onclick = function () {
      if (t) {
        clearInterval(t);
        t = null;
        btn.textContent = "繼續技術";
        return;
      }
      t = setInterval(tick, 1000);
      btn.textContent = "暫停";
    };
    document.getElementById("yip-skill-skip").onclick = function () {
      if (t) clearInterval(t);
      box.remove();
    };
  }
  function enhance() {
    var links = document.querySelectorAll('a[href*="youtube.com/shorts/"]');
    for (var i = 0; i < links.length; i++) {
      var id = links[i].href.split("/").pop();
      links[i].href = "https://youtu.be/" + id;
    }
    var lists = document.querySelectorAll("ul");
    for (var u = 0; u < lists.length; u++) {
      var ul = lists[u];
      if (!/今日練腳|每日健身/.test(ul.textContent || "")) continue;
      if (ul.getAttribute("data-chao-extra")) continue;
      ul.setAttribute("data-chao-extra", "1");
      for (var e = extra.length - 1; e >= 0; e--) {
        var v = extra[e];
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = "https://youtu.be/" + v.id;
        a.target = "_blank";
        a.rel = "noreferrer";
        a.className =
          "text-sm text-fg underline decoration-border underline-offset-4";
        a.textContent = v.title + " →";
        li.appendChild(a);
        ul.insertBefore(li, ul.firstChild);
      }
    }
    var nodes = document.querySelectorAll("h2, p");
    for (var n = 0; n < nodes.length; n++) {
      var t = nodes[n].textContent || "";
      if (t === "超哥：練完即食小米粥" || t === "超哥：練完即食熱小米粥") {
        nodes[n].textContent = foodTitle;
      }
      if (
        t.indexOf("練完立即食熱小米粥") !== -1 ||
        t.indexOf("小米健脾，脾主肌肉") !== -1
      ) {
        nodes[n].textContent = foodBody;
      }
    }
    var sk = skillToday();
    var cards = document.querySelectorAll("p");
    for (var c = 0; c < cards.length; c++) {
      var p = cards[c];
      if (p.getAttribute("data-skill-line")) continue;
      if (!p.textContent) continue;
      if (
        /堆恢復|下機即|上肢塑形|空拳節奏|步頻波|引體、胸/.test(p.textContent)
      ) {
        var line = document.createElement("p");
        line.setAttribute("data-skill-line", "1");
        line.className = p.className;
        line.style.marginTop = "8px";
        line.textContent =
          "今日技術：" + sk.name + " 2.5 分鐘（計入 30 分鐘課，開始訓練先做）。";
        if (p.parentNode) p.parentNode.insertBefore(line, p.nextSibling);
        break;
      }
    }
    mountSkill();
  }
  setTimeout(enhance, 200);
  setTimeout(enhance, 800);
  setTimeout(enhance, 1600);
  setInterval(enhance, 2500);
  window.addEventListener("hashchange", function () {
    setTimeout(enhance, 300);
  });
})();
