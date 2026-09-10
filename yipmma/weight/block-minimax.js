(function () {
  var FREE = [
    "nvidia/nemotron-3-super-120b-a12b:free",
    "google/gemma-4-31b-it:free",
    "inclusionai/ling-3.0-flash-sante:free",
    "nvidia/nemotron-3.5-lightning:free"
  ];
  var orig = window.fetch;
  window.fetch = function (url, opt) {
    opt = opt || {};
    var u = String(url || "");
    if (u.indexOf("openrouter.ai") !== -1 && opt.body && typeof opt.body === "string") {
      try {
        var b = JSON.parse(opt.body);
        var m = String(b.model || "");
        if (!m || m.indexOf("minimax") !== -1 || m === "openrouter/free" || FREE.indexOf(m) === -1) {
          b.model = FREE[0];
          opt = Object.assign({}, opt, { body: JSON.stringify(b) });
        }
      } catch (e) {}
    }
    return orig.call(this, url, opt).then(function (res) {
      return res.clone().json().then(function (j) {
        var msg = (j && j.error && j.error.message) || "";
        if (msg.indexOf("unavailable for free") !== -1 || msg.indexOf("minimax") !== -1) {
          var b2;
          try { b2 = JSON.parse(opt.body || "{}"); } catch (e) { b2 = {}; }
          var cur = b2.model || "";
          var idx = FREE.indexOf(cur);
          b2.model = FREE[(idx + 1) % FREE.length];
          return orig.call(window, url, Object.assign({}, opt, { body: JSON.stringify(b2) }));
        }
        return res;
      }).catch(function () { return res; });
    });
  };
})();
