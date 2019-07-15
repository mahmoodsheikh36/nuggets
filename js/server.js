const net = require('net')

const server = net.createServer((socket) => {
  socket.end('hey there, how u doing?\n')
}).on('error', (err) => {
  // handle errors here
  throw err
})

// Grab an arbitrary unused port.
server.listen(4004, () => {
  console.log('opened server on', server.address())
})
