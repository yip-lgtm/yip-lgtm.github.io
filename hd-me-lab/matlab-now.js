(function () {
  if (!window.ME || !Array.isArray(ME.tools)) return;
  var t = ME.tools.find(function (x) { return x.slug === "matlab"; });
  if (!t) return;
  t.hdLink = "EME3211 / 4212 / 3228 / 4208 / 4213";
  t.why = "2026-09-17 自學進行中：未裝桌面版。瀏覽器 Onramp → plot → F=kx。矩陣、ODE、Simulink 質量–彈簧–阻尼對 HD 數學 II／電學／控制有用。";
  t.path = [
    "開戶 + MATLAB Onramp（唔使裝）",
    "linspace／plot／單位（mm→m）",
    "矩陣運算、A\\b、腳本 vs 函數",
    "ode45：二階拆一階 x1=x, x2=v",
    "Simulink：Gain、Integrator、Scope 對照 ode45"
  ];
  t.lessons = [
    {
      id: "ml-0",
      title: "S0 開戶 · 唔使裝",
      minutes: 20,
      steps: [
        "mathworks.com/mwaccount/register → 電郵驗證",
        "免費課 MATLAB Onramp（瀏覽器內建 MATLAB）",
        "Command Window 試：2+3、a=4、a*10",
        "今晚只做 Onramp 第 1–4 節；唔開 Simulink"
      ]
    },
    {
      id: "ml-1",
      title: "S1 工作區同矩陣",
      minutes: 30,
      steps: [
        "clc 清窗、clear 清變數、close all 關圖、whos 睇表",
        "A = [1 2; 3 4];  b = [5; 6];",
        "x = A \\ b   % 解 Ax=b，唔好 inv(A)*b 做習慣",
        "A(1,:) 第一行；A(:,2) 第二列"
      ]
    },
    {
      id: "ml-2",
      title: "S2 繪圖 + F=kx",
      minutes: 45,
      steps: [
        "t = linspace(0, 4*pi, 500); plot(t, sin(t)); hold on; plot(t, cos(t))",
        "每次圖都要 xlabel ylabel title grid on legend",
        "彈簧：k=800 N/m；x_mm=[0 2 4 6 8]；x=x_mm/1000；F=k*x",
        "手核：8 mm → 0.008 m → F=6.4 N。單位錯就全堂錯",
        "存 s02_sine.m 同 s02_spring.m"
      ]
    },
    {
      id: "ml-3",
      title: "S3 ode45 質量–彈簧–阻尼",
      minutes: 40,
      steps: [
        "二階一定拆：x1=x, x2=v",
        "f = @(t,y) [y(2); -(k/m)*y(1) - (c/m)*y(2)]",
        "[t,y] = ode45(f, [0 8], [0.04; 0]); plot(t, y(:,1)*1000)",
        "改 c 三次：欠阻尼／臨界／過阻尼"
      ]
    },
    {
      id: "ml-4",
      title: "S4 Simulink 第一個模型",
      minutes: 35,
      steps: [
        "先做完 Simulink Onramp（約 2 小時）",
        "Blank Model：兩個 Integrator xdd→v、v→x",
        "Gain(-k)、Gain(-c) 回授到 Sum；Gain(1/m)",
        "Scope 睇 x；曲線要同 ode45 重叠先算過關"
      ]
    }
  ];
  t.commands = [
    { cmd: "help plot", does: "函式說明" },
    { cmd: "linspace", does: "平均切時間軸" },
    { cmd: "A\\b", does: "解線性方程" },
    { cmd: "doc ode45", does: "瀏覽器文件" },
    { cmd: "simulink", does: "開庫" },
    { cmd: "ode45", does: "數值積分" }
  ];
})();
