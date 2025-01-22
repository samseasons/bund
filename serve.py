# python3 serve.py

from http.server import SimpleHTTPRequestHandler as handler
import socketserver

folder = 'a'
port = 1234
types = {
  'css': 'text/css',
  'html': 'text/html',
  'ico': 'image/x-icon',
  'js': 'application/javascript',
  'json': 'application/json'
}

class prepare (handler):
    def do_GET (self):
        try:
            ftype = self.path.split('.')[-1]
            if ftype in types:
                self.send_response(200)
                self.send_header('content-type', types[ftype])
                self.end_headers()
                with open(folder + self.path, 'rb') as file:
                    self.wfile.write(file.read())
                return
        except:
            next
        self.path = folder + '/x.html'
        return handler.do_GET(self)
    def log_message (*args):
        pass

socketserver.TCPServer.allow_reuse_address = True
serve = socketserver.TCPServer(('', port), prepare)
print('localhost:' + str(port))
serve.serve_forever()
