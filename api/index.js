import axios from 'axios';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      jsonrpc: '2.0',
      result: {
        protocolVersion: '2024-11-05',
        serverInfo: {
          name: 'mcp-github-proxy',
          version: '1.0.0'
        },
        capabilities: {
          tools: {}
        },
        debug: {
          hasToken: !!process.env.GITHUB_TOKEN,
          tokenPrefix: process.env.GITHUB_TOKEN ? process.env.GITHUB_TOKEN.substring(0, 7) + '...' : 'none'
        }
      }
    });
  }

  if (req.method === 'POST') {
    const body = req.body;

    if (body.method === 'initialize') {
      return res.status(200).json({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: 'mcp-github-proxy',
            version: '1.0.0'
          },
          capabilities: {
            tools: {}
          }
        }
      });
    }

    if (body.method === 'tools/list') {
      return res.status(200).json({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          tools: [
            {
              name: 'fetch_markdown',
              description: 'Fetch a GitHub file and return as Markdown',
              inputSchema: {
                type: 'object',
                properties: {
                  url: { 
                    type: 'string', 
                    description: 'GitHub URL to fetch' 
                  }
                },
                required: ['url']
              }
            }
          ]
        }
      });
    }

    if (body.method === 'tools/call') {
      const { name, arguments: args } = body.params;

      if (name === 'fetch_markdown') {
        try {
          let url = args.url;
          
          // 转换 GitHub URL 为 raw URL
          if (url.includes('github.com') && url.includes('/blob/')) {
            url = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
          }

          console.log('Fetching URL:', url);
          console.log('Has Token:', !!process.env.GITHUB_TOKEN);

          const headers = {
            'User-Agent': 'MCP-Proxy-Bot/1.0',
            'Accept': 'application/vnd.github.v3.raw'
          };

          // 只在有 Token 的情况下添加 Authorization header
          if (process.env.GITHUB_TOKEN) {
            headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
          }

          const response = await axios.get(url, {
            headers: headers,
            timeout: 15000
          });

          return res.status(200).json({
            jsonrpc: '2.0',
            id: body.id,
            result: {
              content: [
                { 
                  type: 'text', 
                  text: String(response.data) 
                }
              ]
            }
          });
        } catch (error) {
          console.error('Fetch error:', error.message);
          console.error('Response:', error.response?.data);
          
          return res.status(200).json({
            jsonrpc: '2.0',
            id: body.id,
            error: {
              code: -32000,
              message: error.message,
              data: {
                url: args.url,
                status: error.response?.status,
                statusText: error.response?.statusText,
                hasToken: !!process.env.GITHUB_TOKEN,
                headers: error.response?.headers
              }
            }
          });
        }
      }

      return res.status(200).json({
        jsonrpc: '2.0',
        id: body.id,
        error: {
          code: -32601,
          message: `Unknown tool: ${name}`
        }
      });
    }

    if (body.method === 'notifications/initialized' || body.method === 'ping') {
      return res.status(200).json({
        jsonrpc: '2.0',
        result: {}
      });
    }
  }

  return res.status(400).json({ 
    error: 'Invalid request',
    method: req.method,
    body: req.body
  });
}
