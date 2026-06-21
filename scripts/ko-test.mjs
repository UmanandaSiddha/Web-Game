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

// poll until the round is in 'fight', then chip CPU down and KO it
const waitFight = async () => { for (let i=0;i<40;i++){ if(await page.evaluate(()=>window.__wg?.match?.current?.phase==="fight")) return; await sleep(150);} };
await waitFight();
// deterministic KO: the loop ends the round (and calls die()) when health hits 0
await page.evaluate(() => { window.__wg.f2.health = 0; });
for (let i=0;i<30 && !(await page.evaluate(()=>window.__wg?.f2?.dead));i++) await sleep(100);
const dead = await page.evaluate(()=>window.__wg?.f2?.dead);

// freeze round-end so the death animation can fully settle, then capture the final pose
await page.evaluate(() => { window.__wg.match.current.phaseT = 999; });
await sleep(3000);
await page.screenshot({ path: T + "webgame-death.png" });
const death = await page.evaluate(() => ({ dead: window.__wg.f2.dead, rootY: +window.__wg.f2.position.y.toFixed(3), phase: window.__wg.match.current.phase }));
// release the freeze to let the next round start
await page.evaluate(() => { window.__wg.match.current.phaseT = 0; });

// wait for next round to start (phase back to intro/fight)
for (let i=0;i<40;i++){ const p=await page.evaluate(()=>window.__wg.match.current.phase); if(p==="intro"||p==="fight") break; await sleep(200); }
await sleep(400);
await page.screenshot({ path: T + "webgame-restart.png" });
const restart = await page.evaluate(() => ({ f2dead: window.__wg.f2.dead, rootY: +window.__wg.f2.position.y.toFixed(3), state: window.__wg.f2.state, phase: window.__wg.match.current.phase }));

console.log("deadDetected:", dead);
console.log("DEATH:", JSON.stringify(death));
console.log("RESTART:", JSON.stringify(restart));
console.log("errors:", errs.length ? errs.slice(0,5).join(" | ") : "NONE");
await browser.close();
