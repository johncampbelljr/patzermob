
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
setInterval(winning_move,10000);

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
		move = querystring.parse(POST);
		move_key = move['from'] + move['to'];
		console.log(move_key);
   	
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

app.listen(8125);

io.sockets.on( 'connection', function ( socket ) {
    socket.volatile.emit( 'notification' , "hello world" );
});

function make_move(){
	var winning_move = winning_move();
	chess.move(winning_move);
	post_move();
}

function winning_move()
{
	var winning_total = 0;
	var winning_move = new Array(); // capture ties
	for(var move in votes)
	{
		var total = votes[move];
		if ( total >= winning_total ) {
			console.log('move ' + move + ' votes ' + total);
			winning_move.push(move);
		}
	}

	if ( winning_move.length == 0 ) {
		var moves = chess.moves();
		winning_move.push(moves[Math.floor(Math.random()*moves.length)]);
	}
	console.log('winning move = ' + winning_move[Math.floor(Math.random()*winning_move.length)]);
	var move_key = winning_move[Math.floor(Math.random()*winning_move.length)];
	console.log("from=" + move_key.substring(0,2)+ " to=" + move_key.substring(2,4));
	var move = { from : move_key.substring(0,2), to: move_key.substring(2,4)};
	chess.move(move_key);
	post_move();
	console.log(chess.ascii());
	var return_obj = {
                board : chess.fen()
                };
	io.sockets.emit('move_complete',return_obj);
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
console.log('Server running at http://127.0.0.1:8125/');
