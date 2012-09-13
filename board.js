var fenChars = "KQRBNPkqrbnp";
var colChars = "ABCDEFGH";
var chess = new Chess();

function getChessFontCharFromFen(fenChar) {
	return String.fromCharCode(9812 + this.fenChars.indexOf(fenChar));
}

// state when waiting for the other side to move
function awaitingMove() {
}

function postMove() {
}

var highlightList = [];

var from;
function unHighlight()
{
	for(hl in highlightList) {
		var item = highlightList[hl];
		item.attr("style","");
		item.off('click');
	}
	highlightList = [];
}

function makeMove(event) {
	var url = 'ajax/move';
	$.ajax({
	  type: 'POST',
	  url: url,
	  data: "from=" + from.toLowerCase() +"&to=" + $(event.target).attr("id").toLowerCase() + "&promotion=q",
	  success: function(data) {
		unHighlight();	
		var char = $("#" + from).text();
		$("#" + from).text("");
		$(event.target).text(char);
		$(event.target).attr("style","background-image: none; background-color: rgb(0, 255, 0);");
		highlightList.push($(event.target));
	  }
	});
}

function extractAlegraCoord(move)
{
	list += move + " ";
	var clean = move.replace(/#/g,"").replace(/\+/g,"").replace(/Q/g,"").replace(/\=/g,"");
	if (clean == "O-O") {
		clean = "g1";
	}
	if (clean == "O-O-O") {
		clean = "c1";
	}
	return clean.substr(clean.length-2);
}

function fromMoveClick(event)
{
	unHighlight();
	var target = $(event.target);
	from = target.attr("id");
	target.attr("style","background-image: none; background-color: rgb(255, 255, 161);");
	highlightList.push(target);

	var list = "";	
	var moves = chess.moves({ target: $(event.target).attr("id").toLowerCase()});
	for(move in moves) {
		target = getSquare(extractAlegraCoord(moves[move]));
		target.attr("style","background-image: none; background-color: rgb(255, 255, 161);");
		target.click(makeMove);
		highlightList.push(target);
	}
	$("#list").text(list);
}

var side = '';

function isMyPiece(fenPiece)
{
	var whitePieces = "KQRBNP";
	var is_white_piece = whitePieces.match(fenPiece);
	return side === 'w' ? is_white_piece : !is_white_piece;
}

function updateInfo(data)
{
		if ( data.turn == 'b' ) {
			$("#turn").text("Turn: Black");
		} else {
			$("#turn").text("Turn: White");
		}
		$("#vote_count").text("Vote Count: " + data.vote_count);
	if ( data.inCheck ) {
		$("#check").text("CHECK");
	} else {
		$("#check").text("");
	}
	if ( data.inCheckmate ) {
		$("#mate").text("CHECKMATE");
	} else {
		$("#mate").text("");
	}
}
function getSquare(algebraCoords)
{
	return $("#" + algebraCoords.toUpperCase());
}


function createBoard(is_white)
{
	for(var rank = 1; rank < 9; rank++) {
		var tr = $('#chess_board tbody:last').append("<tr>");
		for(var file = 0; file < 8; file++) {
			var td = '<td id = "'+ colChars[is_white ? file : 7 - file ] + (is_white ? 9-rank : rank) + '" class="piece"></td>';
			$('#chess_board tr:last').append(td);
		}
	}
}

$(function() {
	
	var socket = io.connect('secure-wave-5245.herokuapp.com');
      	socket.on('join_game', function (data) {
		side = data.color;
		createBoard(side === 'w');	
		updateInfo(data);
		displayFen(data.board);
      	
	socket.on('move_complete', function (data) {
		unHighlight();
		updateInfo(data);
		displayFen(data.board);
		var clean = extractAlegraCoord(data.winning_to);
		$('#winning_to').text(data.winning_to + ":" + clean);
		getSquare(clean).effect("highlight", {color: "#ff0000"}, 1000);
      	});

	socket.on('vote_update', function(data) {
		updateInfo(data);
		$("#vote_count").text("Vote Count: " + data.vote_count);
	});
      	});
});

function displayFen(fenString) {
	chess = new Chess(fenString);
	$("td").text("").off('click');;
	var ranks = fenString.split(/\s/g)[0].split("/");
	ranks.forEach(function(element, index, array) {
		var colNo = 0;
		for (var idx = 0; idx < element.length; idx++) {
			var char = element.charAt(idx);
			if ( char.match(/[0-8]/) ) {
				colNo+=char/1;
				continue;
			}
			id = "#" + colChars.charAt(colNo) + (8 - index); 
			var item = $(id);
			item.text(getChessFontCharFromFen(char));
			
			if ( isMyPiece(char) ) {
				item.click(fromMoveClick);
			}

			colNo++;		
		}
	});
}
