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
			var p1_sym = 'X';
			var p2_sym = 'O';
			sessions[connectTo] = {
				players: {},
				currentMove: 0,
				gameState: [[-1, -1, -1],[-1, -1, -1],[-1, -1, -1]],
				winner: -1
			}
			var player0 = Number(coinflip());
			var player1 = Number(!player0);
			sessions[connectTo]['players'][sockets[0]] = {player: player0, symbol: 'X', wantsToReplay: false};
			sessions[connectTo]['players'][sockets[1]] = {player: player1, symbol: 'O', wantsToReplay: false};
			console.log(sessions[connectTo]);
			io.to(connectTo).emit('gameInfo', {
				gameData: sessions[connectTo]
			});
		}
	});
	socket.on('gameMove', function(data) {

		if(sessions[data.gameId].winner === -1) {

			if(sessions[data.gameId].currentMove % 2 === 0) {
				if(sessions[data.gameId]['players'][socket.id].player == 0) {
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
			} else {
				if(sessions[data.gameId]['players'][socket.id].player == 1) {
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


});

app.get('/', function(req, res) {
	res.sendfile(path.join(__dirname, '/public', 'index.html'));
});



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
	if(session.currentMove == 9) {
		session.winner = -2
		callback(-2)
	}						
};
















server.listen(8001);