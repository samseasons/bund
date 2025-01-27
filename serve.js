// node serve.js

import fs from 'fs'
import http from 'http'

let folder = 'a'
let port = 1234
let types = {
  css: 'text/css',
  html: 'text/html',
  ico: 'image/x-icon',
  js: 'application/javascript',
  json: 'application/json'
}

function prepare (request, response) {
  let file = folder + request.url
  let path = fs.existsSync(file) && fs.statSync(file).isFile() ? file : folder + '/x.html'
  let type = types[path.split('.').pop()]
  if (type) response.writeHead(200, {'content-type': type})
  fs.createReadStream(path).pipe(response)
}

http.createServer((request, response) => prepare(request, response)).listen(port)

console.log('localhost:' + port)