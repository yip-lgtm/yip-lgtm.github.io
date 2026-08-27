(function () {
  var extra = [
    { id: "bZnnjK4bQuM", title: "今日練上身兩動作 09:00" },
    { id: "CcxLaHBQ904", title: "今日練上身兩動作 09:30" }
  ];
  var foodTitle = "超哥：做完立即食南瓜小米粥";
  var foodBody =
    "做完立即食南瓜小米粥。小米補脾胃；9 點到 11 點係脾經當令，效果最佳。所以一定要 9 點鐘健身升陽，10 點鐘食小米粥。粥要淡、熱、易消化，再補蛋白。";
  function enhance() {
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
      if (
        t === "超哥：練完即食小米粥" ||
        t === "超哥：練完即食熱小米粥"
      ) {
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
  setTimeout(enhance, 200);
  setTimeout(enhance, 800);
  setInterval(enhance, 2000);
})();
