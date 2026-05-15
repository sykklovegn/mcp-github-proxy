import axios from 'axios';

export default async function handler(req, res) {
  // CORS 设置
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 健康检查
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      message: 'MCP Server is running',
      timestamp: new Date().toISOString()
    });
  }

  // 处理 POST 请求
  if (req.method === 'POST') {
    const body = req.body;

    // 列出工具
    if (body.method === 'tools/list' || req.query.action === 'list-tools') {
      return res.status(200).json({
        tools: [
          {
            name: 'fetch_markdown',
            description: 'Fetch a website and return the content as Markdown',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'The URL to fetch'
                }
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

          // 转换 GitHub URL
          if (url.includes('github.com') && url.includes('/blob/')) {
            url = url
              .replace('github.com', 'raw.githubusercontent.com')
              .replace('/blob/', '/');
          }

          const response = await axios.get(url, {
            headers: {
              'Authorization': process.env.GITHUB_TOKEN ? `token ${process.env.GITHUB_TOKEN}` : undefined,
              'Accept': 'application/vnd.github.v3.raw',
              'User-Agent': 'MCP-Proxy'
            },
            timeout: 15000
          });

          return res.status(200).json({
            content: [
              {
                type: 'text',
                text: typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
              }
            ]
          });
        } catch (error) {
          return res.status(500).json({
            error: {
              code: error.response?.status || 500,
              message: error.message
            }
          });
        }
      }

      return res.status(400).json({
        error: {
          code: 400,
          message: `Unknown tool: ${toolName}`
        }
      });
    }
  }

  return res.status(400).json({
    error: {
      code: 400,
      message: 'Invalid request'
    }
  });
}
