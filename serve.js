// node serve.js

import fs from 'fs'
import http from 'http'

const folder = 'a'
const port = 1234
const types = {
  css: 'text/css',
  html: 'text/html',
  ico: 'image/x-icon',
  js: 'application/javascript'
}

function prepare (request, response) {
  let file = folder + request.url
  if (!(fs.existsSync(file) && fs.lstatSync(file).isFile())) file = folder + '/x.html'
  const type = types[file.split('.').pop()]
  if (type) response.writeHead(200, {'content-type': type})
  fs.createReadStream(file).pipe(response)
}

http.createServer((request, response) => prepare(request, response)).listen(port)

console.log('localhost:' + port)