/*******************************************************************************
 * Project Puzzle, Kurs: DT146G
 * File: Scores.js
 * Desc: JavaScript file for exam project
 * 		 Functionality for loading/saving scores
 * Johan Lilja
 * joli1407
 * joli1407@student.miun.se
 ******************************************************************************/

var LIST_SIZE = 5;
var SAVE_NAME = "score";

//Load scores from localStorage
//Writes the scores to element with the id=highscores
//Returns an array containing the scores
function loadScores()
{
	var highscoresElement = document.getElementById("highscores");
	highscoresElement.innerHTML = "Highscores";
	var scores = new Array(LIST_SIZE);
	
	for(var i = 0; i < scores.length; ++i){
		var tmp;
		if(tmp = localStorage.getItem(SAVE_NAME + i)){
			scores[i] = tmp;
		}
		else{
			scores[i] = Math.floor(500/(i+1));
		}
		
		highscoresElement.innerHTML += "<li>" + (i + 1) + ". " + scores[i] + "</li>";
	}
	
	return scores;
}

//Save scores to localStorage
function saveScores(scores)
{
	for(var i = 0; i < LIST_SIZE; ++i){
		localStorage.setItem(SAVE_NAME+i, scores[i]);
	}
}

window.addEventListener("load", loadScores);