import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
const res = await page.evaluate(async () => {
  const u = "/models/fighter1.fbx";
  const out = {};
  try { out.head = (await fetch(u, { method: "HEAD" })).status; } catch (e) { out.head = "ERR " + e.message; }
  try { const r = await fetch(u); out.get = r.status; out.len = (await r.arrayBuffer()).byteLength; } catch (e) { out.get = "ERR " + e.message; }
  return out;
});
console.log(res);
await browser.close();
