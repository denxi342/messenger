async function run() {
  const listRes = await fetch('http://127.0.0.1:9222/json/list');
  const targets = await listRes.json();
  const pageTarget = targets.find(t => t.type === 'page' && t.url.includes('5173'));
  if (!pageTarget) {
    console.error('No page target found');
    return;
  }
  const wsUrl = pageTarget.webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);

  let id = 1;
  const send = (method, params = {}) => {
    return new Promise((resolve) => {
      const msgId = id++;
      ws.send(JSON.stringify({ id: msgId, method, params }));
      const listener = (event) => {
        const data = JSON.parse(event.data);
        if (data.id === msgId) {
          ws.removeEventListener('message', listener);
          resolve(data.result);
        }
      };
      ws.addEventListener('message', listener);
    });
  };

  ws.onopen = async () => {
    console.log('Connected to CDP');
    await send('Runtime.enable');
    await send('Console.enable');
    await send('Network.enable');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const { method, params } = data;
      if (method === 'Console.messageAdded') {
        console.log('[CON-MSG]', params.message.level, params.message.text);
      } else if (method === 'Runtime.consoleAPICalled') {
        const args = params.args.map(a => a.value || JSON.stringify(a)).join(' ');
        console.log('[CONSOLE]', params.type, args);
      } else if (method === 'Runtime.exceptionThrown') {
        console.log('[EXCEPTION]', JSON.stringify(params.exceptionDetails, null, 2));
      } else if (method === 'Network.requestWillBeSent') {
        console.log('[NET-REQ]', params.request.method, params.request.url);
      } else if (method === 'Network.responseReceived') {
        console.log('[NET-RES]', params.response.status, params.response.url);
      }
    };

    // 1. Close overlay if open
    console.log('Preparing page state...');
    await send('Runtime.evaluate', {
      expression: `
        (function() {
          const closeBtn = document.querySelector('.settings-close-btn');
          if (closeBtn) {
            closeBtn.click();
            return 'Closed existing profile overlay';
          }
          return 'No profile overlay open';
        })()
      `
    });

    // Wait 1 second for UI transitions
    await new Promise(r => setTimeout(r, 1000));

    // 2. Fresh click on profile icon
    console.log('Clicking profile button...');
    const clickRes = await send('Runtime.evaluate', {
      expression: `
        (function() {
          const btn = document.querySelector('.my-profile-btn');
          if (!btn) return 'Profile button not found!';
          btn.click();
          return 'Profile button clicked!';
        })()
      `
    });
    console.log('Click result:', clickRes.result.value);

    // Wait 5 seconds to capture all events
    await new Promise(r => setTimeout(r, 5000));
    console.log('Done capturing.');
    ws.close();
  };
}
run().catch(console.error);
