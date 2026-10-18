const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = '/Users/veernagda/.gemini/antigravity/brain/b16c9f6b-05c0-4402-928e-521c6830d8fa';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function capture() {
  console.log('Launching headless Chrome for multi-screen iPhone capture...');
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9240',
    '--disable-gpu',
    '--ignore-certificate-errors',
    'https://localhost:4173/'
  ]);

  await sleep(2000);

  http.get('http://127.0.0.1:9240/json', (res) => {
    let body = '';
    res.on('data', (c) => (body += c));
    res.on('end', async () => {
      const tabs = JSON.parse(body);
      const pageTab = tabs.find((t) => t.url.includes('localhost')) || tabs[0];
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
        console.log('Connected to CDP. Setting iPhone device metrics (390 x 844)...');
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

        // Helper to take screenshot
        const takePic = async (filename) => {
          const res = await send('Page.captureScreenshot', { format: 'png' });
          const buf = Buffer.from(res.data, 'base64');
          const tmpPath = path.join('/tmp', filename);
          const artPath = path.join(ARTIFACT_DIR, filename);
          fs.writeFileSync(tmpPath, buf);
          fs.writeFileSync(artPath, buf);
          console.log(`Saved screenshot: ${filename} (both in /tmp and artifact dir)`);
        };

        // Helper to click bottom tab
        const clickTab = async (label) => {
          console.log(`Clicking tab: "${label}"...`);
          const res = await send('Runtime.evaluate', {
            expression: `
              (() => {
                const btns = Array.from(document.querySelectorAll('nav button'));
                const btn = btns.find(b => b.textContent.includes('${label}'));
                if (btn) {
                  btn.click();
                  return { success: true, text: btn.textContent.trim() };
                }
                return { success: false, available: btns.map(b => b.textContent.trim()) };
              })()
            `,
            returnByValue: true
          });
          console.log(`Tab click result for ${label}:`, res.result.value);
          await sleep(1000);
        };

        // 1. Dashboard Light
        console.log('Capturing: 01_dashboard_light.png');
        await send('Runtime.evaluate', {
          expression: `
            localStorage.setItem('vitallens_theme', 'light');
            document.documentElement.classList.remove('dark');
            window.scrollTo(0, 0);
          `
        });
        await sleep(500);
        await takePic('01_dashboard_light.png');

        // 2. Dashboard Dark
        console.log('Capturing: 02_dashboard_dark.png');
        await send('Runtime.evaluate', {
          expression: `
            localStorage.setItem('vitallens_theme', 'dark');
            document.documentElement.classList.add('dark');
            window.scrollTo(0, 0);
          `
        });
        await sleep(500);
        await takePic('02_dashboard_dark.png');

        // Reset to Light mode for the rest of clinical flow
        await send('Runtime.evaluate', {
          expression: `
            localStorage.setItem('vitallens_theme', 'light');
            document.documentElement.classList.remove('dark');
            window.scrollTo(0, 0);
          `
        });
        await sleep(400);

        // 3. Measure (Tab 2: scan-finger)
        await clickTab('Measure');
        await takePic('03_measure_light.png');

        // 4. Biofeedback Pacer (Tab 3: breathing)
        await clickTab('Pacer');
        await takePic('04_pacer_light.png');

        // 5. Records (Tab 4: history)
        await clickTab('Records');
        await takePic('05_records_light.png');

        // 6. Consult (Tab 5: assistant)
        await clickTab('Consult');
        await takePic('06_consult_light.png');

        // 7. Settings (Header button)
        console.log('Navigating to Settings...');
        const setRes = await send('Runtime.evaluate', {
          expression: `
            (() => {
              const btn = document.querySelector('header button[aria-label="Settings"]');
              if (btn) {
                btn.click();
                return { success: true };
              }
              return { success: false };
            })()
          `,
          returnByValue: true
        });
        console.log('Settings click result:', setRes.result.value);
        await sleep(1000);
        await takePic('07_settings_light.png');

        // 8. Methodology & About (Tab in Desktop or back to Home then About)
        console.log('Navigating to About...');
        await clickTab('Today');
        await sleep(500);
        await send('Runtime.evaluate', {
          expression: `
            (() => {
              const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Clinical & DSP Pipeline Specification'));
              if (btn) {
                btn.click();
                return { success: true };
              }
              return { success: false };
            })()
          `,
          returnByValue: true
        });
        await sleep(1000);
        await takePic('08_about_light.png');

        console.log('All screen screenshots captured successfully!');
        chrome.kill();
        process.exit(0);
      };
    });
  });
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
