import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const T = "C:\\Users\\Lenovo\\AppData\\Local\\Temp\\";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist", "--no-sandbox", "--window-size=1280,720"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
page.on("console", (m) => { if (m.type() === "error" && !/404|Failed to load resource/.test(m.text())) errs.push(m.text()); });

await page.goto("http://localhost:3000/", { waitUntil: "networkidle2" });
await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => /^\s*FIGHT\s*$/i.test(b.textContent))?.click());
await sleep(8000);
for (let i=0;i<40;i++){ if(await page.evaluate(()=>window.__wg?.match?.current?.phase==="fight")) break; await sleep(150); }

// natural KO -> let roundEnd count down (no freeze) so the wipe fires on its own
await page.evaluate(() => { window.__wg.f2.health = 0; });

// watch for the wipe overlay appearing, and sample whether it's actually opaque
let sawWipe = false, blackiest = 0, capturedBlack = false;
for (let i = 0; i < 80; i++) { // ~8s
  const s = await page.evaluate(() => {
    const el = document.querySelector(".animate-roundwipe");
    const op = el ? +getComputedStyle(el).opacity : 0;
    return { present: !!el, op, phase: window.__wg.match.current.phase, round: window.__wg.match.current.round };
  });
  if (s.present) sawWipe = true;
  if (s.op > blackiest) blackiest = s.op;
  if (s.op > 0.9 && !capturedBlack) { await page.screenshot({ path: T + "webgame-wipe.png" }); capturedBlack = true; }
  if (s.round === 2 && s.phase === "fight") break;
  await sleep(100);
}
await sleep(300);
await page.screenshot({ path: T + "webgame-round2.png" });
const final = await page.evaluate(() => ({ round: window.__wg.match.current.round, f2state: window.__wg.f2.state, f2dead: window.__wg.f2.dead }));

console.log("sawWipe:", sawWipe, "peakOpacity:", blackiest.toFixed(2), "capturedBlack:", capturedBlack);
console.log("FINAL:", JSON.stringify(final));
console.log("errors:", errs.length ? errs.slice(0,5).join(" | ") : "NONE");
await browser.close();
