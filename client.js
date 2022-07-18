const net = require('net');

const port = "/tmp/server.sock"

const client = net.createConnection(port);

const mediaDir = process.argv[2]
client.write(JSON.stringify({
  method: "add",
  mediaDir: mediaDir
}));
client.end()
