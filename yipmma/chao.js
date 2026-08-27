(function () {
  var extra = [
    { id: "bZnnjK4bQuM", title: "今日練上身兩動作 09:00" },
    { id: "CcxLaHBQ904", title: "今日練上身兩動作 09:30" }
  ];
  var foodTitle = "超哥：做完立即食南瓜小米粥";
  var foodBody =
    "做完立即食南瓜小米粥。小米補脾胃；9 點到 11 點係脾經當令，效果最佳。所以一定要 9 點鐘健身升陽，10 點鐘食小米粥。粥要淡、熱、易消化，再補蛋白。";
  var SKILL = [
    { name: "架勢", gif: "stance.gif" },
    { name: "滑步", gif: "shuffle.gif" },
    { name: "Pivot", gif: "pivot.gif" },
    { name: "架勢", gif: "stance.gif" },
    { name: "環繞", gif: "ring.gif" },
    { name: "刺拳", gif: "jab.gif" },
    { name: "刺拳", gif: "jab.gif" }
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
  function gifForLabel(t) {
    if (/環繞/.test(t)) return "ring.gif";
    if (/滑步/.test(t)) return "shuffle.gif";
    if (/Pivot|轉角/.test(t)) return "pivot.gif";
    if (/架勢/.test(t)) return "stance.gif";
    if (/空拳|刺拳/.test(t)) return "jab.gif";
    if (/技術/.test(t)) return skillToday().gif;
    return null;
  }
  function injectGif() {
    if (!isSession()) {
      var stale = document.getElementById("yip-skill-gif");
      if (stale) stale.remove();
      return;
    }
    var h = document.querySelector("#root h1");
    if (!h) return;
    var gif = gifForLabel(h.textContent || "");
    var old = document.getElementById("yip-skill-gif");
    if (!gif) {
      if (old) old.remove();
      return;
    }
    if (old && old.getAttribute("data-src") === gif) return;
    if (old) old.remove();
    var img = document.createElement("img");
    img.id = "yip-skill-gif";
    img.alt = "";
    img.setAttribute("data-src", gif);
    img.src = "/yipmma/skills/" + gif;
    img.style.cssText =
      "display:block;width:100%;max-height:240px;object-fit:contain;background:#000;border-radius:12px;margin:12px auto 0";
    if (h.parentNode) h.parentNode.insertBefore(img, h.nextSibling);
  }
  function forceSkillSession() {
    var links = document.querySelectorAll('a[href*="session"]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var href = a.getAttribute("href") || "";
      if (/run=/.test(href) || /run=/.test(a.search || "")) continue;
      a.setAttribute("href", "/yipmma/session/?v=skill2");
      if (a.getAttribute("data-hard")) continue;
      a.setAttribute("data-hard", "1");
      a.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        location.href = "/yipmma/session/?v=skill2";
      }, true);
    }
    if (isSession() && document.getElementById("root") && !document.getElementById("app")) {
      var h = document.querySelector("#root h1");
      if (h && !/技術/.test(h.textContent || "") && !location.search.includes("stay=1")) {
        location.replace("/yipmma/session/?v=skill2");
      }
    }
  }
  function enhanceHome() {
    var sk = skillToday();
    var cards = document.querySelectorAll("p");
    for (var c = 0; c < cards.length; c++) {
      var p = cards[c];
      if (p.getAttribute("data-skill-line")) continue;
      if (!p.textContent) continue;
      if (/堆恢復|下機即|上肢塑形|空拳節奏|步頻波|引體、胸|先做外圍|熱身後先做|主課內連續/.test(p.textContent)) {
        var line = document.createElement("p");
        line.setAttribute("data-skill-line", "1");
        line.className = p.className;
        line.style.marginTop = "8px";
        line.textContent =
          "今日技術已計入 30 分鐘主課：" + sk.name + "（開始訓練後，熱身完即做，跟 GIF）。";
        if (p.parentNode) p.parentNode.insertBefore(line, p.nextSibling);
        break;
      }
    }
  }
  function enhanceFood() {
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
        a.className = "text-sm text-fg underline decoration-border underline-offset-4";
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
      if (t.indexOf("練完立即食熱小米粥") !== -1 || t.indexOf("小米健脾，脾主肌肉") !== -1) {
        nodes[n].textContent = foodBody;
      }
    }
  }
  function enhance() {
    enhanceFood();
    enhanceHome();
    injectGif();
    forceSkillSession();
  }
  setTimeout(enhance, 200);
  setTimeout(enhance, 800);
  setTimeout(enhance, 1600);
  setInterval(enhance, 1500);
  window.addEventListener("hashchange", function () {
    setTimeout(enhance, 300);
  });
})();
