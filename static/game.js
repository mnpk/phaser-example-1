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
}

var game = new Phaser.Game(config)

function preload() {
  this.load.image('ship', 'assets/spaceship.png')
}

function create() {
  this.cursors = this.input.keyboard.createCursorKeys()
  var self = this

  var handlers = {
    "newPlayer": function (payload) {
      addShip(self, payload["x"], payload["y"])
    }
  }

  var socket = new WebSocket("ws://localhost:3000/ws")

  socket.onmessage = function (event) {
    msg = JSON.parse(event.data)
    var type = msg["type"]
    var payload = JSON.parse(msg["payload"])
    var handler = handlers[type]
    if (handler) {
      console.log("handle message: ", type, payload)
      handler(payload)
    } else {
      console.log("invalid message: ", type, payload)
    }
  }



  socket.onopen = function (event) {
    var msg = {
      type: "newPlayer",
      payload: JSON.stringify({ "x": 300, "y": 300 })
    }
    socket.send(JSON.stringify(msg))
  }
}

function update() {
  if (this.ship) {
    if (this.cursors.left.isDown) {
      this.ship.setAngularVelocity(-150);
    } else if (this.cursors.right.isDown) {
      this.ship.setAngularVelocity(150);
    } else {
      this.ship.setAngularVelocity(0);
    }

    if (this.cursors.up.isDown) {
      this.physics.velocityFromRotation(this.ship.rotation + 1.5, 100, this.ship.body.acceleration);
    } else {
      this.ship.setAcceleration(0);
    }

    this.physics.world.wrap(this.ship, 5);
  }
}

function handleCursor() {
}

function addShip(self, x, y) {
  self.ship = self.physics.add.image(x, y, 'ship').setOrigin(0.5, 0.5).setDisplaySize(53, 40)
  // if (playerInfo.team === 'blue') {
  //   self.ship.setTint(0x0000ff)
  // } else {
  //   self.ship.setTint(0xff0000)
  // }
  self.ship.setDrag(100)
  self.ship.setAngularDrag(100)
  self.ship.setMaxVelocity(200)
}