import sys
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import threading

class RequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'{"ok": true}')

    def do_POST(self):
        if self.path == "/v1/chat/completions":
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            
            # Send chunks slowly so we can kill it
            for i in range(10):
                chunk = {
                    "id": "chatcmpl-123",
                    "object": "chat.completion.chunk",
                    "created": int(time.time()),
                    "model": "mock-airllm",
                    "choices": [{"index": 0, "delta": {"content": f"{i} "}, "finish_reason": None}],
                }
                self.wfile.write(f"data: {json.dumps(chunk)}\n\n".encode())
                self.wfile.flush()
                time.sleep(1)
            
            done = {
                "id": "chatcmpl-123",
                "object": "chat.completion.chunk",
                "created": int(time.time()),
                "model": "mock-airllm",
                "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}],
            }
            self.wfile.write(f"data: {json.dumps(done)}\n\n".encode())
            self.wfile.write(b"data: [DONE]\n\n")

if __name__ == '__main__':
    port = 8765
    for i, arg in enumerate(sys.argv):
        if arg == '--port' and i + 1 < len(sys.argv):
            port = int(sys.argv[i + 1])
    
    server = HTTPServer(('127.0.0.1', port), RequestHandler)
    print(f"[AirLLM] ✓ Server listening on http://127.0.0.1:{port}")
    server.serve_forever()
