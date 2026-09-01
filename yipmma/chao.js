(function () {
  var LOMA = "/yipmma/session/?v=mc29";
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
  function isStandalone() {
    return !!document.getElementById("app");
  }
  function bounceReactSession() {
    if (isStandalone() || isCny()) return;
    var path = location.pathname || "";
    var body = document.body ? document.body.innerText || "" : "";
    var reactClosed =
      body.indexOf("外出步行") !== -1 ||
      body.indexOf("踝＋髓") !== -1 ||
      body.indexOf("踝 + 髓") !== -1;
    var onSession = /\/session\/?$/.test(path) || /session/.test(path + location.hash);
    if (reactClosed || (onSession && document.getElementById("root") && !isStandalone())) {
      location.replace(LOMA);
    }
  }
  function hijackStart() {
    document.addEventListener(
      "click",
      function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        var a = t.closest("a");
        var label = ((t.textContent || "") + " " + ((a && a.textContent) || "")).replace(/\s+/g, "");
        var href = (a && (a.getAttribute("href") || a.href)) || "";
        var goSession =
          /session/.test(href) && !/run=/.test(href) && !/run=/.test(location.search);
        var goStart = label.indexOf("開始訓練") !== -1 || label.indexOf("再練一次") !== -1;
        if (goSession || goStart) {
          e.preventDefault();
          e.stopPropagation();
          location.href = LOMA;
        }
      },
      true
    );
  }
  function replaceText(root, map) {
    if (!root) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var n;
    while ((n = w.nextNode())) {
      var t = n.nodeValue;
      if (!t) continue;
      var x = t;
      for (var k in map) if (x.indexOf(k) !== -1) x = x.split(k).join(map[k]);
      if (x !== t) n.nodeValue = x;
    }
  }
  function copy() {
    if (isStandalone() || isCny()) return;
    replaceText(document.body, {
      "旋轉＋塑形": "洛馬 · Pivot",
      "保養日徒手塑形": "洛馬 · Pivot",
      "年初家居日": "洛馬 · Pivot",
      "有氧＋塑形": "環繞＋塑形",
      "低強度": "中強度",
      "33:15": "30:00",
      "公園單槓或家居": "空地／鏡前 → 單槓",
      "公園單樆或家居": "空地／鏡前 → 單槓",
      "拉力器傳力，再做引體／胸／二頭／腹。":
        "上半 15 分 Pivot（慢轉 45 度，唔催）。後半 A–E 各 3 組。",
      "無器械日：步行 + 引體替代／伏地／彎舉／腹。":
        "上半 15 分 Pivot（慢轉 45 度，唔催）。後半 A–E 各 3 組。",
      "習慣不斷。徒手張力一樣可以塑形，只要動作慢、接近力竭。":
        "洛馬：腳先於手。Pivot 慢轉 45 度。超哥：唔好做帶氧。",
      "每月第一及第三個星期二":
        "健身室 365 運作，只休農曆年初一、初二"
    });
  }
  function enhance() {
    bounceReactSession();
    copy();
  }
  hijackStart();
  setTimeout(enhance, 50);
  setTimeout(enhance, 300);
  setTimeout(enhance, 900);
  setInterval(enhance, 1500);
})();
