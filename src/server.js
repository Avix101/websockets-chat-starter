const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const index = fs.readFileSync(`${__dirname}/../client/client.html`);

const onRequest = (request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.write(index);
  response.end();
};

const app = http.createServer(onRequest).listen(port);

// console.log(`Listening on 127.0.0.1: ${port}`);

const io = socketio(app);

const users = {};
const usernameRef = {};

const onJoined = (sock) => {
  const socket = sock;

  socket.on('join', (data) => {
    // Initial join message sent to clients
    const joinMsg = {
      name: 'server',
      msg: `There are ${Object.keys(users).length} users online currently`,
    };

    socket.name = data.name;
    socket.emit('msg', joinMsg);
    users[socket.id] = socket;
    usernameRef[socket.name] = socket;

    socket.join('room1');

    const response = {
      name: 'server',
      msg: `${data.name} has joined the room.`,
    };

    socket.broadcast.to('room1').emit('msg', response);

    // console.log(`${data.name} joined`);

    socket.emit('msg', { name: 'server', msg: 'You joined the room.' });
  });
};

const onMsg = (sock) => {
  const socket = sock;

  socket.on('msgToServer', (data) => {
    io.sockets.in('room1').emit('msg', { name: socket.name, msg: data.msg });
  });

  socket.on('pMsgToServer', (data) => {
    if (usernameRef[data.to]) {
      usernameRef[data.to].emit('pMsg', { name: socket.name, msg: data.msg });
      socket.emit('msg', { name: 'server', msg: `PM to '${data.to}' sent!` });
    } else {
      socket.emit('msg', { name: 'server', msg: `PM to '${data.to}' could not be delivered` });
    }
  });

  socket.on('getTime', () => {
    socket.emit('msg', { name: 'server', msg: `Time: ${new Date().toLocaleTimeString()}` });
  });

  socket.on('getWizard', () => {
    io.sockets.in('room1').emit('sendWizard', { name: socket.name, msg: '(∩｀-´)⊃━☆ﾟ.*･｡ﾟ' });
  });
};

const onDisconnect = (sock) => {
  const socket = sock;

  socket.on('disconnect', () => {
    delete users[socket.id];
  });
};

io.sockets.on('connection', (socket) => {
  // console.log('started');

  onJoined(socket);
  onMsg(socket);
  onDisconnect(socket);
});

// console.log('Websocket server started');
