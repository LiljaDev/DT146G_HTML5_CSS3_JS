/*******************************************************************************
 * Project Puzzle, Kurs: DT146G
 * File: Puzzle.js
 * Desc: JavaScript file for exam project
 * 		 Includes all puzzle functionality except for scoring which is located
 * 		 in Scores.js	(Also used on its own by highscores.html)
 * Johan Lilja
 * joli1407
 * joli1407@student.miun.se
 ******************************************************************************/
var puzzleImage;	//Current puzzle image
var galleryImages;	//preload array, keep images in memory
var context;	//Canvas context
var puzzle;		//Puzzle object, data on current puzzle size etc
var playerInfo;	//Player object, data on player actions etc
var playing;	//Are we playing or just chilling?
var FPS_CAP = 60;	//How many times a second canvas is redrawn
var updateIntervalID;	//ID of the update interval (redraw canvas, update timer etc..)
var timer;	//Remaining puzzle time in seconds, players are allowed to finish puzzle after timer reaches zero
var TIMER_LEVELS = [3*60, 20*60, 45*60, 60*60];	//Start values for timer on different difficulty levels

//Called on window load
//Do some initial setup of all the components
function start()
{
	playing = false;	//Are we playing yet? No
	playerInfo = new PlayerInfo();
	puzzle = new Puzzle();
	
	//Create the puzzle canvas
	canvas = document.createElement('canvas');
 	canvas.width = 960;
 	canvas.height = 640;
 	context = canvas.getContext("2d");
 	
 	//Append canvas and style its containing div
 	var puzzleArea = document.getElementById("puzzleArea");
 	puzzleArea.appendChild(canvas);
 	puzzleArea.style.height = canvas.height + "px";
 	puzzleArea.setAttribute("max-width", canvas.width + "px");
 	puzzleArea.setAttribute('style', 'float:left');

	//Puzzle image
	puzzleImage = new Image();
	puzzleImage.addEventListener("load", function(){	//Draw this image when its fully loaded
			puzzleImage.width = canvas.width;
			puzzleImage.height = canvas.height;
			drawCompleteImage();
	});
	
	 //Set click listeners on all gallery thumbnails, also preload all the images
	galleryImages = new Array();
 	var thumbs = document.getElementsByClassName("thumb");
	for(var i = 0; i < thumbs.length; ++i){
		thumbs[i].addEventListener("click", clickThumb);
		galleryImages[i] = new Image();
		galleryImages[i].src = thumbs[i].src.replace("_thumb", "");	//If we find that the image has a _thumb postfix we remove it to load the corresponding HQ image
	}
	puzzleImage.src = galleryImages[0].src;	//Load the first image in gallery as the start image
	
	//Start button
	//When pressing start we either generate the puzzle and start the game
	//or stop the game(stop the update interval, clear timer, draw the finished image etc)
	document.getElementById("startButton").addEventListener("click", function(e){
		if(!playing){
			createPuzzle();	//Generate the puzzle from currently selected image
			startPuzzle();	//Start puzzling!
		}
		else{
			stopPuzzle();
			drawCompleteImage();
		}
	});
	
	//Load image from local filesystem
	var fileDialog = document.getElementById("fileDialog");
	fileDialog.disabled = false;
	fileDialog.accept = "image/*";
	fileDialog.onchange = function(e){
		var file = e.target.files[0];
		if(!file.type.match("image.*")){	//If file is not identified as an image
			alert("Selected file is not a compatible image file!\nPlease select another image.");
			fileDialog.value = null;	//So that the file name doesn't show for an unused file
			return;	//Abort mission
		}
			
		var fileReader = new FileReader();
		fileReader.addEventListener("load", function(e){	//When file is fully read
			puzzleImage.src = e.target.result;	//Load image
		});
		
		fileReader.readAsDataURL(file);
	};
}

//Returns what difficulty the user has selected
function getDifficulty()
{
	var diffButtons = document.getElementsByName("difficulty");	//Find all the "difficulty" marked radio buttons for examination
	var difficulty;
	for(var i = 0; i < diffButtons.length; ++i)
	{
		var button = diffButtons[i];
		if(button.checked == true)
			difficulty = button.value;
	}
	
	//*********This did not work in IE11**********//
	/*for(tmp in diffButtons){
		if(diffButtons[tmp].checked == true){
			difficulty = diffButtons[tmp].value;
		}
	}*/
	
	return difficulty;
}

