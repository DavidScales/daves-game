### episode 1
* set up project file structure
* install express, socket.io
* configure server app.js to hello-world level using express

### episode 2 & 3
* basic web sockets and socket.io API

### episode 4
* keyboard controls

### episode 5
* bullets

### episode 6
* chat
* debug server

## Notes

Want to create a "real time" (is that the right term?)

Learning to use websockets

> The WebSocket API is an advanced technology that makes it possible to open a two-way interactive communication session between the user's browser and a server. With this API, you can send messages to a server and receive event-driven responses without having to poll the server for a reply.
https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API

because its faster... esp for games, chat apps, no need to poll/re-establish...

Using Socket.IO, which is

> a library that enables real-time, bidirectional and event-based communication between the browser and the server.
https://socket.io/docs/

using the underlying browser WebSockets API.

First I got started with a very basic (hello-world) express app:

```
const express = require('express');
const app = express();
const server = require('http').Server(app);
const port = 8087;

app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/client/index.html`);
})
app.use('/client', express.static(`${__dirname}/client`));

console.log(`Server listening on localhost:${port}`);
server.listen(port);
```

One thing that I found interesting is that I normally set up express servers with the following:

```
const express = require('express');
const app = express();
app.listen(port);
```

Which I had never actually bothered to understand. But the [Socket.IO docs](https://socket.io/docs/) describe creating the example express server with Node's http module, before eventually incorporating the socket.io module itself:

```
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
```
https://socket.io/docs/

After an unsuccessful search of the documentation I found a stack overflow https://stackoverflow.com/questions/17696801/express-js-app-listen-vs-server-listen

explaining that the express instantiation

const express = require('express');
const app = express();

or shorthand

```
var app = require('express')();
```

simply creates a function that an http (or https) server can use as a callback for handling requests.

> The app returned by express() is in fact a JavaScript Function, designed to be passed to Node’s HTTP servers as a callback to handle requests. This makes it easy to provide both HTTP and HTTPS versions of your app with the same code base, as the app does not inherit from these (it is simply a callback)
https://expressjs.com/en/api.html#app.listen

so an http (or https) server still needs to be created, with the express app used as its request handling function. In the socket.io docs, this happens here:

var server = require('http').Server(app);

Where the express app is passed into the http Server instantiation. But it less obvious in the typical express setup, where

app.listen(port);

implicitly creates and returns an http.Server object, and is just shorthand for

app.listen = function() {
  var server = http.createServer(this);
  return server.listen.apply(server, arguments);
};
https://expressjs.com/en/api.html#app.listen

The socket.io docs recommend the explicit technique because the socket.io library needs to access the http.Server object like this

var io = require('socket.io')(server);

Of course, since I now know that app.listen returns the server instance, the socket.io docs code could be re-written to look more like the express docs:

var express   = require('express');
var app       = express();
// app.use/routes/etc...
var server    = app.listen(3033);
var io        = require('socket.io').listen(server);

WAIT THIS LAST LINE IS STILL DIFFERENT. WHY NOT JUST
require('socket.io')(server)?

In my case I finish the express server:

```
const port = 8087;

app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/client/index.html`);
})
app.use('/client', express.static(`${__dirname}/client`));

console.log(`Server listening on localhost:${port}`);
server.listen(port);
```

which just listens on a port, working like a static file server for the files in client/


Before instantiting the socket.io module like so:

```
const io = require('socket.io')(server, {});
```
REMOVE THIS EMPTY OPTIONS OBJECT

Which i believe creates a new WebSocket server. So overall I have
* an http express server handles serving files and the initial client-server handshake process
* a websocket server that handles data passed through websocket events

heres what that looks like in server code example

io.sockets.on('connection', socket => {
  console.log('socket connection');
});

basically use the library to establish a listener for connection events, which will happen when a client (browser) requests /. The express server will serve index.html and then the socket server will take over and establish a connection.

socket.io also has a client lib to abstract socket connections & events on the client side. here's how that looks

import
<script src="/socket.io/socket.io.js"></script>
this script call got me for a second because I don't have a socket.io/socket.io.js file on my server, but of course the socket.io library must establish /socket.io/socket.io.js as a route & serve the appropriate client library to it.

instantiate lib
    const socket = io();

listen for arbitrary events

    socket.on('someEvent', data => {
      console.log(data);
    });

Thats pretty much it conceptually for the basics.

