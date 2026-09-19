#!/usr/bin/env python3
import os
import http.server
import socketserver
from http.server import ThreadingHTTPServer

# NOT 8899. That port belongs to the Inverex/Deye solar dongle protocol on this
# LAN, and poller_solar.py sprays binary Modbus-ish frames at it thousands of
# times a second. Squatting there filled /var/log and starved this server's
# connection queue, taking the whole site down intermittently.
PORT = int(os.environ.get("FLAVORS_STATIC_PORT", "8898"))

class CORSHandler(http.server.SimpleHTTPRequestHandler):
    # Per-request journald logging turned a stray client into 85,000 messages
    # every 30 seconds and 12 GB of /var/log. Log real errors only.
    def log_message(self, fmt, *args):
        pass

    def log_error(self, fmt, *args):
        code = args[0] if args else ''
        if str(code).startswith('4'):
            return          # malformed junk from something on the wrong port
        super().log_error(fmt, *args)

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
    with Server(('0.0.0.0', PORT), CORSHandler) as httpd:
        print('serving on :%d' % PORT, flush=True)
        httpd.serve_forever()
