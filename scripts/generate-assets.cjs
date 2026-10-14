'use strict';
// Code-native artwork; no external images, fonts or network requests.
const fs = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require('playwright');
(async () => {
  const root = path.resolve(__dirname, '..');
  const artwork = await fs.readFile(path.join(root, 'docs/assets/icon.svg'), 'utf8');
  const browser = await chromium.launch({headless: true});
  try {
    const page = await browser.newPage({deviceScaleFactor: 1});
    await fs.mkdir(path.join(root, 'extension/icons'), {recursive: true});
    for (const size of [16, 32, 48, 128]) {
      await page.setViewportSize({width: size, height: size});
      await page.setContent(`<style>html,body{margin:0;background:transparent}svg{width:100vw;height:100vh;display:block}</style>${artwork}`);
      await page.screenshot({path: path.join(root, `extension/icons/icon${size}.png`), omitBackground: true});
    }
    await page.setViewportSize({width: 440, height: 280});
    await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;width:440px;height:280px;padding:32px;background:#0d1117;color:#e6edf3;font-family:Arial,sans-serif}svg{width:84px;height:84px;margin-left:-10px;margin-top:-10px}h1{font-size:26px;line-height:1.16;margin:6px 0 14px;letter-spacing:-.6px}p{font-size:15px;color:#a6b3c4;line-height:1.5;margin:0}b{color:#58a6ff}</style>${artwork}<h1>GitHub PR File Filter</h1><p>Focus your code review.<br><b>Hide tests. Filter paths. Keep exceptions.</b></p>`);
    await page.screenshot({path: path.join(root, 'docs/assets/store-promo-440x280.png')});
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