The CURRENT example use is that on each connection, create some random data associated with the connection (like representing the coordinates of a player in a game), and to keep track of the connections in a global object.

  const SOCKET_LIST = {};
  io.sockets.on('connection', socket => {

    socket.id = Math.random();
    socket.number = "" + Math.floor(10 * Math.random());
    socket.x = 0;
    socket.y = 0;
    SOCKET_LIST[socket.id] = socket;

    console.log(`socket connection, id: ${socket.id}`);

    socket.on('disconnect', () => {
      delete SOCKET_LIST[socket.id];
    });
  });

Then I loop over the connections at some interval, and emit the data...

setInterval(() => {
  let pack = [];
  for (let i in SOCKET_LIST) {
    let socket = SOCKET_LIST[i];
    socket.x++;
    socket.y++
    pack.push({
      x: socket.x,
      y: socket.y,
      number: socket.number
    });
  }
  for (let i in SOCKET_LIST) {
    let socket = SOCKET_LIST[i];
    socket.emit('newPosition', pack);
  }

}, 1000/25); // 25 FPS

On the client I could listen for this event and do a thing

    socket.on('newPosition', data => {
      console.log('newPosition');
      console.log(data);
      ctx.clearRect(0, 0, 500, 500);
      for (let i = 0; i < data.length; i++) {
        let player = data[i];
        console.log('player');
        console.log(player);
        ctx.fillText(player.number, player.x, player.y);
      }
    });


UPDATED EXAMPLE:

on the client, listen for keyup & keydown events, and send those as keyPress socket events to the server

    document.onkeydown = event => {
      if (event.keyCode === 68) { // d key
        socket.emit('keyPress', { inputId: 'right', state: true });
      }
      else if (event.keyCode === 83) { // s key
        socket.emit('keyPress', { inputId: 'down', state: true });
      }
      else if (event.keyCode === 65) { // a key
        socket.emit('keyPress', { inputId: 'left', state: true });
      }
      else if (event.keyCode === 87) { // w key
        socket.emit('keyPress', { inputId: 'up', state: true });
      }
    };

    document.onkeyup = event => {
      if (event.keyCode === 68) { // d key
        socket.emit('keyPress', { inputId: 'right', state: false });
      }
      else if (event.keyCode === 83) { // s key
        socket.emit('keyPress', { inputId: 'down', state: false });
      }
      else if (event.keyCode === 65) { // a key
        socket.emit('keyPress', { inputId: 'left', state: false });
      }
      else if (event.keyCode === 87) { // w key
        socket.emit('keyPress', { inputId: 'up', state: false });
      }
    };

these keyPress events are heard on the server by a new listener, and used to modify the "state" of the keys for each player.

io.sockets.on('connection', socket => {
  //...

  socket.on('keyPress', data => {
    if (data.inputId === 'left') {
      player.pressingLeft = data.state;
    }
    else if (data.inputId === 'right') {
      player.pressingRight = data.state;
    }
    else if (data.inputId === 'up') {
      player.pressingUp = data.state;
    }
    else if (data.inputId === 'down') {
      player.pressingDown = data.state;
    }
  });
});

Then in the "game loop", each players position is updated before being sent out to all the clients like before

setInterval(() => {
  let pack = [];
  for (let i in PLAYER_LIST) {
    let player = PLAYER_LIST[i];
    player.updatePosition(); // NEW THING
    pack.push({
      x: player.x,
      y: player.y,
      number: player.number
    });
  }
  for (let i in SOCKET_LIST) {
    let socket = SOCKET_LIST[i];
    socket.emit('newPosition', pack);
  }

}, 1000/25); // 25 FPS

using the new Player objects updatePosition method

const Player = id => {
  const self = {
    x: 250,
    y: 250,
    id:id,
    number: "" + Math.floor(10 * Math.random()),
    pressingRight: false,
    pressingLeft: false,
    pressingUp: false,
    pressingDown: false,
    maxSpeed: 10,
  }

  self.updatePosition = () => {
    if (self.pressingRight) {
      self.x += self.maxSpeed;
    }
    if (self.pressingLeft) {
      self.x -= self.maxSpeed;
    }
    if (self.pressingDown) {
      self.y += self.maxSpeed;
    }
    if (self.pressingUp) {
      self.y -= self.maxSpeed;
    }
  };

  return self;
};

