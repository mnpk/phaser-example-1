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
      addPlayer(self, payload)
    },
    "allPlayers": function (payload) {
      if (payload != null)
        payload.forEach(function(info) {
          addOtherPlayer(self, info)
        })

      // addShip(self, payload["X"], payload["Y"])
    },
    "playerMovement": function (payload) {
    }
  }

  var socket = new WebSocket("ws://localhost:3000/ws")

  function send(msg) {
    socket.send(JSON.stringify(msg))
  }
  this.socket = socket
  this.send = send


  socket.onmessage = function (event) {
    event.data.split("\n").forEach(function (data) {
      msg = JSON.parse(data)
      var type = msg["Type"]
      var payload = JSON.parse(msg["Payload"])
      var handler = handlers[type]
      if (handler) {
        console.log("handle message: ", type, payload)
        handler(payload)
      } else {
        console.log("invalid message: ", type, payload)
      }

    })
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

    // emit player movement
    var x = this.ship.x;
    var y = this.ship.y;
    var r = this.ship.rotation;
    if (this.ship.oldPosition && (x !== this.ship.oldPosition.x || y !== this.ship.oldPosition.y || r !== this.ship.oldPosition.rotation)) {
      this.send({
        "Type": 'playerMovement',
        "Payload": JSON.stringify({ ID: this.ship.id, X: this.ship.x, Y: this.ship.y, R: this.ship.rotation })
      });
    }

    // save old position data
    this.ship.oldPosition = {
      x: this.ship.x,
      y: this.ship.y,
      rotation: this.ship.rotation
    };
  }
}

function addPlayer(self, info) {
  self.ship = createPlayer(self, info)

  for (id in self.others) {
    if (self.ship.id == id)
    {
      delete self.others[id]
      return
    }
  }
}

function addOtherPlayer(self, info) {
  if (info['ID'] == self.ship.id)
    return

  self.others[info['ID']] = createPlayer(self, info)
  console.log(self.others)
}

function createPlayer(self, info) {
  player = self.physics.add.image(info['X'], info['Y'], 'ship').setOrigin(0.5, 0.5).setDisplaySize(53, 40)
  player.id = info['ID']
  player.setDrag(100)
  player.setAngularDrag(100)
  player.setMaxVelocity(200)
  return player
}