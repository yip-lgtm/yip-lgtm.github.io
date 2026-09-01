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
  function wd() {
    return new Date()
      .toLocaleString("en-US", { timeZone: "Asia/Hong_Kong", weekday: "short" })
      .slice(0, 3);
  }
  function replaceText(root, map) {
    if (!root) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var n;
    while ((n = w.nextNode())) {
      var t = n.nodeValue;
      if (!t) continue;
      var x = t;
      for (var k in map) {
        if (x.indexOf(k) !== -1) x = x.split(k).join(map[k]);
      }
      if (x !== t) n.nodeValue = x;
    }
  }
  function globalCopy() {
    var map = {
      "有氧＋塑形": "環繞＋塑形",
      "Zone 2 堆恢復，下機即做引體四件套。": "星期四取消有氧主課。上半環繞／Pivot／刺拳。",
      "單車／橢圓機 → 單槓": "空地／鏡前 → 單槓",
      "單車／橢圓機 → 單樆": "空地／鏡前 → 單槓",
      "單車／橢圓機": "空地",
      "每月第一及第三個星期二通常封閉保養":
        "健身室 365 運作，沒有保養休息日。只休農曆年初一、初二",
      "習慣不斷。徒手張力一樣可以塑形，只要動作慢、接近力竭。":
        "洛馬：腳先於手。Pivot 慢轉 45 度，轉完停穩。超哥：唔好做帶氧。",
      "Pallof 同木斬練出拳力線。塑形組與旋轉分開：引體用背，唔用腰借力。":
        "洛馬：腳先於手。Pivot 慢轉 45 度，轉完停穩。超哥：唔好做帶氧。",
      "公園單槓或家居": "空地／鏡前 → 單槓",
      "公園單樆或家居": "空地／鏡前 → 單槓"
    };
    if (wd() === "Tue" && !isCny()) {
      map["旋轉＋塑形"] = "洛馬 · Pivot";
      map["保養日徒手塑形"] = "洛馬 · Pivot";
      map["年初家居日"] = "洛馬 · Pivot";
      map["低強度"] = "中強度";
      map["33:15"] = "30:00";
      map["拉力器傳力，再做引體／胸／二頭／腹。"] =
        "上半 15 分 Pivot（慢轉 45 度，唔催）。後半自由選 A–E 各 3 組。";
      map["無器械日：步行 + 引體替代／伏地／彎舉／腹。"] =
        "上半 15 分 Pivot（慢轉 45 度，唔催）。後半自由選 A–E 各 3 組。";
    }
    replaceText(document.body, map);
    replaceText(document.body, { "有氧": "環繞" });
  }
  function hideClosedBanner() {
    if (isCny()) return;
    var nodes = document.querySelectorAll("p, div, h2");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var tx = (el.textContent || "").replace(/\s+/g, "");
      if (!tx) continue;
      if (tx.indexOf("今日照常開放") !== -1 || tx.indexOf("保養休息") !== -1) {
        if (tx.length < 60) el.style.display = "none";
      }
    }
  }
  function forceSkillSession() {
    var links = document.querySelectorAll('a[href*="session"]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var href = a.getAttribute("href") || "";
      if (/run=/.test(href) || /run=/.test(a.search || "")) continue;
      a.setAttribute("href", "/yipmma/session/?v=mc27");
    }
  }
  function enhance() {
    globalCopy();
    hideClosedBanner();
    forceSkillSession();
  }
  setTimeout(enhance, 80);
  setTimeout(enhance, 400);
  setTimeout(enhance, 1200);
  setInterval(enhance, 2000);
  document.addEventListener("click", function () {
    setTimeout(enhance, 40);
  });
})();