from here is mostly more of the same to add more objects and events to the game, like bullets that the player can shoot or obstacles they can run into, etc.

### adding chat using sockets

pretty easy, just like the above game type stuff

on the client
add a UI

  <div id="chat-text" style="width: 500px; height: 100px; overflow-y: scroll">
    <div>Hello!</div>
  </div>
  <form id="chat-form" action="">
    <input id="chat-input" type="text" style="width: 500px;">
  </form>

then emit message events on button clicks...
show messages on recieve event...

    const chatText = document.getElementById('chat-text');
    const chatInput = document.getElementById('chat-input');
    const chatForm = document.getElementById('chat-form');
    socket.on('addToChat', data => {
      // THIS BETTER BE SANITIZED :O
      chatText.innerHTML += '<div>' + data + '</div>';
    });
    chatForm.onsubmit = event => {
      event.preventDefault();
      socket.emit('sendMsgToServer', chatInput.value);
    };

in server similar, when get message, send to all clients

  socket.on('sendMsgToServer', data => {
    const playerName = ("" + socket.id).slice(2,7);
    for (let i in SOCKET_LIST) {
      let socket = SOCKET_LIST[i];
      socket.emit('addToChat', `${playerName}: ${data}`);
    }
  });

just using socket id as id for example.


### debug server

pretty cool! modify client side chat so that a message starting with "/" is emits a new event with the remaining characters to be evaluated on the server:

    chatForm.onsubmit = event => {
      event.preventDefault();
      if (chatInput.value[0] === '/') {
        socket.emit('evalServer', chatInput.value.slice(1));
      } else {
        socket.emit('sendMsgToServer', chatInput.value);
      }
    };

Then the server listens for this event and directly evalutes the content

    const DEBUG = true;
    socket.on('evalServer', data => {
      if (!DEBUG) {
        // Letting arbitrary content from the client execute with eval
        // is super dangerous, so the DEBUG variable is used to prevent
        // execution in production
        return;
      }
      const res = eval(data);
      socket.emit('evalAnswer', res);
    });

and emits it back to the client, which listens and gets the response and logs it

    socket.on('evalAnswer', data => {
      console.log(data);
    });

This lets me check the values on the server easily and dynamically, rather that like putting lots of console logs everywhere in the server that log constantly

example - in chat on client i could type "/Player.list", which would evalutate the player list on the server and log it for me in the client.

Sidenote & shown above about security risk of executing arbitrary content from the client - use DEBUG variable.

### auth

can use websockets for auth as well, e.g. use socket events for sign-in/sign-up instead of the normal http post requests:

  socket.on('signIn', data => {
    if (isValidUser(data)) {
      Player.onConnect(socket);
      socket.emit('signInResponse', { success: true });
    } else {
      socket.emit('signInResponse', { success: false });
    }
  });

where isValidUser is something basic and sync like

  function isValidUser(data) {
    return USERS[data.username] === data.password;
  };

for real code tho, gonna be checking a DB, which is async, so this isn't going to work of course. the tutorial recommends callbacks like this:

  socket.on('signIn', data => {
    isValidUser(data, res => {
      if (res) {
        Player.onConnect(socket);
        socket.emit('signInResponse', { success: true });
      } else {
        socket.emit('signInResponse', { success: false });
      }
    });
  });

along with rewriting isValidUser to something like:

  function isValidUser(data, cb) {
    // async user lookup
    cb(user && user.password === data.password);
  };

but with Promises + async/await! even bettuh!

  async function isValidUser(data) {
    return new Promise((resolve, reject) => {
      // async user lookup
      resolve(user && user.password === data.password);
    });
  };

  socket.on('signIn', async data => {
    if (await isValidUser(data)) {
      Player.onConnect(socket);
      socket.emit('signInResponse', { success: true });
    } else {
      socket.emit('signInResponse', { success: false });
    }
  });

...etc. explain

also alt with fat arrows because I like those:

  const isValidUser = async data => {
    return new Promise((resolve, reject) => {
      // async user lookup
      resolve(user && user.password === data.password);
    });
  };

TODO: come back to the above post-DB

### user persistence with databases

mongoDB

database
  collection0
    document0
    document1
    document2
  collection1
    document0
    document1
    document2

myGame
  account
    {username: "bob", password: "pass"}
    {username: "alice", password: "admin"}
  progress
    {username: "bob", level: 3}
    {username: "alice", level: 4}

