const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) {
    console.log("Error during goto (maybe aborted by vite):", e.message);
  }
  
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: `1_Landing_Page.png`, fullPage: true });
  console.log(`Saved screenshot for 1_Landing_Page`);

  await browser.close();
})();
