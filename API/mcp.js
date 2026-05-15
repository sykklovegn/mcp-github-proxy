import axios from 'axios';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET 请求 - 根据 query 参数判断
  if (req.method === 'GET') {
    // 测试工具列表: /api/mcp?test=list-tools
    if (req.query.test === 'list-tools') {
      return res.status(200).json({
        tools: [
          {
            name: 'fetch_markdown',
            description: 'Fetch a GitHub file and return as Markdown',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string', description: 'GitHub URL to fetch' }
              },
              required: ['url']
            }
          }
        ]
      });
    }

    // 默认健康检查
    return res.status(200).json({
      status: 'ok',
      message: 'MCP GitHub Proxy Server',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/api/mcp',
        testTools: '/api/mcp?test=list-tools',
        testFetch: '/api/mcp?test=fetch&url=https://...'
      }
    });
  }

  // POST 请求 - MCP 协议
  if (req.method === 'POST') {
    const body = req.body;

    // 列出工具
    if (body.method === 'tools/list' || req.query.action === 'list-tools') {
      return res.status(200).json({
        tools: [
          {
            name: 'fetch_markdown',
            description: 'Fetch a GitHub file and return as Markdown',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string', description: 'GitHub URL to fetch' }
              },
              required: ['url']
            }
          }
        ]
      });
    }

    // 调用工具
    if (body.method === 'tools/call' || body.name) {
      const toolName = body.params?.name || body.name;
      const toolArgs = body.params?.arguments || body.arguments;

      if (toolName === 'fetch_markdown') {
        try {
          let url = toolArgs.url;
          
          if (url.includes('github.com') && url.includes('/blob/')) {
            url = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
          }

          const response = await axios.get(url, {
            headers: {
              'Authorization': process.env.GITHUB_TOKEN ? `token ${process.env.GITHUB_TOKEN}` : undefined,
              'User-Agent': 'MCP-Proxy'
            },
            timeout: 15000
          });

          return res.status(200).json({
            content: [{ type: 'text', text: String(response.data) }]
          });
        } catch (error) {
          return res.status(500).json({
            error: { 
              code: error.response?.status || 500, 
              message: error.message,
              url: toolArgs.url
            }
          });
        }
      }

      return res.status(400).json({
        error: { code: 400, message: `Unknown tool: ${toolName}` }
      });
    }
  }

  return res.status(400).json({ 
    error: { code: 400, message: 'Invalid request' } 
  });
}