collection like a SQL table
document like a SQL record

install the DB with brew? and then the driver with npm?
brew install mongodb
https://docs.mongodb.com/manual/tutorial/install-mongodb-on-os-x/
mongodb 3.6.4 is already installed

creates a default data directory at /data/db

installing yourself - could have issues with file permissions, and process will depend on your system. probably just gonna have to see appropriate documentation
https://docs.mongodb.com/v3.6/installation/

also note that I am using 3.6 and not 4.0. Had a brief bad expericne with 4 and the docs/api being kinda poor so im going to stick with 3.6 for now.

start the database application with `mongod` (no `b`)
https://docs.mongodb.com/manual/reference/program/mongod/#bin.mongod
> mongod is the primary daemon process for the MongoDB system. It handles data requests, manages data access, and performs background management operations.

and listens on a port like a web server
where daemon is a fancy way of saying background process

connect with it via command line with `mongo`
https://docs.mongodb.com/manual/reference/program/mongo/#bin.mongo
> mongo is an interactive JavaScript shell interface to MongoDB, which provides a powerful interface for system administrators as well as a way for developers to test queries and operations directly with the database. mongo also provides a fully functional JavaScript environment for use with a MongoDB.

from the mongo shell
`db` shows current db, which is just `test`
`show dbs` shows all databases
`use <database name>` swtichs to a db (or creates it)

Session:
```
> db
test
> show dbs
admin   0.000GB
config  0.000GB
local   0.000GB
> use myGame
switched to db myGame
```

Then create collections with `db.createCollection()` and add documents to them with `db.<collection>.insert()`.

Session:
```
> db.createCollection("account")
{ "ok" : 1 }
> db.createCollection("progress")
{ "ok" : 1 }
> db.account.insert({ username: "david", password: "isGreat" })
WriteResult({ "nInserted" : 1 })
> db.account.insert({ username: "nick", password: "isAwesome" })
WriteResult({ "nInserted" : 1 })
> db.progress.insert({ username: "david", level: 3, questComplete: ['myQuest1', 'myQuest2'] });
WriteResult({ "nInserted" : 1 })
```

can query with `db.<collection>.find(<must match>, <to retrieve>)` where

```
> db.account.find({ username: "david"});
{ "_id" : ObjectId("5ba428d3a91f74c7caf59997"), "username" : "david", "password" : "isGreat" }
> db.account.find({ username: "david"}).pretty();
{
	"_id" : ObjectId("5ba428d3a91f74c7caf59997"),
	"username" : "david",
	"password" : "isGreat"
}
> db.progress.find({ username: "david"});
{ "_id" : ObjectId("5ba42c01a91f74c7caf5999a"), "username" : "david", "level" : 3, "questComplete" : [ "myQuest1", "myQuest2" ] }
> db.progress.find({ username: "david"}, { level: 1 });
{ "_id" : ObjectId("5ba4297aa91f74c7caf59999"), "level" : 3 }
```

can update with `db.<collection>.update(<must match>, { $set: <new values> })`

```
> db.progress.update({ username: "david" }, { $set: { level: 4 } });
WriteResult({ "nMatched" : 1, "nUpserted" : 0, "nModified" : 1 })
> db.progress.find({ username: "david"}, { level: 1 });
{ "_id" : ObjectId("5ba42c01a91f74c7caf5999a"), "level" : 4 }
```

this is all cool but obviously we want to send database requests from the server and not from the command line. So we need to install a MongoDB driver for Node.js:
http://mongodb.github.io/node-mongodb-native/3.1/quick-start/quick-start/

npm install mongodb --save

(tutorial recommends `mongojs` but its not the official driver?)
(is the official one promise based?)

assuming the database application was started with `mongod`, I can set up a connection to the database in the express server with

```
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

const url = 'mongodb://localhost:27017';
const dbName = 'myGame';
MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
  assert.equal(null, err);
  console.log("Connected successfully to server");
  const db = client.db(dbName);
  client.close();
});
```

Here I import the database client (`MongoClient`) from the mongodb package, as well as the `assert` package which i believe is part of the standard library for Node.js.

The `url` represent the address of the database application, just like how my server listens on localhost:XXXX.

The `connect` method lets me connect to the database
the useNewUrlParser is just probably a temporary arg while some old url parser is deprecated.

