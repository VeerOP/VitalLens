const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function main() {
  const url = process.argv[2] || 'https://localhost:4173/';
  const outputPath = process.argv[3] || '/tmp/real_iphone_390.png';
  const width = parseInt(process.argv[4] || '390', 10);
  const height = parseInt(process.argv[5] || '844', 10);

  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9232',
    '--disable-gpu',
    '--ignore-certificate-errors',
    url
  ]);

  await new Promise((r) => setTimeout(r, 1800));

  http.get('http://127.0.0.1:9232/json', (res) => {
    let body = '';
    res.on('data', (c) => (body += c));
    res.on('end', () => {
      const tabs = JSON.parse(body);
      const pageTab = tabs.find((t) => t.url.includes('localhost')) || tabs[0];
      const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

      ws.onopen = () => {
        // Set real mobile device metrics
        ws.send(
          JSON.stringify({
            id: 1,
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
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        if (msg.id === 1) {
          // Verify viewport metrics
          ws.send(
            JSON.stringify({
              id: 2,
              method: 'Runtime.evaluate',
              params: {
                expression: `({
                  innerWidth: window.innerWidth,
                  scrollWidth: document.documentElement.scrollWidth,
                  hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
                  headerWidth: document.querySelector("header")?.offsetWidth,
                  cardWidth: document.querySelector(".clinical-card")?.offsetWidth,
                  tabCount: document.querySelectorAll("nav.md\\\\:hidden button").length,
                  allTabsRight: Array.from(document.querySelectorAll("nav.md\\\\:hidden button")).map(b => ({ text: b.innerText.trim(), right: b.getBoundingClientRect().right }))
                })`,
                returnByValue: true,
              },
            })
          );
        }

        if (msg.id === 2) {
          console.log('Mobile Emulation Metrics:', JSON.stringify(msg.result.result.value, null, 2));
          // Capture screenshot
          ws.send(
            JSON.stringify({
              id: 3,
              method: 'Page.captureScreenshot',
              params: { format: 'png' },
            })
          );
        }

        if (msg.id === 3) {
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
