(function () {
  var CNY = {
    "2025-01-29": 1,
    "2025-01-30": 1,
    "2026-02-17": 1,
    "2026-02-18": 1,
    "2027-02-06": 1,
    "2027-02-07": 1,
    "2028-01-26": 1,
    "2028-01-27": 1,
    "2029-02-13": 1,
    "2029-02-14": 1,
    "2030-02-03": 1,
    "2030-02-04": 1
  };
  function todayKey() {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Hong_Kong" });
  }
  function isCny() {
    return !!CNY[todayKey()];
  }
  function rewrite(root) {
    if (!root) return;
    var cny = isCny();
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var n;
    while ((n = w.nextNode())) {
      var t = n.nodeValue;
      if (!t) continue;
      var x = t;
      if (x === "有氧") x = "環繞";
      else if (x.indexOf("有氧＋塑形") !== -1) x = x.replace("有氧＋塑形", "環繞＋塑形");
      else if (x.indexOf("Zone 2 堆恢復") !== -1) x = "星期四取消有氧。上半環繞／Pivot／刺拳。";
      else if (x.indexOf("單車／橢圓機") !== -1)
        x = x.replace("單車／橢圓機 → 單樆", "空地／鏡前 → 單樆").replace("單車／橢圓機", "空地");
      else if (x.indexOf("進入區") !== -1) x = x.replace("進入區", "進入 · 彈跳架勢");
      else if (x.indexOf("Zone 2 上段") !== -1) x = x.replace("Zone 2 上段", "技術 · 環繞");
      else if (x.indexOf("Zone 2 下段") !== -1) x = x.replace("Zone 2 下段", "應用 · Pivot");
      else if (x.indexOf("每月第一及第三個星期二") !== -1)
        x = "健身室 365 運作，沒有保養休息日。只休農曆年初一、初二。";
      if (!cny) {
        if (x.indexOf("年初家居日") !== -1) x = "旋轉＋塑形";
        else if (x.indexOf("保養日徒手塑形") !== -1) x = "旋轉＋塑形";
        else if (x.indexOf("無器械日") !== -1) x = "拉力器傳力，再做引體／胸／二頭／腹。";
        else if (x.indexOf("公園單樆或家居") !== -1) x = "拉力器 → 單樆";
        else if (x.indexOf("今日照常開放") !== -1) x = "";
        else if (x.indexOf("今日健身室保養休息") !== -1) x = "";
        else if (x.indexOf("健身室全年開。只休農曆") !== -1) x = "";
        else if (x.indexOf("第一／第三個星期二") !== -1) x = "";
        else if (x === "低強度" && (n.parentNode && /星期二/.test((n.parentNode.textContent || "")))) x = "中強度";
      }
      if (x !== t) n.nodeValue = x;
    }
  }
  function hideClosedBanner() {
    if (isCny()) return;
    var cards = document.querySelectorAll("div, section, article");
    for (var i = 0; i < cards.length; i++) {
      var tx = cards[i].textContent || "";
      if (tx.indexOf("今日照常開放") !== -1 || tx.indexOf("保養休息") !== -1) {
        if (tx.length < 80) cards[i].style.display = "none";
      }
    }
  }
  function forceSkillSession() {
    var links = document.querySelectorAll('a[href*="session"]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var href = a.getAttribute("href") || "";
      if (/run=/.test(href) || /run=/.test(a.search || "")) continue;
      a.setAttribute("href", "/yipmma/session/?v=mc26");
    }
  }
  function enhance() {
    rewrite(document.body);
    hideClosedBanner();
    forceSkillSession();
  }
  setTimeout(enhance, 120);
  setTimeout(enhance, 500);
  setTimeout(enhance, 1400);
  setInterval(enhance, 2000);
  document.addEventListener("click", function () {
    setTimeout(enhance, 40);
  });
})();
