var socket;

onmessage = function(e) {
  switch (e.data.command) {
    case 'start':
      start(e.data.data);
      break;
    case 'decode':
      decode(e.data.data);
      break;
    case 'stop-record':
      saveAudio();
      break;
    default:
      console.error('unhandled message: ', e.data.command);
  }
};

function start(modelName) {
  socket = new WebSocket('wsUrl');
  socket.addEventListener('open', function(e) {
    postMessage({
      command: 'socket-ready'
    });
  });
  socket.addEventListener('message', function(e) {
    postMessage({
      command: 'asr-result',
      data: e.data
    });
  });
  socket.addEventListener('close', function(e) {
    console.log(e);
  })
}

function decode(data) {
  socket.send(data);
}

function saveAudio() {
  socket.send('end');
  postMessage({
    command: 'save-audio',
  });
}
