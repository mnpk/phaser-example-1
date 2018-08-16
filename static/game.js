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

function preload() {
  this.load.image('ship', 'assets/spaceship.png')
}

function create() {
  var self = this
  var socket = new WebSocket("ws://localhost:3000/ws")
  socket.onmessage = function (event) {
    msg = JSON.parse(event.data)
    console.log(msg)
    if (msg["type"] == "newPlayer") {
      var playerInfo = JSON.parse(msg["payload"])
      console.log(playerInfo)
      addShip(self, playerInfo.x, playerInfo.y )
    }
  }
  socket.onopen = function (event) {
    var msg = {
      type: "message",
      payload: "hello, world!",
    }
    socket.send(JSON.stringify(msg))
  }
}

function update() { }

function addShip(self, x, y) {
  self.ship = self.physics.add.image(x, y, 'ship').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
  // if (playerInfo.team === 'blue') {
  //   self.ship.setTint(0x0000ff);
  // } else {
  //   self.ship.setTint(0xff0000);
  // }
  self.ship.setDrag(100);
  self.ship.setAngularDrag(100);
  self.ship.setMaxVelocity(200);
}