the typical node style is for methods to accept callback which take `err, ...args`, and generally check for err at the beginning of the callback function. MORE HERE.

Lookls the connect function works the same way here. the assert library is used to ensure that there were no errors, and then db is used to instantiate the game db as a variable, then client is just closed since im just setting up and dont need to do anything here.

gonna try with promises cuz im legit and callbacks kinda suck:

const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

const url = 'mongodb://localhost:27017';
const dbName = 'myGame';
const dbPromise = MongoClient.connect(url, { useNewUrlParser: true })
  .then(client => {
    console.log("Connected successfully to server");
    return client.db(dbName);
  }).catch(err => {
    console.log(err);
  });

works! just figured this out by guessing and logging, since the documentation doesn't seem to cover it...

now trying with async await:
!can't use await at the top level (needs to be in an async function)
https://javascript.info/async-await

  const MongoClient = require('mongodb').MongoClient;
  const assert = require('assert');

  const url = 'mongodb://localhost:27017';
  const dbName = 'myGame';
  const initDb = async (url, dbName) => {
    try {
      const client = await MongoClient.connect(url, { useNewUrlParser: true });
      console.log('Connected successfully to database');
      return client.db(dbName);
    } catch (err) {
      console.log(err);
    }
  };
  const dbPromise = initDb(url, dbName);


#### updating auth

Now im going to update the auth functions from using a global variable:

  const USERS = {
    // username: password
    'admin': 'password',
    'david': 'isCool',
  };
  const isValidUser = async data => {
    return USERS[data.username] === data.password;
  };
  const isUsernameTaken = async data => {
    return USERS[data.username];
  };
  const addUser = async data => {
    USERS[data.username] = data.password;
  };

to using the database:

    // TODO: sanitization and potential security issues
    // TODO: passwords should be salted hashes
    const isValidUser = async data => {
      const db = await dbPromise;
      const users = await db.collection('account')
        .find(data)
        .toArray();
      return users.length === 1;
    };
    const isUsernameTaken = async data => {
      const db = await dbPromise;
      const users = await db.collection('account')
        .find({username: data.username })
        .toArray();
      return users.length === 1;
    };
    const addUser = async data => {
      const db = await dbPromise;
      const users = await db.collection('account')
        .insertOne(data)
      assert.equal(1, users.insertedCount);
    };


### game state

sending full game state back and forth in web sockets on every frame is expensive. going to split it into three parts

1. init - for when new stuff is created, contains all data. big but only sent once
2. update - just differences to update, tiny and every frame
3. remove - just id's of things to remove

So before:

server listens for client input events from keys (like player movement, or bullets firing)
every 25fps, server updates the game state (for example calculating new bullet positions), and emits the entire state to the client

client listens for entire game state from server
when client gets state, repaints everything

issue tutorial says:
* sending more data then necessary - sending 100% of game state each server frame

Is this also an issue? or not really?:
* rendering is dependent on the server. Since rendering happens when server events are received by client, I am only rendering at 25fps

So now:

client listens for init, update, and remove events
* init is used to send the entire game state data for the first time or one-off times (like new players joining). This state data is then saved on the client. so the client has the game state now.
* update events are sent by the server similarly to before, every server frame, but now only contain new data (like updated positions)
* remove events are emitted when data should be removed from the game state on the client (the server also removes the same data from its state at the same time)

client simply loops now, repainting wahtever game state it currently has at a set interval. (this should use requestAnimationFrame!) (so now the rendering is independent of the server frames, which also seems good, but i cant articulate why right now...)

so this does mean less data in theory. one concern I have though is that this could make cheating easier, since someone can modify the game state on the client. but right now it doesnt seem like a probablem, because the server only expects key input events and theres no game state data flowing from the client to the server, so modifying the local game state shouldn't really matter.



## Todos

* sessions to stay logged in. log out button
* refactor like crazy, organized into modules, remove magic numbers
* fix the mouse pointer issue - shooting is relative to the center of the canvas
* clean up UI / UX
* use WASD keys, without breaking chat
* turn DEBUG off. also wrap in try/catch so that server doesn't shut down on bad eval
* soooo much potential...
* see phone notes

NOTE: possibly add notes about the socket vs client session issues I had with Nick

Ridiculously good tutorial covering multiplayer web games with Node.js & Socket.IO for anyone with even basic-intermediate web/JS experience
https://rainingchain.com/tutorial/nodejs