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
      a.setAttribute("href", "/yipmma/session/?v=mc23");
      if (a.getAttribute("data-hard")) continue;
      a.setAttribute("data-hard", "1");
      a.addEventListener(
        "click",
        function (e) {
          e.preventDefault();
          e.stopPropagation();
          location.href = "/yipmma/session/?v=mc23";
        },
        true
      );
    }
    if (isSession() && document.getElementById("root") && !document.getElementById("app")) {
      location.replace("/yipmma/session/?v=mc23");
    }
  }
  function enhanceMotto() {
    if (document.getElementById("chao-nocardio")) return;
    var box = document.createElement("div");
    box.id = "chao-nocardio";
    box.style.marginTop = "12px";
    box.innerHTML =
      '<p style="font-size:11px;letter-spacing:.12em;color:#8a8a8a">超哥訓勉</p><p>千萬不要做任何帶氧，會令今天的 3 個動作效果減半。特別係瘦人。意志被帶氧熱身消耗，重訓就唔係最佳狀態。除非天賦異纈、無窮戰意。最好淘寶鐵架放屋企，連運費唔使 1000，加埋約 4000，一年回本。唔使搭車，對住架唔會偷懶。</p>';
    var skill = document.querySelector("[data-skill-line]");
    if (skill && skill.parentNode) skill.parentNode.insertBefore(box, skill.nextSibling);
  }
  function enhanceHome() {
    var sk = skillToday();
    var wanted =
      "今日技術：" +
      sk.name +
      "。上半洛馬技術，星期四取消有氧改環繞。超哥：千萬唔好做帶氧，效果減半。後半 A–E 各 3。";
    var paras = document.querySelectorAll("p, li");
    var copies = [];
    var i;
    for (i = 0; i < paras.length; i++) {
      var tx = paras[i].textContent || "";
      if (tx.indexOf("後半塑形") !== -1 || tx.indexOf("今日技術已計入") !== -1 || tx.indexOf("上半 15") !== -1 || tx.indexOf("上半洛馬") !== -1) copies.push(paras[i]);
    }
    if (copies.length) {
      copies[0].textContent = wanted;
      copies[0].setAttribute("data-skill-line", "1");
      for (i = 1; i < copies.length; i++) {
        if (copies[i].parentNode) copies[i].parentNode.removeChild(copies[i]);
      }
    }
    for (i = 0; i < paras.length; i++) {
      var n = paras[i];
      var s = n.textContent || "";
      if (s.indexOf("每日後半固定") !== -1 || s.indexOf("每日後半 15") !== -1 || s.indexOf("每日：上半") !== -1) {
        n.textContent = "超哥：千萬唔好做帶氧。星期四改環繞技術。上半洛馬，後半 A–E。";
      }
    }
    enhanceMotto();
  }
  function enhanceFood() {
    var links = document.querySelectorAll('a[href*="youtube.com/shorts/"]');
    for (var i = 0; i < links.length; i++) {
      var id = links[i].href.split("/").pop();
      if (id) links[i].href = "https://youtu.be/" + id.replace(/\?.*$/, "");
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
      if (t.indexOf("練完立即食熱小米粥") !== -1 || t.indexOf("小米健脾，脾主肌肉") !== -1) {
        nodes[n].textContent = foodBody;
      }
    }
  }
  function enhance() {
    enhanceFood();
    enhanceHome();
    enhanceMotto();
    forceSkillSession();
  }
  setTimeout(enhance, 200);
  setTimeout(enhance, 800);
  setTimeout(enhance, 2000);
})();
