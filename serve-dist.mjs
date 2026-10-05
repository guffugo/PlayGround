import { createServer } from 'node:http'
import { readFileSync, statSync, existsSync } from 'node:fs'
import { resolve, join, extname } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(process.argv[2] || join(process.cwd(), 'dist'))
const port = Number(process.env.PORT || 3000)

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
}

const server = createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost')
    let path = resolve(root, '.' + decodeURIComponent(url.pathname))
    if (path !== root && !path.startsWith(root + '/')) {
      res.writeHead(404); res.end('Not found'); return
    }
    try {
      if (statSync(path).isDirectory()) path = join(path, 'index.html')
    } catch {
      res.writeHead(404); res.end('Not found'); return
    }
    if (!existsSync(path)) { res.writeHead(404); res.end('Not found'); return }
    res.setHeader('Content-Type', mime[extname(path)] || 'application/octet-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.end(readFileSync(path))
  } catch {
    res.writeHead(404); res.end('Not found')
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Serving ${root} on port ${port}`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => server.close(() => process.exit(0)))
}

if (process.argv[1] && import.meta.url !== pathToFileURL(process.argv[1]).href) {
  // imported; nothing else to do
}