//Function for thumbnail event "click"
//Loads the HQ image equivalent of thumbnail
function clickThumb(e)
{
	var selSrc = e.target.src;
	selSrc = selSrc.replace("_thumb", "");
	puzzleImage.src = selSrc;
}

//Draws the currently selected image in its original form
function drawCompleteImage()
{
	context.clearRect(0, 0, canvas.width, canvas.height);
	context.drawImage(puzzleImage, 0, 0, puzzleImage.width, puzzleImage.height);	//Draw image
}

//Sets the timer based on selected difficulty
function setTimer()
{
	difficulty = getDifficulty();
	switch(difficulty)
	{
		case "easy":
			timer = TIMER_LEVELS[0];
			break;
		case "normal":
			timer = TIMER_LEVELS[1];
			break;
		case "hard":
			timer = TIMER_LEVELS[2];
			break;
		case "enthusiast":
			timer = TIMER_LEVELS[3];
			break;
	}
}
	
//Displays formatted version of timer(seconds left) in timer-element on the site
function updateTimer()
{
	var minutes = Math.floor(timer/60);
	var seconds = Math.floor(timer%60);
	
	var time = ((minutes < 10) ? "0" + minutes : minutes);
	time += ":" + ((seconds < 10) ? "0" + seconds : seconds);
	document.getElementById("timer").textContent = time;
	if(timer > 0){
		timer-=1/FPS_CAP;
	}
	else{
		timer = 0;
	}
}
	
//Canvas mousedown event function
function mouseDown(e)
{
	playerInfo.dragging = true;	//The player is dragging something
	playerInfo.selectedPiece.x = Math.floor((e.clientX - canvas.getBoundingClientRect().left) / puzzle.pieceWidth);	//Calculate the x-position of the piece that the player clicked
	playerInfo.selectedPiece.y = Math.floor((e.clientY - canvas.getBoundingClientRect().top) / puzzle.pieceHeight);	//Calculate the y-position of the piece that the player clicked
}

//Canvas mousemove event function
function mouseMove(e)
{
	//Calculate and store current mouse position relative to canvas
	playerInfo.position.x = e.clientX - canvas.getBoundingClientRect().left;
	playerInfo.position.y = e.clientY - canvas.getBoundingClientRect().top;
}

//Canvas mouseup event function
function mouseUp(e)
{
	//If the player let go of mouse button while dragging then we have to swap pieces
	if(playerInfo.dragging == true){
		playerInfo.dragging = false;
		swapPieces(Math.floor(playerInfo.position.x / puzzle.pieceWidth), Math.floor(playerInfo.position.y / puzzle.pieceHeight));	//Will swap the piece where player fired mousedown and the piece where mouseup fired
		if(checkWinCondition()){	//If all the pieces are in the correct place
			draw();	//Make sure the latest swap is visible while win msg etc is displayed
			onWin();
		}
	}
}

//Handle the win situation(all pieces in the correct place)
function onWin()
{
	var score = Math.floor(timer * puzzle.width * puzzle.height);	//Score is the remaining time in seconds multiplied with the number of puzzle pieces
	var position = evaluateScore(score);	//Returns a valid position(>0) if players score deserves a place on the highscores
	loadScores();	//Update the highscore list since evaluateScore() might save new scores
	var winText = "You succeeded!\nScore: " + score + ((position > 0) ? ("\nYou took position " + position + "!") : "\nTry harder next time..");	//Appropriate text based on position
	alert(winText);	//Win message
	stopPuzzle();	//Stop the game
}

//Evaluates if parameter score takes a place on the highscores
//If it does it is placed in current highscores and saved
//Also returns a valid position(>0) if the score was high enough
function evaluateScore(score)
{
	var scores = loadScores();
	for(var i = 0; i < scores.length; ++i){
		if(score > scores[i]){
			scores.splice(i, 0, score);
			saveScores(scores);
			return i+1;
		}
	}
	
	return -1;
}

