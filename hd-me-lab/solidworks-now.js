(function () {
  if (!window.ME || !Array.isArray(ME.tools)) return;
  var t = ME.tools.find(function (x) { return x.slug === "solidworks"; });
  if (!t) return;
  t.hdLink = "EME3212 / EME4279";
  t.why = "2026-09-21 S0：快捷鍵先於 Ribbon。S / D / 中鍵視圖練到反射，再重畫 A1 DXF+STL。";
  t.path = [
    "S0 滑鼠 + S/D + 視圖鍵（今堂）",
    "Sketch：L C R A T；全黑 Fully Defined",
    "Boss-Extrude → Cut-Extrude 階梯",
    "Drawing 出圖、Section、DXF",
    "Save As STL；Customize Shift+D"
  ];
  t.lessons = [
    {
      id: "sw-0",
      title: "S0 快捷鍵 · 15 分鐘操",
      minutes: 15,
      steps: [
        "中鍵旋轉、Shift+中鍵平移、F 看晒、Esc 取消、Enter 重複",
        "S = Shortcut Bar；D = 確認綠剜。流程 S → 改數 → D",
        "Space 視圖盒；Ctrl+7 isometric；Ctrl+8 Normal To",
        "L 線、C 圓、R 矩形、A 弧、T Trim",
        "操：MMGS 新 Part → R 80x50 全黑 → Extrude 10 → 頂面 C Ø20 Cut 穿 → Ctrl+S"
      ]
    },
    {
      id: "sw-1",
      title: "S1 Boss + Cut 階梯",
      minutes: 30,
      steps: [
        "Front Plane Sketch；單位 MMGS",
        "封閉 profile 才可 Extrude；藍線 = 未 Fully Defined",
        "Cut 掙灰 = 未 Exit Sketch 或 profile 開放",
        "預覽黃箭嘴指住要剪走的料；反咗就 Reverse"
      ]
    },
    {
      id: "sw-2",
      title: "S2 出 DXF / STL（A1）",
      minutes: 25,
      steps: [
        "Drawing：先 Front 再 Projected 再 Section",
        "Save As DXF；Sketch 都可 Save As DXF",
        "Save As STL；粗細 follow 講課",
        "A1 件用快捷鍵重畫一次計時"
      ]
    }
  ];
  t.commands = [
    { cmd: "S", does: "Shortcut Bar" },
    { cmd: "D", does: "確認 PropertyManager" },
    { cmd: "Ctrl+8", does: "Normal To" },
    { cmd: "Ctrl+7", does: "Isometric" },
    { cmd: "Space", does: "視圖取向" },
    { cmd: "F", does: "Zoom to Fit" },
    { cmd: "L / C / R / T", does: "線 / 圓 / 矩形 / Trim" },
    { cmd: "Ctrl+B", does: "Rebuild" }
  ];
})();
