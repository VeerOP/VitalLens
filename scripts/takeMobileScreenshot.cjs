const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function main() {
  const url = process.argv[2] || 'https://localhost:4173/';
  const outputPath = process.argv[3] || '/tmp/real_iphone_view.png';
  const width = parseInt(process.argv[4] || '390', 10);
  const height = parseInt(process.argv[5] || '844', 10);

  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9230',
    '--disable-gpu',
    '--ignore-certificate-errors',
    `--window-size=${width},${height}`,
  ]);

  await new Promise((r) => setTimeout(r, 1500));

  http.get('http://127.0.0.1:9230/json', (res) => {
    let body = '';
    res.on('data', (c) => (body += c));
    res.on('end', () => {
      const tabs = JSON.parse(body);
      const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);

      ws.onopen = () => {
        // 1. Enable Page
        ws.send(JSON.stringify({ id: 1, method: 'Page.enable' }));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        if (msg.id === 1) {
          // 2. Set mobile metrics override
          ws.send(
            JSON.stringify({
              id: 2,
              method: 'Emulation.setDeviceMetricsOverride',
              params: {
                width,
                height,
                deviceScaleFactor: 2,
                mobile: true,
                fitWindow: false,
              },
            })
          );
        }

        if (msg.id === 2) {
          // 3. Navigate
          ws.send(JSON.stringify({ id: 3, method: 'Page.navigate', params: { url } }));
        }

        if (msg.method === 'Page.loadEventFired' || msg.id === 3) {
          setTimeout(() => {
            // Check dimensions
            ws.send(
              JSON.stringify({
                id: 4,
                method: 'Runtime.evaluate',
                params: {
                  expression: `({
                    winW: window.innerWidth,
                    winH: window.innerHeight,
                    docW: document.documentElement.clientWidth,
                    scrollW: document.documentElement.scrollWidth,
                    theme: document.documentElement.classList.contains("dark") ? "dark" : "light"
                  })`,
                  returnByValue: true,
                },
              })
            );
          }, 800);
        }

        if (msg.id === 4) {
          console.log('Page Diagnostics:', msg.result.result.value);
          // 4. Capture screenshot
          ws.send(
            JSON.stringify({
              id: 5,
              method: 'Page.captureScreenshot',
              params: { format: 'png' },
            })
          );
        }

        if (msg.id === 5) {
          fs.writeFileSync(outputPath, Buffer.from(msg.result.data, 'base64'));
          console.log(`Saved screenshot to ${outputPath}`);
          chrome.kill();
          process.exit(0);
        }
      };
    });
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
