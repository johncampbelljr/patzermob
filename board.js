var fenChars = "KQRBNPkqrbnp";
var colChars = "ABCDEFGH";
var chess = new Chess();
var side = '';
var highlightList = [];
var from;
var sec_remaining;

function isPlayingWhite() {
	return side === 'w';
}

function getChessFontCharFromFen(fenChar) {
	return String.fromCharCode(9812 + this.fenChars.indexOf(fenChar));
}

function unHighlight()
{
	for(hl in highlightList) {
		var item = highlightList[hl];
		item.attr("style","");
		item.off('click');
	}
	highlightList = [];
}

function detectPromotion(from, to)
{
	var piece = $("#" + from.toUpperCase()).text();
	// is it a pawn?
	if (piece == String.fromCharCode(9817) || piece == String.fromCharCode(9823)) {
		var rank = $(event.target).attr("id").match(/[1-8]/);
		if ( (isPlayingWhite() && rank == '8') || (!isPlayingWhite() && rank == '1')) {
			$( "#promotion-dialog" ).dialog({
			resizable: false,
			height:140,
			modal: true,
			open: function(event, ui) {
				var queen = isPlayingWhite() ? "Q" : "q";
				var rook = isPlayingWhite() ? "N" : "n";
				$("#queen").text(getChessFontCharFromFen(queen))
				.click(function() {
					sendMove(from, to, "q");
					$("#promotion-dialog").dialog('close');
				}); 
				$("#knight").text(getChessFontCharFromFen(rook))
				.click(function() {
					sendMove(from, to, "n");
					$("#promotion-dialog").dialog('close');
				}); 
			}
			});
			return true;			
		}
	}
	return false;
}

function sendMove(from, to, promotion) {
	// format data
	var data = "from=" + from +"&to=" + to;
	if ( promotion ) {
		data += "&promotion=" + promotion;
	}
	$.ajax({
	  type: 'POST',
	  url: 'ajax/move',
	  data: data,
	  success: function(data) {
		unHighlight();	
		var fromObj = $("#" + from.toUpperCase());
		var char = fromObj.text();
		if ( promotion ) {
			var promChar = isPlayingWhite() ? promotion.toUpperCase() : promotion;
			char = getChessFontCharFromFen(promChar);
		}
		fromObj.text("");
		var toObj = $("#" + to.toUpperCase());
		toObj.text(char);
		toObj.attr("style","background-image: none; background-color: rgb(0, 255, 0);");
		highlightList.push(toObj);
		$("td").off('click');
	  }
	});
}

function makeMove(event) {
	if ( detectPromotion(from.toLowerCase(), $(event.target).attr("id").toLowerCase()) ) return;
	sendMove(from.toLowerCase(), $(event.target).attr("id").toLowerCase());
}

function extractAlegraCoord(move)
{
	list += move + " ";
	var clean = move.replace(/#/g,"").replace(/\+/g,"").replace(/Q/g,"").replace(/\=/g,"");
	if (clean == "O-O") {
		clean = isPlayingWhite() ? "g1" : "g8";
	}
	if (clean == "O-O-O") {
		clean = isPlayingWhite() ? "c1" : "c8";
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

function tick()
{
	$('#timer').text(sec_remaining);
	sec_remaining--;
}

function isMyPiece(fenPiece)
{
	var whitePieces = "KQRBNP";
	var is_white_piece = whitePieces.match(fenPiece);
	return isPlayingWhite() ? is_white_piece : !is_white_piece;
}

function updateInfo(data)
{
	sec_remaining = data.sec_remaining;
	if ( data.turn == 'b' ) {
		$("#turn").text("Black");
	} else {
		$("#turn").text("White");
	}
	$("#vote_count").text("Vote Count: " + data.vote_count);
	
	$("#check").text("");
	if ( data.inCheck ) {
		$("#check").text("CHECK");
	} 
	
	if ( data.inCheckmate || data.inStalemate || data.insufficient_material || data.in_threefold_repetition ) {
		if ( data.inCheckmate ) $("#check").text("CHECKMATE");
		if ( data.inStalemate ) $("#check").text("Stalemate");
		if ( data.insufficient_material ) $("#check").text("Insufficient Material");
		if ( data.in_threefold_repetition ) $("#check").text("Threefold Repetition");
		$("#remaining").text("New Game Starting In: ");
	} else {
		$("#remaining").text("Time Remaining: ");
	}
}

function getSquare(algebraCoords)
{
	return $("#" + algebraCoords.toUpperCase());
}

function createBoard(is_white)
{
	$('#chess_board tbody').empty();
	for(var rank = 1; rank < 9; rank++) {
		var tr = $('#chess_board tbody:last').append("<tr>");
		for(var file = 0; file < 8; file++) {
			var td = '<td id = "'+ colChars[is_white ? file : 7 - file ] + (is_white ? 9-rank : rank) + '" class="piece"></td>';
			$('#chess_board tr:last').append(td);
		}
	}
}

$(function() {
	
      	setInterval(tick,1000);
      	
      	$("#header a").button();
      	$("a").click(function() {
      		$("#aboutDialog").dialog({
      		resizable: false,
      		width:480,
			height:480,
			modal: true,
			buttons: {
				Ok: function() {
					$( this ).dialog( "close" );
				}
			}});
      	});
      	
	var socket = io.connect('secure-wave-5245.herokuapp.com');
	//var socket = io.connect('localhost');
      	socket.on('join_game', function (data) {
		side = data.color;
		$("#playerMessage").text("You are playing " + (data.color === 'w' ? "White" : "Black"));
		createBoard(side === 'w');	
		updateInfo(data);
		displayFen(data.board);
      	
		socket.on('move_complete', function (data) {
			unHighlight();
			updateInfo(data);
			displayFen(data.board);
			var clean = extractAlegraCoord(data.winning_to);
			getSquare(clean).effect("highlight", {color: "#ff0000"}, 1000);
		});

		socket.on('new_game', function (data) {
			unHighlight();
			updateInfo(data);
			displayFen(data.board);
		});

		socket.on('vote_update', function(data) {
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
