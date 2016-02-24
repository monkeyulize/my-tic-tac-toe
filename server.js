var express     = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var morgan      = require('morgan');
var shortid = require('shortid');




// use morgan to log requests to the console
app.use(morgan('dev'));

app.use(express.static(__dirname + '/public'));


var sessions = {};



io.on('connection', function(socket) {
	var newGameId = shortid.generate();
	socket.join(newGameId);

	socket.emit('welcome', {
		newGameId: newGameId,
		message: "Welcome to Tic-Tac-Toe!",
		myId: socket.id
	});
	socket.on('gameJoin', function(data) {
		console.log(data);
		var connectTo = data.reqGameId;
		if (io.sockets.adapter.rooms[connectTo].length >= 2) {
			socket.emit('roomFull', {message: "This game is full"});
		} else {
			socket.join(connectTo);
			io.to(connectTo).emit('gameBegin', {
				players: io.sockets.adapter.rooms[connectTo],
				gameId: connectTo,
				message: "Let's play Tic-Tac-Toe!"
			});
			var sockets = [];
			for (var key in io.sockets.adapter.rooms[connectTo].sockets) {
				sockets.push(key);
			}
			console.log(sockets);
			if(Number(coinflip()) === 0) {
				p1_socket = sockets[0];
				p2_socket = sockets[1];
			} else {
				p1_socket = sockets[1];
				p2_socket = sockets[0];
			}
			console.log(p1_socket);
			console.log(p2_socket);
			var p1_sym = 'X';
			var p2_sym = 'O';
			sessions[connectTo] = {
				p1: {side: 0, socket: p1_socket, symbol: p1_sym},
				p2: {side: 1, socket: p2_socket, symbol: p2_sym},
				currentMove: 0,
				gameState: [[-1, -1, -1],[-1, -1, -1],[-1, -1, -1]],
				winner: -1
			}
			console.log(sessions[connectTo]);
			io.to(connectTo).emit('gameInfo', {
				gameData: sessions[connectTo]
			});
		}
	});
	socket.on('gameMove', function(data) {

		if(sessions[data.gameId].winner === -1) {

			if(sessions[data.gameId].currentMove % 2 === 0) {
				if(socket.id == sessions[data.gameId].p1.socket) {
					sessions[data.gameId].currentMove++;
					sessions[data.gameId].gameState[data.square_x][data.square_y] = sessions[data.gameId].p1.side;
					io.to(data.gameId).emit('moveComplete', {
						square_x: data.square_x,
						square_y: data.square_y,
						symbol: sessions[data.gameId].p1.symbol
					})	
					testForVictory(sessions[data.gameId], [data.square_x, data.square_y], sessions[data.gameId].p1.side, winner);			
				} else {
					// it's not your turn
				}
			} else {
				if(socket.id == sessions[data.gameId].p2.socket) {
					sessions[data.gameId].currentMove++;
					sessions[data.gameId].gameState[data.square_x][data.square_y] = sessions[data.gameId].p2.side;
					io.to(data.gameId).emit('moveComplete', {
						square_x: data.square_x,
						square_y: data.square_y,
						symbol: sessions[data.gameId].p2.symbol
					})
					testForVictory(sessions[data.gameId], [data.square_x, data.square_y], sessions[data.gameId].p2.side, winner);			
				} else {
					// it's not your turn
				}			
			}

		}
		function winner(symbol) {
			io.to(data.gameId).emit('gameComplete', {
				winner: symbol
			})
		}

	});


});

app.get('/', function(req, res) {
	res.sendfile(path.join(__dirname, '/public', 'index.html'));
});

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
			}
		} else {
			break;
		}
	}						
};
















server.listen(8001);