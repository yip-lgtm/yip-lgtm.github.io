(function () {
  function killCardio(root) {
    if (!root) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var n;
    while ((n = w.nextNode())) {
      var t = n.nodeValue;
      if (!t) continue;
      var x = t;
      if (x === "有氧") x = "環繞";
      else if (x.indexOf("有氧＋塑形") !== -1) x = x.replace("有氧＋塑形", "環繞＋塑形");
      else if (x.indexOf("Zone 2 堆恢復") !== -1) x = "星期四取消有氧。上半環繞／Pivot／刺拳。";
      else if (x.indexOf("單車／橢圓機 → 單樆") !== -1) x = "空地／鏡前 → 單樆";
      else if (x.indexOf("進入區") !== -1) x = x.replace("進入區", "進入 · 彈跳架勢").replace("單車／橢圓機", "空地");
      else if (x.indexOf("Zone 2 上段") !== -1) x = x.replace("Zone 2 上段", "技術 · 環繞").replace("單車／橢圓機", "空地");
      else if (x.indexOf("Zone 2 下段") !== -1) x = x.replace("Zone 2 下段", "應用 · Pivot").replace("單車／橢圓機", "空地");
      if (x !== t) n.nodeValue = x;
    }
  }
  function forceSkillSession() {
    var links = document.querySelectorAll('a[href*="session"]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var href = a.getAttribute("href") || "";
      if (/run=/.test(href) || /run=/.test(a.search || "")) continue;
      a.setAttribute("href", "/yipmma/session/?v=mc24");
    }
  }
  function enhance() {
    killCardio(document.body);
    forceSkillSession();
  }
  setTimeout(enhance, 150);
  setTimeout(enhance, 600);
  setTimeout(enhance, 1600);
  setInterval(enhance, 2500);
  document.addEventListener("click", function () {
    setTimeout(enhance, 50);
  });
})();
