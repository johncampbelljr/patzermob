
var http = require('http');
var fs = require('fs');
var path = require('path');
var url = require("url");
var ch = require('./chess')
var static = require('node-static');
var sys = require('util');
var querystring = require('querystring')

var chess = new ch.Chess();
var votes = Array();
var total_votes = 0;
var winning_to = "";
setInterval(winning_move,20000);

var file = new(static.Server)('.', { cache: 7200, headers: {'X-Hello':'World!'} });

var app = http.createServer(function (request, response) {
 
    console.log('request starting [' + request.url + ']');
    var myurl = url.parse(request.url, true);  
    var pathname = myurl.pathname;  
   
   if(pathname === "/ajax/move" ) { 
   	var POST = "";
	var move;
        request.addListener('data', function(chunk){
	        POST += chunk;
	}).addListener('end', function(){
		console.log("POST = " + POST);
		move = querystring.parse(POST);
		move_key = move['from'] + move['to'];
		console.log("move_key=" + move_key);
   	
	var legal_move = chess.check_move(move);
	var vote_count = -1;	
	if ( legal_move ) {
		if ( votes[move_key] == null ) {
			votes[move_key] = 0;
		}
		vote_count = votes[move_key] + 1;
		console.log("vote count = " + vote_count);
		votes[move_key] = vote_count;
	}
	var return_obj = {
		valid : legal_move,
		move : move,
		vote_count : vote_count
	};
    	response.writeHead(200, {'Content-Type': 'application/json'});
      	response.end(JSON.stringify(return_obj));
	total_votes++;
	io.sockets.emit('vote_update',{vote_count: total_votes});
	});
	return;
    }

    if ( pathname === "/ajax/board" ) {
    	var return_obj = {
		board : chess.fen()
		};
    	response.writeHead(200, {'Content-Type': 'application/json'});
      	response.end(JSON.stringify(return_obj));
	return;

    }
    
    loadStatic(request, response);
});

var io = require('socket.io').listen(app);
io.configure(function () { 
  io.set("transports", ["xhr-polling"]); 
  io.set("polling duration", 10); 
});

var port = process.env.PORT || 5000;
app.listen(port);

io.sockets.on( 'connection', function ( socket ) {
    var info = get_game_info();
    info.color = get_new_player_color();    
    socket.volatile.emit( 'join_game' , info);
    socket.on('disconnect', function() {
    });
});

function get_new_player_color()
{	
	return Math.round(Math.random()) ? 'w' : 'b';
}

function get_game_info() {
	var return_obj = {
                board : chess.fen(),
		inCheck : chess.in_check(),
		inCheckmate: chess.in_checkmate(),
		inStalemate: chess.in_stalemate(),
		turn: chess.turn(),
		vote_count: total_votes,
		winning_to: winning_to
                };
	return return_obj;
}

function make_move(){
	var winning_move = winning_move();
	chess.move(winning_move);
	post_move();
}

function winning_move()
{
	var winning_total = 0;
	var winning_move = new Array(); // capture ties
	console.log('votes' + votes.length);
	for(var move in votes)
	{
		var total = votes[move];
		if ( total >= winning_total ) {
			console.log('move ' + move + ' votes ' + total);
			winning_move.push(move);
		}
	}

	// if there is no winning move, just do a random move
	if ( winning_move.length == 0 ) {
		var moves = chess.moves();
		winning_move.push(moves[Math.floor(Math.random()*moves.length)]);
		winning_to = winning_move[0];
		chess.move(winning_move[0]);
	} else {
		var move_key = winning_move[Math.floor(Math.random()*winning_move.length)];
		var move = { from : move_key.substring(0,2), to: move_key.substring(2,4), promotion: 'q'};
		var rv = chess.move(move);
		winning_to = move_key.substring(2,4);	
		console.log(rv);
	}
	post_move();
	console.log(chess.ascii());
	total_votes = 0;
	io.sockets.emit('move_complete',get_game_info());
	if ( chess.game_over() )
	{
		chess.reset();
	}
}

function post_move()
{
	for (var i in votes) {
		delete votes[i];
	}
}
function loadStatic(request,response) {
	file.serve(request, response, function (err, res) {
            if (err) { // An error as occured
	    	sys.error("> Error serving " + request.url + " - " + err.message);
		response.writeHead(err.status, err.headers);
		response.end();
	} else { // The file was served successfully
		sys.puts("> " + request.url + " - " + res.message);
	}
	});
} 
