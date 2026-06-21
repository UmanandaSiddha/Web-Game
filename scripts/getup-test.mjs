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

// KO the CPU; round 2 loser (f2) should rise with the get-up animation
await page.evaluate(() => { window.__wg.f2.health = 0; });
// wait until round 2 begins
for (let i=0;i<60;i++){ if(await page.evaluate(()=>window.__wg.match.current.round===2)) break; await sleep(100); }

// capture three frames across the get-up
const shots = [];
for (let i=0;i<3;i++){
  await sleep(i===0?150:450);
  await page.screenshot({ path: T + `webgame-getup${i}.png` });
  shots.push(await page.evaluate(()=>({ f2state: window.__wg.f2.state, phase: window.__wg.match.current.phase })));
}
console.log("frames:", JSON.stringify(shots));
console.log("errors:", errs.length ? errs.slice(0,5).join(" | ") : "NONE");
await browser.close();
