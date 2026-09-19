#!/usr/bin/env python3
import http.server
import socketserver
from http.server import ThreadingHTTPServer

class CORSHandler(http.server.SimpleHTTPRequestHandler):
    def guess_type(self, path):
        ctype = super().guess_type(path)
        if ctype.startswith('text/') or ctype in ('application/javascript', 'application/json'):
            return ctype + '; charset=utf-8'
        return ctype

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

class Server(ThreadingHTTPServer):
    # socketserver.TCPServer is SINGLE-THREADED: it handles one request at a time,
    # so a single stalled connection blocks every other request and the accept
    # queue fills (Recv-Q pegged at the backlog). Cloudflare holds connections
    # open, so this wedges the whole site within minutes. Threads fix it.
    daemon_threads = True
    allow_reuse_address = True
    request_queue_size = 128


if __name__ == '__main__':
    # Don't let a slow client hold a worker thread forever.
    CORSHandler.timeout = 30
    with Server(('0.0.0.0', 8899), CORSHandler) as httpd:
        httpd.serve_forever()
