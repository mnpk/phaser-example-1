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

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

var game = new Phaser.Game(config)

function preload() {
  this.load.image('ship', 'assets/spaceship.png')
}

function create() {
  this.cursors = this.input.keyboard.createCursorKeys()
  var self = this
  this.others = {}

  var handlers = {
    "newPlayer": function (payload) {
      if (payload['ID'] == self.id)
        addPlayer(self, payload)
      else
        addOtherPlayer(self, payload)
    },
    "allPlayers": function (payload) {
      if (payload != null)
        payload.forEach(function (info) {
          addOtherPlayer(self, info)
        })

      // addShip(self, payload["X"], payload["Y"])
    },
    "playerMovement": function (payload) {
      if (payload['ID'] in self.others) {
        target = self.others[payload['ID']]
        target.x = payload['X']
        target.y = payload['Y']
        target.rotation = payload['R']
      }
    },
    "exitPlayer": function (payload) {
      if (payload['ID'] in self.others) {
        target = self.others[payload['ID']]
        delete self.others[payload['ID']]
        target.destroy()
      }

    }
  }

  var socket = new WebSocket("ws://" + location.host + "/ws")

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

  socket.onopen = function (event) {
    self.id = uuidv4()
    self.send({
      "Type": 'enterPlayer',
      "Payload": JSON.stringify({ ID: self.id, X: 0, Y: 0, R: 0 })
    });

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
    if (self.ship.id == id) {
      delete self.others[id]
      return
    }
  }
}

function addOtherPlayer(self, info) {
  if (info['ID'] == self.id || info['ID'] in self.others)
    return

  self.others[info['ID']] = createPlayer(self, info)
  self.others[info['ID']].setTint(0xff0000)
  console.log(self.others)
}

function createPlayer(self, info) {
  player = self.physics.add.image(info['X'], info['Y'], 'ship').setOrigin(0.5, 0.5).setDisplaySize(53, 40)
  player.rotation = info['R']
  player.id = info['ID']
  player.setDrag(100)
  player.setAngularDrag(100)
  player.setMaxVelocity(200)
  return player
}


