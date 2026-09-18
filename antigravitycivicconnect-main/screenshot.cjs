const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const pages = [
    { name: '1_Landing_Page', url: 'http://localhost:5173/' },
    { name: '2_Login_Register', url: 'http://localhost:5173/login' },
    { name: '3_Complaint_Submission', url: 'http://localhost:5173/report' },
    { name: '4_Admin_Dashboard', url: 'http://localhost:5173/admin/dashboard', requiresAdmin: true },
    { name: '5_Complaint_Tracking', url: 'http://localhost:5173/track' }
  ];

  for (const p of pages) {
    if (p.requiresAdmin) {
      try {
        await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.evaluate(() => {
          localStorage.setItem('cc_admin_user', JSON.stringify({ id: 'admin1', name: 'Admin', email: 'admin@civicconnect.com' }));
          localStorage.setItem('cc_admin_token', 'fake-token');
        });
      } catch (e) {
        console.log("Error setting admin:", e.message);
      }
    }

    try {
      await page.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise(r => setTimeout(r, 3000));
      await page.screenshot({ path: `${p.name}.png`, fullPage: true });
      console.log(`Saved screenshot for ${p.name}`);
    } catch (e) {
      console.log(`Failed to load ${p.name}:`, e.message);
    }
  }

  await browser.close();
})();
