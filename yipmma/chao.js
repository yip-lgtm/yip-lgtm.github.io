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
  function forceSkillSession() {
    var links = document.querySelectorAll('a[href*="session"]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var href = a.getAttribute("href") || "";
      if (/run=/.test(href) || /run=/.test(a.search || "")) continue;
      a.setAttribute("href", "/yipmma/session/?v=mc22");
      if (a.getAttribute("data-hard")) continue;
      a.setAttribute("data-hard", "1");
      a.addEventListener(
        "click",
        function (e) {
          e.preventDefault();
          e.stopPropagation();
          location.href = "/yipmma/session/?v=mc22";
        },
        true
      );
    }
    if (isSession() && document.getElementById("root") && !document.getElementById("app")) {
      location.replace("/yipmma/session/?v=mc22");
    }
  }
  function enhanceHome() {
    var sk = skillToday();
    var wanted =
      "今日技術：" + sk.name + "。上半 15 分鐘洛馬（腳先於手）。後半自由選 A–E，每項 3 次。D 腹改抗打：呼氣收、死蟲、側平板，唔好叫人打肚。";
    var paras = document.querySelectorAll("p, li");
    var copies = [];
    var i;
    for (i = 0; i < paras.length; i++) {
      var tx = paras[i].textContent || "";
      if (tx.indexOf("後半塑形") !== -1 || tx.indexOf("今日技術已計入") !== -1 || tx.indexOf("上半 15") !== -1) copies.push(paras[i]);
    }
    if (copies.length) {
      copies[0].textContent = wanted;
      copies[0].setAttribute("data-skill-line", "1");
      for (i = 1; i < copies.length; i++) {
        if (copies[i].parentNode) copies[i].parentNode.removeChild(copies[i]);
      }
    } else {
      for (i = 0; i < paras.length; i++) {
        var p = paras[i];
        if (p.getAttribute("data-skill-line")) continue;
        var t = p.textContent || "";
        if (!t || /今日技術/.test(t)) continue;
        if (!/堆恢復|下機即|上肢塑形|空拳節奏|步頻波|引體、胸|先做外圍|主課內連續/.test(t)) continue;
        p.setAttribute("data-skill-line", "1");
        var line = document.createElement("p");
        line.setAttribute("data-skill-line", "1");
        line.className = p.className;
        line.style.marginTop = "8px";
        line.textContent = wanted;
        if (p.parentNode) p.parentNode.insertBefore(line, p.nextSibling);
        break;
      }
    }
    for (i = 0; i < paras.length; i++) {
      var n = paras[i];
      var s = n.textContent || "";
      if (s.indexOf("每日後半固定") !== -1 || s.indexOf("每日後半 15") !== -1 || s.indexOf("每日：上半") !== -1) {
        n.textContent =
          "每日：上半洛馬 15 分；後半 MC A–E 各 3 組。D 腹＝抗打呼吸＋死蟲／側平板。";
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
  }
  function enhance() {
    enhanceFood();
    enhanceHome();
    forceSkillSession();
  }
  setTimeout(enhance, 200);
  setTimeout(enhance, 800);
  setTimeout(enhance, 2000);
})();
