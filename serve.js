// node serve.js

import fs from 'fs'
import http from 'http'

const folder = 'a'
const port = 1234
const types = {
  css: 'text/css',
  html: 'text/html',
  txt: 'text/plain',
  ico: 'image/x-icon',
  js: 'application/javascript'
}

function prepare (request, response) {
  const file = folder + request.url
  const path = fs.existsSync(file) && fs.statSync(file).isFile() ? file : folder + '/x.html'
  const type = types[path.split('.').pop()]
  if (type) response.writeHead(200, {'content-type': type})
  fs.createReadStream(path).pipe(response)
}

http.createServer((request, response) => prepare(request, response)).listen(port)

console.log('localhost:' + port)