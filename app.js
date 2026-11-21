// First-party script for the landing page. No network calls, no storage, no tracking.
// Everything here is an enhancement: with scripts off the page still reads and works.
(() => {
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

  // --- Hero: the phone and the two chips follow the pointer at different depths. ---
  const hero = document.querySelector(".hero");
  const phone = document.querySelector(".stage .phone");
  const chipQ = document.querySelector(".float.q");
  const chipA = document.querySelector(".float.a");
  if (hero && phone && finePointer && !calm) {
    let targetX = 0, targetY = 0, x = 0, y = 0, frame = 0;
    const step = () => {
      // Ease toward the pointer so the motion never jumps, then stop when it has arrived.
      x += (targetX - x) * 0.09;
      y += (targetY - y) * 0.09;
      phone.style.transform = `perspective(1100px) rotateY(${(x * 9).toFixed(3)}deg) rotateX(${(-y * 7).toFixed(3)}deg) translate3d(${(x * 6).toFixed(2)}px, ${(y * 6).toFixed(2)}px, 0)`;
      if (chipQ) chipQ.style.transform = `translate3d(${(x * -26).toFixed(2)}px, ${(y * -20).toFixed(2)}px, 0)`;
      if (chipA) chipA.style.transform = `translate3d(${(x * 34).toFixed(2)}px, ${(y * 26).toFixed(2)}px, 0)`;
      frame = Math.abs(targetX - x) + Math.abs(targetY - y) > 0.0015 ? requestAnimationFrame(step) : 0;
    };
    const aim = (nx, ny) => {
      targetX = Math.max(-1, Math.min(1, nx));
      targetY = Math.max(-1, Math.min(1, ny));
      if (!frame) frame = requestAnimationFrame(step);
    };
    hero.addEventListener("pointermove", (event) => {
      const box = hero.getBoundingClientRect();
      aim(((event.clientX - box.left) / box.width - 0.5) * 2, ((event.clientY - box.top) / box.height - 0.5) * 2);
    }, { passive: true });
    hero.addEventListener("pointerleave", () => aim(0, 0));
  }

  // --- Cards: a soft light follows the pointer across each card. ---
  if (finePointer) {
    for (const card of document.querySelectorAll(".card")) {
      card.addEventListener("pointermove", (event) => {
        const box = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${event.clientX - box.left}px`);
        card.style.setProperty("--my", `${event.clientY - box.top}px`);
      }, { passive: true });
    }
  }

  // --- The "can we afford it?" demo. Sample numbers, and the same rule the app uses:
  // a purchase lowers the balance on its day and every day after, so it is judged by the
  // lowest balance from that day on. ---
  const slider = document.getElementById("amount");
  const chart = document.getElementById("demo-chart");
  if (!slider || !chart) return;

  const DAYS = 30, BUY_DAY = 3, CUSHION = 300, START = 3400, DAILY = 70;
  const EVENTS = { 6: -120, 10: -1450, 13: 2600, 18: -75, 27: 2600 };
  const base = [];
  for (let day = 0, balance = START; day < DAYS; day++) {
    if (day > 0) balance -= DAILY;
    balance += EVENTS[day] || 0;
    base.push(balance);
  }
  const money = (n) => (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-US");
  const dayLabel = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  const weekday = (() => {
    const d = new Date();
    d.setDate(d.getDate() + BUY_DAY);
    return d.toLocaleDateString("en-US", { weekday: "long" });
  })();

  const W = 640, H = 210, TOP = 14, BOTTOM = 26, MAX = 5200, MIN = -1200;
  const px = (day) => (day / (DAYS - 1)) * W;
  const py = (value) => TOP + (1 - (Math.max(MIN, Math.min(MAX, value)) - MIN) / (MAX - MIN)) * (H - TOP - BOTTOM);
  const path = (values) => values.map((v, i) => `${i ? "L" : "M"}${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join(" ");

  const el = (id) => document.getElementById(id);
  const line = el("demo-line"), ghost = el("demo-ghost"), area = el("demo-area"), dot = el("demo-dot");
  const out = el("amount-out"), verdict = el("verdict"), title = el("verdict-title"), detail = el("verdict-detail");
  el("demo-zero").setAttribute("y1", py(0)); el("demo-zero").setAttribute("y2", py(0));
  el("demo-cushion").setAttribute("y1", py(CUSHION)); el("demo-cushion").setAttribute("y2", py(CUSHION));
  el("demo-buy").setAttribute("x1", px(BUY_DAY)); el("demo-buy").setAttribute("x2", px(BUY_DAY));
  el("demo-buy-label").setAttribute("x", px(BUY_DAY) + 6);
  el("demo-buy-label").textContent = weekday;
  el("amount-label").textContent = `A purchase this ${weekday}`;
  ghost.setAttribute("d", path(base));

  const render = () => {
    const cost = Number(slider.value);
    const after = base.map((v, day) => (day >= BUY_DAY ? v - cost : v));
    let low = BUY_DAY;
    for (let day = BUY_DAY; day < DAYS; day++) if (after[day] < after[low]) low = day;
    const lowest = after[low];
    const state = lowest < 0 ? "short" : lowest < CUSHION ? "tight" : "ok";
    const fits = Math.max(0, Math.min(...base.slice(BUY_DAY)) - CUSHION);

    out.textContent = money(cost);
    slider.style.setProperty("--fill", `${(cost / Number(slider.max)) * 100}%`);
    slider.setAttribute("aria-valuetext", `${money(cost)}, ${state === "ok" ? "comfortable" : state}`);
    line.setAttribute("d", path(after));
    area.setAttribute("d", `${path(after)} L${W} ${py(MIN)} L0 ${py(MIN)} Z`);
    dot.setAttribute("cx", px(low)); dot.setAttribute("cy", py(lowest));
    verdict.dataset.state = state;
    title.textContent = state === "ok" ? "Yes, comfortably" : state === "tight" ? "Yes, but tight" : "Not this week";
    detail.textContent = state === "short"
      ? `Short by ${money(-lowest)} on ${dayLabel(low)}. Up to ${money(fits)} fits.`
      : `Lowest balance after: ${money(lowest)} on ${dayLabel(low)}. Up to ${money(fits)} fits.`;
  };
  slider.addEventListener("input", render);
  render();
  chart.classList.add("is-live");
})();
