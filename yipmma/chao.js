(function () {
  var WEEK = "/yipmma/week/?v=mc34";
  var WEIGHT = "/yipmma/weight/?v=mc33";
  var SESSION = "/yipmma/session/?v=mc30";
  var HOME = "/yipmma/?v=mc34";
  function standalone() {
    return !!document.querySelector(".wrap h1") && !document.getElementById("root");
  }
  function text() {
    return document.body ? document.body.innerText || "" : "";
  }
  function bounceOldWeek() {
    if (standalone()) return;
    var t = text();
    var old =
      t.indexOf("Pallof") !== -1 ||
      t.indexOf("單腳＋塑形") !== -1 ||
      t.indexOf("第 1 回合") !== -1 ||
      t.indexOf("Zone 2") !== -1;
    var onWeek = /\/week/.test(location.pathname + location.hash);
    if (onWeek || old) {
      if (onWeek && old) location.replace(WEEK);
      else if (onWeek && document.getElementById("root")) location.replace(WEEK);
    }
  }
  function hijackNav() {
    document.addEventListener(
      "click",
      function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        var a = t.closest("a");
        var label = ((a && a.textContent) || t.textContent || "").replace(/\s+/g, "");
        var href = (a && (a.getAttribute("href") || a.href)) || "";
        var go = null;
        if (/week/.test(href) || label.indexOf("週期") !== -1) go = WEEK;
        else if (/weight/.test(href) || label.indexOf("體重") !== -1) go = WEIGHT;
        else if (/session/.test(href) || label.indexOf("開始訓練") !== -1 || label.indexOf("訓練") !== -1 || label.indexOf("技術") !== -1)
          go = SESSION;
        else if (label.indexOf("今日") !== -1 && a) go = HOME;
        if (go) {
          e.preventDefault();
          e.stopPropagation();
          location.href = go;
        }
      },
      true
    );
  }
  hijackNav();
  setTimeout(bounceOldWeek, 80);
  setTimeout(bounceOldWeek, 400);
  setTimeout(bounceOldWeek, 1200);
})();
