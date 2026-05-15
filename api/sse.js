export default function handler(req, res) {
  // 设置 SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Accel-Buffering', 'no');

  // 发送初始连接事件
  res.write('event: open\n');
  res.write(`data: ${JSON.stringify({ type: 'connection_established', timestamp: Date.now() })}\n\n`);

  // 定期发送心跳
  const heartbeat = setInterval(() => {
    res.write('event: ping\n');
    res.write(`data: ${JSON.stringify({ type: 'ping', timestamp: Date.now() })}\n\n`);
  }, 15000); // 每 15 秒一次心跳

  // 客户端断开时清理
  req.on('close', () => {
    clearInterval(heartbeat);
    res.end();
  });

  req.on('error', () => {
    clearInterval(heartbeat);
    res.end();
  });
}
