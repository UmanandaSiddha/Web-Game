import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const URL = "http://localhost:3000/";
const OUT = process.argv[2] || "C:\\Users\\Lenovo\\AppData\\Local\\Temp\\webgame-shot.png";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--enable-unsafe-swiftshader",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--ignore-gpu-blocklist",
    "--no-sandbox",
    "--window-size=1280,720",
  ],
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });

const logs = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
page.on("requestfailed", (r) => logs.push(`[reqfail] ${r.url()} :: ${r.failure()?.errorText}`));

await page.goto(URL, { waitUntil: "networkidle2", timeout: 60000 });
await sleep(500);

// click "VS C.P.U."
const clicked = await page.evaluate(() => {
  const btns = [...document.querySelectorAll("button")];
  const b = btns.find((x) => /^\s*FIGHT\s*$/i.test(x.textContent || "") || /C\.?P\.?U/i.test(x.textContent || ""));
  if (b) {
    b.click();
    return b.textContent;
  }
  return null;
});
console.log("clicked:", clicked);

// wait for assets to load + a few seconds of gameplay (intro -> FIGHT)
await sleep(16000);

// pull a HUD readout from the DOM if present
const hud = await page.evaluate(() => {
  const txt = document.body.innerText.replace(/\s+/g, " ").slice(0, 400);
  const canvas = document.querySelector("canvas");
  return { txt, hasCanvas: !!canvas, w: canvas?.width, h: canvas?.height };
});

await page.screenshot({ path: OUT });

console.log("=== HUD/DOM ===");
console.log(hud);
console.log("=== CONSOLE (last 40) ===");
console.log(logs.slice(-40).join("\n"));

await browser.close();
console.log("screenshot:", OUT);
