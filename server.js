var express     = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var morgan      = require('morgan');
var multer = require('multer');
var shortid = require('shortid');
var AWS = require('aws-sdk');
AWS.config.loadFromPath('./AwsConfig.json');
var s3 = new AWS.S3();
var fs = require('fs');
var upload = multer({dest: 'uploads/'});

function uploadImage(remoteFilename, fileName, callback) {
	var fileBuffer;
	fs.readFile(fileName, function(err, data) {
		if(err) {
			console.log("file err: "  + err);
		} else {
			fileBuffer = data;
			var metaData = getContentTypeByFile(fileName);
			console.log("metadata: " + metaData);
			var params = {
				ACL: 'public-read',
				Bucket: 'nodetictactoe-22616',
				Key: remoteFilename,
				Body: fileBuffer,
				ContentType: metaData
			};
			s3.upload(params, function(err, data) {
				console.log("error: " + err);
				console.log(data);
				callback(data.Location);
			});	
		};

	});


};

function getContentTypeByFile(fileName) {
  var rc = 'application/octet-stream';
  var fn = fileName.toLowerCase();

  if (fn.indexOf('.html') >= 0) rc = 'text/html';
  else if (fn.indexOf('.css') >= 0) rc = 'text/css';
  else if (fn.indexOf('.json') >= 0) rc = 'application/json';
  else if (fn.indexOf('.js') >= 0) rc = 'application/x-javascript';
  else if (fn.indexOf('.png') >= 0) rc = 'image/png';
  else if (fn.indexOf('.jpg') >= 0) rc = 'image/jpg';

  return rc;
}


// use morgan to log requests to the console
app.use(morgan('dev'));

app.use(express.static(__dirname + '/public'));


var sessions = {};
var clients = {};


io.on('connection', function(socket) {
	var newGameId = shortid.generate();
	socket.join(newGameId);
	clients[socket.id] = {myGame: newGameId, connectedTo: ''};
	socket.emit('welcome', {
		newGameId: newGameId,
		message: "Welcome to Tic-Tac-Toe!",
		myId: socket.id
	});
	socket.on('gameJoin', function(data) {
		// console.log(data);
		var connectTo = data.reqGameId;
		if (io.sockets.adapter.rooms[connectTo].length >= 2) {
			socket.emit('roomFull', {message: "This game is full"});
		} else {
			socket.join(connectTo);
			clients[socket.id].connectedTo = connectTo;
			io.to(connectTo).emit('gameBegin', {
				players: io.sockets.adapter.rooms[connectTo],
				gameId: connectTo,
				message: "Let's play Tic-Tac-Toe!"
			});
			var sockets = [];
			for (var key in io.sockets.adapter.rooms[connectTo].sockets) {
				sockets.push(key);
			}
			var p1_sym;
			var p2_sym;
			sessions[connectTo] = {
				players: {},
				currentMove: 0,
				gameState: [[-1, -1, -1],[-1, -1, -1],[-1, -1, -1]],
				winner: -1
			}
			var player0 = Number(coinflip());
			var player1 = Number(!player0);
			if(player0 === 0) {
				p1_sym = 'X';
				p2_sym = 'O';
			} else {
				p1_sym = 'O';
				p2_sym = 'X';
			}

			p0_symbol = clients[sockets[0]].hasOwnProperty('image') ? clients[sockets[0]].image : p1_sym;
			p1_symbol = clients[sockets[1]].hasOwnProperty('image') ? clients[sockets[1]].image : p2_sym;
			sessions[connectTo]['players'][sockets[0]] = {player: player0, symbol: p0_symbol, wantsToReplay: false};
			sessions[connectTo]['players'][sockets[1]] = {player: player1, symbol: p1_symbol, wantsToReplay: false};
			console.log(sessions[connectTo]);
			io.to(connectTo).emit('gameInfo', {
				gameData: sessions[connectTo]
			});
		}
	});
	socket.on('gameMove', function(data) {

		if(sessions[data.gameId].winner === -1) {

			if(sessions[data.gameId]['players'][socket.id].player == (sessions[data.gameId].currentMove % 2)) {
				if(sessions[data.gameId].gameState[data.square_x][data.square_y] === -1) {
					sessions[data.gameId].currentMove++;
					sessions[data.gameId].gameState[data.square_x][data.square_y] = sessions[data.gameId]['players'][socket.id].player;
					io.to(data.gameId).emit('moveComplete', {
						square_x: data.square_x,
						square_y: data.square_y,
						symbol: sessions[data.gameId]['players'][socket.id].symbol
					})	
					testForVictory(sessions[data.gameId], [data.square_x, data.square_y], sessions[data.gameId]['players'][socket.id].player, winner);							
				}
	
			} else {
				// it's not your turn
			}
		}
		function winner(symbol) {
			io.to(data.gameId).emit('gameComplete', {
				winner: symbol
			})
		}

	});
	socket.on('replay', function(data) {

		sessions[data.gameId]['players'][socket.id].wantsToReplay = true;
		var count = 0;
		for(var key in sessions[data.gameId]['players']) {
			if(sessions[data.gameId]['players'][key].wantsToReplay == true) {
				count++;

			}
		}
		if(count == 2) {
			resetGame(data.gameId);
			io.to(data.gameId).emit('replayMatch');			
		}
	});

	socket.on('disconnect', function() {

		var roomToNotify;
		if(clients[socket.id].connectedTo) {
			roomToNotify = clients[socket.id].connectedTo;
		} else if(clients[socket.id].myGame) {
			roomToNotify = clients[socket.id].myGame;
		}
		if(roomToNotify) {
			io.to(roomToNotify).emit('otherPlayerDisconnect');
			delete clients[socket];
		}

		

	});


});

