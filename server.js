const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY || '';

const server = http.createServer(function(req, res) {
  // CORS headers — allow any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/chat') {
    let body = '';
    req.on('data', function(chunk) { body += chunk; });
    req.on('end', function() {
      if (!API_KEY) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API key no configurada' }));
        return;
      }

      const payload = Buffer.from(body);
      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': payload.length,
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01'
        }
      };

      const proxyReq = https.request(options, function(proxyRes) {
        let data = '';
        proxyRes.on('data', function(chunk) { data += chunk; });
        proxyRes.on('end', function() {
          res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
          res.end(data);
        });
      });

      proxyReq.on('error', function(e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      });

      proxyReq.write(payload);
      proxyReq.end();
    });
    return;
  }

  // Health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'Serenai Proxy' }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, function() {
  console.log('Serenai proxy running on port ' + PORT);
});
