var gameId;
var myId;
var socket = io.connect(window.location.host);
socket.on('welcome', function(data) {
	console.log(data);
	$("#newGameId").html(data.newGameId);
	myId = data.myId;
})

$("#joinGame").submit(function(e) {
	e.preventDefault();
	console.log($("#gameId").val());
	socket.emit('gameJoin', {
		reqGameId: $("#gameId").val()
	});
});
$("#uploadForm").submit(function(e) {
	$("#uploadStatus").html("Uploading...");
	$("#uploadForm").find("input[name='socketId']").val(myId);
	//console.log($("#uploadForm").find("input[name='socketId']").val());
	$(this).ajaxSubmit({
		error: function(xhr) {
			$("#uploadStatus").html("Error: " + xhr.status);
			console.log("Error: " + xhr.status)
		},
		success: function(response) {
			$("#uploadStatus").html("Image uploaded.");
			console.log(response);
		}
	});
	return false;
});
socket.on('gameBegin', function(data) {
	console.log(data);
	$("#replayBtn").prop("disabled", true);
	gameId = data.gameId;
})
socket.on('roomFull', function(data) {
	console.log(data);
})
socket.on('gameInfo', function(data) {
	console.log(data);
	for(var key in data.gameData.players) {
		if(key === myId) {
			console.log("I am player " + data.gameData.players[key].player);
			$("#playerInfo").html("Player " + Number(data.gameData.players[key].player+1) + " ('" + data.gameData.players[key].symbol + "')");
			break;
		}
	}
})
socket.on('moveComplete', function(data) {
	var squareId = [data.square_x, data.square_y].join('-');
	if(data.symbol.match('http')) {
		$("#"+squareId).prepend('<img src="' + data.symbol + '" />');
		$("#"+squareId).find(".letter").hide();
	} else {
		$("#"+squareId).find(".letter").html(data.symbol)
	}
	
	
})
socket.on('gameComplete', function(data) {
	console.log(data);
	if(data.winner > -1) {
		$("#gameMessage").html("Game Over! Player " + Number(data.winner+1) + " won.");
	} else {
		$("#gameMessage").html("Game Over! Tie game!");
	}
	
	$("#replayBtn").prop("disabled", false);
});
socket.on('replayMatch', function() {
	$("#replayStatus").html("Replay started!");
	resetBoard();
	$("#replayBtn").prop("disabled", true);
});
socket.on('otherPlayerDisconnect', function() {
	resetBoard();
	$("#playerInfo").html("Other player disconnected :(");
	$("#replayBtn").prop("disabled", true);
});
$("td").click(function() {
	var square = this.id;
	square_x = square.split('-')[0];
	square_y = square.split('-')[1];

	socket.emit('gameMove', {
		gameId: gameId,
		square_x: square_x,
		square_y: square_y

	});

});
$("#replayBtn").click(function() {
	$("#replayStatus").html("Waiting for response...");
	socket.emit('replay', {
		gameId: gameId
	});
});

function resetBoard() {
	for(var i = 0; i < 3; i++) {
		for(var j = 0; j < 3; j++) {
			$("#"+i+'-'+j).find(".letter").html('');
		}
	}
	$("#gameMessage").html('');

}

