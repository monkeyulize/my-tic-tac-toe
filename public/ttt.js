var gameId;
var myId;
var socket = io.connect(window.location.host);

socket.on('welcome', function(data) {
	console.log(data);
	$(".newGameId").html(data.newGameId);
	myId = data.myId;
})
$(".joinGame").submit(function(e) {
	e.preventDefault();
	var gameId_val = $(this).find("[name='gameId']").val();
	console.log(gameId_val);
	socket.emit('gameJoin', {
		reqGameId: gameId_val
	});
	$("#join-game").collapse('hide');
});
$(".uploadForm").submit(function(e) {
	$(".uploadStatus").html("Uploading...");
	$(".uploadForm").find("input[name='socketId']").val(myId);
	$(this).ajaxSubmit({
		error: function(xhr) {
			$(".uploadStatus").html("Error: " + xhr.status);
			console.log("Error: " + xhr.status)
		},
		success: function(response) {
			$(".uploadStatus").html("Image uploaded.");
			console.log(response);
		}
	});
	return false;
});
socket.on('gameBegin', function(data) {
	console.log(data);
	$(".replayBtn").prop("disabled", true);
	gameId = data.gameId;
})
socket.on('connectFail', function(data) {
	$(".game-status").find("span").html(data.message);
})
socket.on('gameInfo', function(data) {
	resetBoard();
	console.log(data);
	$(".game-status").find("span").html("Connected to " + data.gameId);
	for(var key in data.gameData.players) {
		
		
		if(data.gameData.players[key].symbol.match('http')) {
			$(".gameInfo").find("#player"+data.gameData.players[key].player).find(".playerImage").prop("src", data.gameData.players[key].symbol);
		} else {
			$(".gameInfo").find("#player"+data.gameData.players[key].player).append('<span>' + data.gameData.players[key].symbol + '</span>');
		}
		if(key === myId) {
			console.log("I am player " + data.gameData.players[key].player);
			$(".gameInfo").find("#player"+data.gameData.players[key].player).find(".playerName").html("Player " + Number(data.gameData.players[key].player+1) + " <strong>(you)</strong>");
		} else {
			$(".gameInfo").find("#player"+data.gameData.players[key].player).find(".playerName").html("Player " + Number(data.gameData.players[key].player+1));
		}
	}

	
	if(data.gameData.players[0])
	$(".gameInfo").find(".player1").find(".playerName").html("Player 1");
})
socket.on('moveComplete', function(data) {
	var squareId = [data.square_x, data.square_y].join('-');
	if(data.symbol.match('http')) {
		$("#"+squareId).prepend('<img src="' + data.symbol + '" />' );
	} else {
		$("#"+squareId).prepend('<span>' + data.symbol + '</span>');
	}
	
	
})
socket.on('gameComplete', function(data) {
	console.log(data);
	$(".game-over").fadeIn(1000);
	if(data.winner > -1) {
		$(".game-over-message").html("Game Over! Player " + Number(data.winner+1) + " won!");
	} else {
		$(".game-over-message").html("Game Over! Tie game!");
	}
	
	$(".replayBtn").prop("disabled", false);
});
socket.on('replayMatch', function() {
	resetBoard(true);
	$(".replayBtn").prop("disabled", true);
});
socket.on('otherPlayerDisconnect', function() {
	resetBoard();
	$(".game-status").find("span").html("Other player disconnected :(");
});
$(".square").click(function() {
	
	var square = this.id;
	square_x = square.split('-')[0];
	square_y = square.split('-')[1];
	console.log(square);
	socket.emit('gameMove', {
		gameId: gameId,
		square_x: square_x,
		square_y: square_y

	});

});
$(".replayBtn").click(function() {
	$(".replayStatus").html("Waiting for response...");
	socket.emit('replay', {
		gameId: gameId
	});
});

function resetBoard(replay) {
	for(var i = 0; i < 3; i++) {
		for(var j = 0; j < 3; j++) {
			$("#"+i+'-'+j).empty();
			$("#"+i+'-'+j).empty();
		}
	}
	$(".replayStatus").empty();
	$(".gameMessage").empty();	
	$(".game-over").hide();
	if(replay !== true) {
		$(".gameInfo").find('.player').find("*").empty();
	}
}

