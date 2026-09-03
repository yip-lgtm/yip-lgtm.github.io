(function () {
  var MAP = {
    "有氧＋塑形": "洛馬 · 環繞",
    "有氧": "環繞",
    "Zone 2 堆恢復，下機即做引體四件套。": "走弧唔走直線。取消 Zone 2。後半 A–E 各 3 組。",
    "單車／橢圓機 → 單槓": "空地／鏡前 → 單槓",
    "單車／橢圓機": "空地"
  };
  function rewrite() {
    if (!document.body) return;
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var n;
    while ((n = w.nextNode())) {
      var t = n.nodeValue;
      if (!t) continue;
      var x = t;
      for (var k in MAP) if (x.indexOf(k) !== -1) x = x.split(k).join(MAP[k]);
      if (x !== t) n.nodeValue = x;
    }
  }
  function hijack() {
    document.addEventListener(
      "click",
      function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        var a = t.closest("a");
        var label = ((a && a.textContent) || t.textContent || "").replace(/\s+/g, "");
        var href = (a && (a.getAttribute("href") || "")) || "";
        if (/week/.test(href) || label.indexOf("週期") !== -1) {
          e.preventDefault();
          location.href = "/yipmma/week/?v=mc36";
        } else if (/weight/.test(href) || label.indexOf("體重") !== -1) {
          e.preventDefault();
          location.href = "/yipmma/weight/?v=mc33";
        } else if (/session/.test(href) || label.indexOf("開始訓練") !== -1 || label.indexOf("訓練") !== -1) {
          if (!/run=/.test(href) && !/run=/.test(location.search)) {
            e.preventDefault();
            location.href = "/yipmma/session/?v=mc36";
          }
        }
      },
      true
    );
  }
  hijack();
  rewrite();
  setInterval(rewrite, 800);
})();
