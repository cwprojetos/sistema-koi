import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => {
      if (msg.type() === 'error') console.log('BROWSER_ERROR:', msg.text());
    });
    page.on('pageerror', error => {
      console.log('PAGE_ERROR:', error.message);
    });
    const response = await page.goto('http://localhost:8080');
    if (!response.ok()) console.log('HTTP_ERROR:', response.status(), response.statusText());
    
    // wait a bit in case errors happen asynchronously
    await new Promise(r => setTimeout(r, 2000));
    await browser.close();
  } catch(e) { console.error('PUPPETEER EXCEPTION:', e.message); }
})();