//Returns true if every puzzle piece's correct position matches the current position in puzzle grid
function checkWinCondition()
{	
	for(var i = 0; i < puzzle.grid.length; ++i){
		for(var j = 0; j < puzzle.grid[i].length; ++j){
			if(puzzle.grid[i][j].cPosY != i || puzzle.grid[i][j].cPosX != j)
				return false;	//We found a piece in the wrong position
		}
	}
	return true;	//Every piece is in the correct grid position
}

//Swap the piece that the player was dragging with the one where the player dropped it
//Parameters "otherPieceX/Y" is the x/y-position of the piece where the mouseup event fired
function swapPieces(otherPieceX, otherPieceY)
{
	var tmpPiece = puzzle.grid[otherPieceY][otherPieceX];
	puzzle.grid[otherPieceY][otherPieceX] = puzzle.grid[playerInfo.selectedPiece.y][playerInfo.selectedPiece.x];
	puzzle.grid[playerInfo.selectedPiece.y][playerInfo.selectedPiece.x] = tmpPiece;
}

//Generate a new puzzle based on difficulty and the selected image
function createPuzzle()
{
	//Set the puzzle height based on difficulty
	difficulty = getDifficulty();
	switch(difficulty)
	{
		case "easy":
			puzzle.height = 4;
			break;
		case "normal":
			puzzle.height = 8;
			break;
		case "hard":
			puzzle.height = 10;
			break;
		case "enthusiast":
			puzzle.height = 16;
			break;
	}
	puzzle.width = puzzle.height * 1.5;	//Set the puzzle width based on puzzle height
	//Calc the size of a puzzle piece
	puzzle.pieceHeight = canvas.height / puzzle.height;	
	puzzle.pieceWidth = canvas.width / puzzle.width;
	
	//Setup puzzle pieces
	var puzzlePieces = new Array(puzzle.width*puzzle.height);
	//var puzzlePieces = new Array(puzzle.width*puzzle.height);
	for(var i = 0; i < puzzlePieces.length; ++i){
		//Calc correct x/y position
		//Also x/y starting position which is the coords to the top left corner of piece on the original image
		puzzlePieces[i] = new PuzzlePiece(i%puzzle.width, Math.floor(i/puzzle.width), puzzle.pieceWidth*(i%puzzle.width), puzzle.pieceHeight*(Math.floor(i/puzzle.width)));
	}
	
	//Set up puzzle grid with random scattering of pieces
	//This array holds all values that are valid indexes for the puzzlePieces array
	//By randomizing an index to this array, using the value of that element and then removing the element we stop the same pieces from occuring multiple times
	var indexes = new Array(puzzle.width*puzzle.height);
	for(var i = 0; i < indexes.length; ++i){
		indexes[i] = i;
	}
	
	//Fill the grid with puzzle pieces by using the indexes array to keep track of pieces already in use
	puzzle.grid = new Array(puzzle.height);
	for(var i = 0; i < puzzle.grid.length; ++i){
		puzzle.grid[i] = new Array(puzzle.width);
		for(var j = 0; j < puzzle.grid[i].length; ++j){
			var idx = Math.floor(Math.random() * indexes.length);
			puzzle.grid[i][j] = puzzlePieces[indexes[idx]];
			indexes.splice(idx, 1);
		}
	}
}

//Draws the puzzle
function draw()
{
	context.clearRect(0, 0, canvas.width, canvas.height);
	
	//Since the drawImage function of canvas uses the original image size we need to calc the scaling from canvas size to original size
	var sx = puzzleImage.naturalWidth/puzzleImage.width;
	var sy = puzzleImage.naturalHeight/puzzleImage.height;
	
	var activePiece;	//If the player is dragging a piece this var is used to hold a ref to that piece
	for(var i = 0; i < puzzle.grid.length; ++i){
		for(var j = 0; j < puzzle.grid[i].length; ++j){
			if(playerInfo.dragging && playerInfo.selectedPiece.y == i && playerInfo.selectedPiece.x == j){	//If the player is dragging this piece we skip drawing it for now
				activePiece = puzzle.grid[i][j];
			}
			else{	//Draw the piece
				//Pieces are drawn by cropping the puzzle image based on previously calculated data
				context.drawImage(puzzleImage,
				puzzle.grid[i][j].xStart*sx,
				puzzle.grid[i][j].yStart*sy,
				puzzle.pieceWidth*sx,
				puzzle.pieceHeight*sy,
				j*puzzle.pieceWidth,
				i*puzzle.pieceHeight,
				puzzle.pieceWidth,
				puzzle.pieceHeight);
			}
		}
	}
	
	//If the player is dragging we draw that piece last(on top of everything else)
	if(playerInfo.dragging){
		context.drawImage(puzzleImage,
			activePiece.xStart*sx,
			activePiece.yStart*sy,
			puzzle.pieceWidth*sx,
			puzzle.pieceHeight*sy,
			playerInfo.position.x-puzzle.pieceWidth/2,
			playerInfo.position.y-puzzle.pieceHeight/2,
			puzzle.pieceWidth,
			puzzle.pieceHeight);
	}
}

