# python3 serve.py

import socket

folder = 'a'
port = 1234
types = {
    'css': 'text/css',
    'html': 'text/html',
    'ico': 'image/x-icon',
    'js': 'application/javascript'
}

server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
server.bind(('localhost', port))
server.listen()

print('localhost:' + str(port))

while True:
    client = server.accept()[0]
    try:
        file = client.recv(1024).decode()[4:].split(' H')[0]
        ftype = types.get(file.split('.')[-1])
        if not ftype:
            file = '/x.html'
            ftype = 'text/html'
        with open(folder + file, 'rb') as file:
            client.sendall(b'HTTP/1.\ncontent-type:' + ftype.encode() + b'\n\n' + file.read())
    except:
        next
    client.close()