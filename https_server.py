import http.server
import ssl

PORT = 8443
ADDRESS = '0.0.0.0'

handler = http.server.SimpleHTTPRequestHandler

httpd = http.server.HTTPServer((ADDRESS, PORT), handler)

# Create SSL context
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain(certfile='cert.pem', keyfile='cert.pem')

# Wrap the server socket
httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

print(f"✅ Serving securely on https://{ADDRESS}:{PORT}")
httpd.serve_forever()