//Some actions when starting the game
function startPuzzle()
{
	playing = true;	//We are playing
	
	//Should not be possible to change difficulty during play
	var diffButtons = document.getElementsByName("difficulty");
	
	for(var i = 0; i < diffButtons.length; ++i){
		diffButtons[i].disabled = true;
	}
	
	setTimer();	//Set the timer based on difficulty
	
	updateIntervalID = setInterval(function(){	//Start the update interval
			draw();
			updateTimer();
		}, 1000/FPS_CAP);
		
	//Add the listeners to the canvas to allow player to interact with puzzle
	canvas.addEventListener("mousedown", mouseDown);
 	canvas.addEventListener("mouseup", mouseUp);
 	canvas.addEventListener("mousemove", mouseMove);
 	
 	//Should not be possible to change image during play
 	var thumbs = document.getElementsByClassName("thumb");
	for(var i = 0; i < thumbs.length; ++i){
		thumbs[i].removeEventListener("click", clickThumb);
	}
	
	document.getElementById("fileDialog").disabled = true;	//Should not be possible to change image during play
 	document.getElementById("startButton").value = "Stop";	//Start button is now a stop button
}

//Some actions when stopping the game
function stopPuzzle()
{
	playing = false;	//No longer playing
	document.getElementById("timer").textContent = "00:00";	//Zero the timer text
	
	//Difficulty can now be changed
	var diffButtons = document.getElementsByName("difficulty");
	for(var i = 0; i < diffButtons.length; ++i){
		diffButtons[i].disabled = false;
	}
	
	clearInterval(updateIntervalID);	//Stop the update interval
	
	//Player should no longer interact with canvas
	canvas.removeEventListener("mousedown", mouseDown);
	canvas.removeEventListener("mouseup", mouseUp);
	canvas.removeEventListener("mousemove", mouseMove);
	
	//Set click listeners on all thumbnails
 	var thumbs = document.getElementsByClassName("thumb");
	for(var i = 0; i < thumbs.length; ++i){
		thumbs[i].addEventListener("click", clickThumb);
	}
	document.getElementById("fileDialog").disabled = false;	//Image can now be changed
	
	document.getElementById("startButton").value = "Start";	//Start button is now a start button again
}

//"Class" that holds puzzle info
function Puzzle(puzzleHeight, puzzleWidth, pieceHeight, pieceWidth, puzzleGrid)
{
	this.height = 0;	//Number of rows of pieces
	this.width = 0;	//Number of columns of pieces
	this.pieceHeight = 0;	//The piece size(px)
	this.pieceWidth = 0;	//The piece size(px)
	this.grid = null;		//The generated puzzle grid
}

//"Class" that holds player info
function PlayerInfo()
{
	this.dragging = false;	//Is the player dragging a piece?
	this.selectedPiece = new Position(0, 0);	//Position of the dragged piece
	this.position = new Position(0, 0);	//Player(mouse) position relative to canvas
}

//"Class" for 2D coords
function Position(x, y)
{
	this.x = x;
	this.y = y;
}

//"Class" for a puzzle piece
function PuzzlePiece(cPosX, cPosY, xStart, yStart)
{
	this.cPosX = cPosX;	//Correct(goal) position
	this.cPosY = cPosY;	//Correct(goal) position
	this.xStart = xStart;	//Top left coords on the original image used when drawing piece(cropped original image)
	this.yStart = yStart;	//Top left coords on the original image used when drawing piece(cropped original image)
}

window.addEventListener("load", start);