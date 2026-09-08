(function () {
  var WEEK = "/yipmma/week/?v=mc41";
  var WEIGHT = "/yipmma/weight/?v=mc40";
  var HOF = "/yipmma/wimhof/?v=mc41";
  var SESSION = "/yipmma/session/?v=mc36";
  var HOME = "/yipmma/?v=mc41";
  var p = location.pathname || "";
  if (/\/wimhof\/?$/.test(p) && document.getElementById("root")) {
    location.replace(HOF);
    return;
  }
  if (/\/week\/?$/.test(p) && document.getElementById("root")) {
    location.replace(WEEK);
    return;
  }
  if (/\/weight\/?$/.test(p) && document.getElementById("root")) {
    location.replace(WEIGHT);
    return;
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
        if (/wimhof/.test(href) || /Hof/i.test(label)) {
          e.preventDefault();
          location.href = HOF;
          return;
        }
        if (/week/.test(href) || label.indexOf("週期") !== -1) {
          e.preventDefault();
          location.href = WEEK;
        } else if (/weight/.test(href) || label.indexOf("體重") !== -1) {
          e.preventDefault();
          location.href = WEIGHT;
        } else if (label.indexOf("開始訓練") !== -1 || (/session/.test(href) && !/wimhof/.test(href))) {
          if (!/run=/.test(href) && !/run=/.test(location.search) && label.indexOf("Hof") === -1) {
            e.preventDefault();
            location.href = SESSION;
          }
        }
      },
      true
    );
  }
  function fixNav() {
    var links = document.querySelectorAll("nav a");
    if (!links.length) return;
    var last = links[links.length - 1];
    if (!last) return;
    var tx = (last.textContent || "").replace(/\s+/g, "");
    if (tx.indexOf("訓練") !== -1 || tx.indexOf("技術") !== -1 || tx.indexOf("Train") !== -1) {
      last.setAttribute("href", HOF);
      last.innerHTML = "Hof<br>5 min";
      last.className = /wimhof/.test(location.pathname) ? "on" : last.className;
    }
  }
  hijack();
  fixNav();
  setInterval(fixNav, 600);
})();
