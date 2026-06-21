import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT = process.argv[2];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist", "--no-sandbox", "--window-size=1280,720"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errs = [];
page.on("pageerror", (e) => errs.push("[pageerror] " + e.message));
page.on("console", (m) => { if (m.type() === "error" && !/404|Failed to load resource/.test(m.text())) errs.push("[console.error] " + m.text()); });

await page.goto("http://localhost:3000/", { waitUntil: "networkidle2" });
await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => /^\s*FIGHT\s*$/i.test(b.textContent))?.click());
await sleep(7000); // load assets + intro -> FIGHT

// drive a sequence of moves
const seq = ["d", "d", "f", "j", "u", "k", "l", "o", "p", "h", "i", "Shift", "q"];
for (const k of seq) { await page.keyboard.down(k); await sleep(120); await page.keyboard.up(k); await sleep(160); }
// hold forward + fireball to try to catch a projectile mid-flight
await page.keyboard.press("f");
await sleep(250);
await page.screenshot({ path: OUT });

const hud = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").match(/PLAYER 1.{0,40}/)?.[0]);
console.log("hud:", hud);
console.log("errors:", errs.length ? errs.slice(0, 10).join("\n") : "NONE");
await browser.close();
