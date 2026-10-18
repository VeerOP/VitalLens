const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = '/Users/veernagda/.gemini/antigravity/brain/b16c9f6b-05c0-4402-928e-521c6830d8fa';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureResults() {
  console.log('Capturing Results Flow with precise mobile tab targeting...');
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9275',
    '--disable-gpu',
    '--ignore-certificate-errors',
    'https://localhost:4173/'
  ]);

  let tabs = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    await sleep(600);
    try {
      tabs = await new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:9275/json', (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => resolve(JSON.parse(body)));
        }).on('error', reject);
      });
      if (tabs && tabs.length > 0) break;
    } catch (e) {
      // retry
    }
  }

  if (!tabs) {
    console.error('Failed to connect to Chrome remote debugging port.');
    chrome.kill();
    process.exit(1);
  }

  const pageTab = tabs.find((t) => t.type === 'page' && t.url.includes('localhost')) || tabs[0];
  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

  let msgId = 1;
  const send = (method, params = {}) => {
    return new Promise((resolve) => {
      const id = msgId++;
      const handler = (evt) => {
        const data = JSON.parse(evt.data);
        if (data.id === id) {
          ws.removeEventListener('message', handler);
          resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  ws.onopen = async () => {
    console.log('Emulating iPhone metrics (390 x 844)...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
      fitWindow: false,
    });

    await send('Page.enable');
    await send('Runtime.enable');
    await sleep(1000);

    const clickMobileTab = async (label) => {
      console.log(`Clicking mobile bottom tab: "${label}"...`);
      const res = await send('Runtime.evaluate', {
        expression: `
          (() => {
            const mobileNav = Array.from(document.querySelectorAll('nav')).find(n => n.classList.contains('md:hidden'));
            if (!mobileNav) return { success: false, reason: 'no mobileNav' };
            const btn = Array.from(mobileNav.querySelectorAll('button')).find(b => b.textContent.includes('${label}'));
            if (btn) {
              btn.click();
              return { success: true, text: btn.textContent.trim() };
            }
            return { success: false, reason: 'no btn' };
          })()
        `,
        returnByValue: true
      });
      console.log(`Result of clicking ${label}:`, res.result.value);
      await sleep(1000);
    };

    // 1. Click Start Fingertip Scan
    console.log('Navigating to Fingertip Scan...');
    await send('Runtime.evaluate', {
      expression: `
        const cardBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Start Fingertip Scan'));
        if (cardBtn) cardBtn.click();
      `
    });
    await sleep(800);

    // 2. Click "Run Signal Benchmark Demo"
    console.log('Triggering Signal Benchmark Demo...');
    await send('Runtime.evaluate', {
      expression: `
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Run Signal Benchmark Demo'));
        if (btn) btn.click();
      `
    });

    // 3. Wait for calculation and rendering of Vitals Assessment
    console.log('Waiting 2.8s for DSP calculations to complete...');
    await sleep(2800);

    // 4. Capture Results Summary screen
    console.log('Capturing Results Summary screen...');
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(res.data, 'base64');
    fs.writeFileSync('/tmp/09_results_summary_light.png', buf);
    fs.writeFileSync(path.join(ARTIFACT_DIR, '09_results_summary_light.png'), buf);
    console.log('Saved 09_results_summary_light.png!');

    // 5. Navigate to Today / Dashboard to verify latest vitals card populated
    console.log('Navigating to Today...');
    await clickMobileTab('Today');

    const resDash = await send('Page.captureScreenshot', { format: 'png' });
    const bufDash = Buffer.from(resDash.data, 'base64');
    fs.writeFileSync('/tmp/10_dashboard_with_vitals.png', bufDash);
    fs.writeFileSync(path.join(ARTIFACT_DIR, '10_dashboard_with_vitals.png'), bufDash);
    console.log('Saved 10_dashboard_with_vitals.png!');

    // 6. Navigate to Records to verify Trend Chart with real data!
    console.log('Navigating to Records...');
    await clickMobileTab('Records');

    const resHist = await send('Page.captureScreenshot', { format: 'png' });
    const bufHist = Buffer.from(resHist.data, 'base64');
    fs.writeFileSync('/tmp/11_records_with_history.png', bufHist);
    fs.writeFileSync(path.join(ARTIFACT_DIR, '11_records_with_history.png'), bufHist);
    console.log('Saved 11_records_with_history.png!');

    console.log('All results flow screenshots captured successfully!');
    chrome.kill();
    process.exit(0);
  };
}

captureResults().catch((err) => {
  console.error(err);
  process.exit(1);
});