app.get('/', function(req, res) {
	res.sendfile(path.join(__dirname, '/public', 'index.html'));
});

app.post('/api/image', upload.single('userPhoto'), function(req, res) {
	console.log(req.file);
	console.log(req.body);
	var filename = req.file.path;
	var remoteFilename = req.body.socketId + '-' + req.file.originalname;
	
	uploadImage(remoteFilename, filename, function(url) {
		clients[req.body.socketId]['image'] = url;

		res.json({remotefilename: remoteFilename, url: url});
	});
});

function randomizePlayers(session) {




};



function resetGame(sessionId) {
	sessions[sessionId].currentMove = 0;
	sessions[sessionId].gameState = [[-1, -1, -1],[-1, -1, -1],[-1, -1, -1]];
	sessions[sessionId].winner = -1;
	for(var key in sessions[sessionId]['players']) {
		sessions[sessionId]['players'][key].wantsToReplay = false;
	}
	console.log(sessions[sessionId]);
}

function coinflip() {
	return Math.random() < 0.5;
}

var n = 3;
function testForVictory(session, start, symbol, callback) {
	start = start.map(Number)
	
	var state = session.gameState;

	// check columns
	for(var i = 0; i < n; i++) {
		if(state[start[0]][i] === symbol) {
			if(i === n-1) {
				session.winner = symbol;
				console.log(symbol + " won!");
				callback(symbol);
				return;
			}
		} else {
			break;
		}
	}
	// check rows
	for(var i = 0; i < n; i++) {
		if(state[i][start[1]] === symbol) {
			if(i === n-1) {
				session.winner = symbol;
				console.log(symbol + " won!");
				callback(symbol);
				return;
			}
		} else {
			break;
		}
	}
	// check diagonal
	for(var i = 0; i < n; i++) {
		if(state[i][i] === symbol) {
			if(i === n-1) {
				session.winner = symbol;
				console.log(symbol + " won!");
				callback(symbol);
				return;
			}
		} else {
			break;
		}
	}
	// check reverse diagonal
	for(var i = 0; i < n; i++) {
		if(state[i][(n-1)-i] === symbol) {
			if(i === n-1) {
				session.winner = symbol;
				console.log(symbol + " won!");
				callback(symbol);
				return;
			}
		} else {
			break;
		}
	}
	if(session.currentMove == 9) {
		session.winner = -2
		callback(-2)
	}						
};
















server.listen(8001);