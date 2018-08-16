var config = {
  type: Phaser.AUTO,
  parent: 'phaser-example',
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 0 }
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

var game = new Phaser.Game(config);

function preload() { }

function create() {
  var socket = new WebSocket("ws://localhost:3000/ws")
  socket.onmessage = function (event) {
    console.log(event.data)
  }
  socket.onopen = function(event) {
    var msg = {
      type: "message",
      payload: "hello, world!",
    }
    socket.send(JSON.stringify(msg))
  }
}

function update() { }