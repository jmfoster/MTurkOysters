/*
 * Requires:
 *     psiturk.js
 *     utils.js
 */

// Initalize psiturk object
var psiTurk = PsiTurk(uniqueId, adServerLoc);

var mycondition = condition;  // these two variables are passed by the psiturk server process
var mycounterbalance = counterbalance;  // they tell you which condition you have been assigned to
// they are not used in the stroop code but may be useful to you

var bonusCount = 0; //used to pass bonus from ShapesExperiment to Questionaire

// All pages to be loaded
var pages = [
	"instructions/instruct-1.html",
	"instructions/instruct-2.html",
	"instructions/instruct-3.html",
	"instructions/instruct-ready.html",
	"stage.html",
	"postquestionnaire.html"
];

psiTurk.preloadPages(pages);

var instructionPagesTraining = [ // add as a list as many pages as you like
	"instructions/instruct-1.html",
	//"instructions/instruct-2.html",
	//"instructions/instruct-3.html",
	//"instructions/instruct-ready.html"
];

var instructionPagesTest = [ // add as a list as many pages as you like
	//"instructions/instruct-1.html",
	"instructions/instruct-2.html",
	//"instructions/instruct-3.html",
	//"instructions/instruct-ready.html"
];


/********************
* HTML manipulation
*
* All HTML files in the templates directory are requested 
* from the server when the PsiTurk object is created above. We
* need code to get those pages from the PsiTurk object and 
* insert them into the document.
*
********************/

/********************
* SHAPES TEST       *
********************/
var ShapesExperiment = function(phase) {
	var maxTrainingTrials = 100;
	var nTestingTrials = 40;
	var trial = 0;
	var listening = false;
	var trialStartTime;
	var trialType;
	
	//var colors = ["goldenrod", "orange", "darkgoldenrod", "darkorange"]
	//var colors = ["sienna", "darkred", "crimson", "firebrick"]; //v5.0 pretty good balance, or change crimson to maroon to be harder
	//var colors = ["darkbrown", "darkred", "maroon", "brown"]; //really hard color discrimination
	var colors = ["sienna", "darkred", "peru", "goldenrod"]; //v6.0
	
	var sides = [0,3,4,6];
	//v4.0: 40/15?
	//v5.0: 35/20?
	//v6.0: 37.5/17.5
	var size = 37.5;			
	var separation = 17.5;
	
	var trainingTrialSequence; //array of trial types
	var testTrialSequence; //array of trial types
	var A;
	var C;
	var B;
	var AC;
	var D;
	
	var ACvB = 0; //count of times choosing AC over B
	
	var means = [0, 0, 0, 0, 0]; //initialize array, set in setConditionsAndCounterbalances()
	var variances = [0, 0, 0, 0, 0];	//initialize array, set in setConditionsAndCounterbalances()
	var rewards = [0,0]; //reward for current trials r[0] is left and r[1] is right
	var correctChoice; //correct choice for current trial
	var correctCount = 0; //count of correct choices in a row
	bonusCount = 0; //count of total test trials correct //now a global variable (bad practice)
	//var trainingCriterion = 2;
	//need separate criterions for the different categories 
	//var testCriterion= 2;
	var corrAB = 0;
	var corrBC = 0;
	var corrAC = 0;
	var corrCD = 0;
	var corrBD = 0;
	var critAB = 5;
	var critBC = 5;
	var critAC = 0;
	var critCD = 5;
	var critBD = 0;
	
	var scalingFactor = 1.7; //linear scaling of rewards
	
	var generateStimulusStructure = function() {
	    //templates
		var t1 = [[1,2,3,4],
				  [2,3,4,1],
			      [3,4,1,2],
				  [4,1,2,3]];

		var t2 = [[1,2,3,4],
				  [2,4,1,3],
			 	  [4,3,2,1],
				  [3,1,4,2]];

		var t3 = [[1,2,3,4],
				  [3,4,2,1],
				  [2,1,4,3],
				  [4,3,1,2]];

		var t4 = [[1,2,3,4],
				  [2,1,4,3],
				  [3,4,1,2],
				  [4,3,2,1]];
		
		var templates = [t1, t2, t3, t4];
		
		// 1. Randomly pick one of the four templates above.
		var t = templates[Math.floor(Math.random()*templates.length)];

		// 2. Randomly permute the rows and the columns.
		//permute rows
		t = _.shuffle(t);
		//permute columns
		var indices = [0,1,2,3];
		indices = _.shuffle(indices);
		tNew = new Array(4);
		for(i=0; i<4; i++) { 
			tNew[i] = new Array(4);
			for(j=0; j<4; j++) {
				tNew[i][j] = t[i][indices[j]];
			}
		}
		return tNew;
	};
	
	
	var setConditionsAndCounterbalances = function() {
		highMean = 20;
		lowMean = 10;
		middleMean = 15;
		lowestMean = 5;
		
		//highVar = 5; //v<8
		highVar = 10; //v8
		lowVar = 1;
		middleVar = 2;
		
		//assign types (color columns same vs. shape rows same) to A and C
		if(mycounterbalance==0) {	//type 0 is high mean (A)
			A = 0;
			C = 1;
		}
		else if(mycounterbalance==1) {	//type 1 is high mean (A)
			A = 1;
			C = 0;
		}
		B = 2;
		AC = 3;
		D = 4;
		
		means[A] = highMean;
		means[B] = middleMean;
		means[C] = lowMean;
		means[AC] = middleMean;
		means[D] = lowestMean;
		
		
		if(mycondition==0) {	//high mean cat. is high variance
			variances[A] = highVar;
			variances[C] = lowVar;
		}
		else if(mycondition==1) {	//low mean cat. is high variance
			variances[A] = lowVar;
			variances[C] = highVar;
		}
		variances[B] = middleVar;
		variances[AC] = middleVar;
		variances[D] = middleVar;
		//types = [0,1,2,3, 4];
	
	};
	
	var generateTrialSequence = function() {
	
		var nTrainingTrials = maxTrainingTrials;
		//trainingTrialSequence = ["AC", "AB", "BC", "BD", "CD", "CD"]; //v5-6
		//trainingTrialSequence = ["AC", "AB", "BC"]; //v7
		trainingTrialSequence = [];
		while(trainingTrialSequence.length<nTrainingTrials) {
			//trainingTrialSequence.extend(["AC", "AB", "BC", "BD", "CD", "CD"]); //v5-6
			//trainingTrialSequence.extend(["AC", "AB", "BC"]) //v7
			seq = ["AB", "BC", "CD"]; //v8
			seq = _.shuffle(seq);
			trainingTrialSequence.extend(seq);
		}
		//trainingTrialSequence = _.shuffle(trainingTrialSequence);
		
		
		//var nTestingTrials = 40; //set above in exp parameteres
		//testTrialSequence = ["AC", "AB", "BC", "CD", "BD", "ACB"]; //v5-6
		//testTrialSequence = ["AC", "AB", "BC", "ACB"]; //v7
		testTrialSequence = [];
		while(testTrialSequence.length<nTestingTrials) {
			//testTrialSequence.extend(["AC", "AB", "BC", "CD", "BD", "ACB"]); //v5-6
			//testTrialSequence.extend(["AC", "AB", "BC", "ACB"]); //v7
			seq  = ["AB", "BC", "CD", "ACB"]; //v8
			seq = _.shuffle(seq);
			testTrialSequence.extend(seq);
		}
		//testTrialSequence = _.shuffle(testTrialSequence);
		
	};
	
	var doTrial = function() {
		var c1 = document.getElementById("canvas1");
		var ctx1 = c1.getContext("2d");
		var c2 = document.getElementById("canvas2");
		var ctx2 = c2.getContext("2d");
		
		//clear canvases
		ctx1.clearRect(0,0,c1.width, c1.height);
		ctx2.clearRect(0,0,c2.width, c2.height);
		
		//draw background shell image
		//var img1 = new Image();
		//img1.src = "/static/images/scallop_shell.svg";
		//ctx1.drawImage(img1, 0, 0, c1.width, c1.height);
		
		//draw background shell image
		//var img2 = new Image();
		//img2.src = "/static/images/scallop_shell.svg";
		//ctx2.drawImage(img2, 0, 0, c2.width, c2.height);
		
		var maxTrial = 0;
		var criterionMet = false;
		if(phase=="train") {
			trialType = trainingTrialSequence[trial];
			maxTrial = maxTrainingTrials;
			if(corrAB>=critAB && corrBC>=critBC && corrAC>=critAC && corrBD>=critBD && corrCD>=critCD) {
				criterionMet = true;
			}
		}
		else if(phase=="test") {
			trialType = testTrialSequence[trial];
			maxTrial = testTrialSequence.length;
			//maxTrial = 10;
		}

		
		if (!criterionMet && trial<maxTrial) {	
			//trialType = trainingTrialSequence[trial];
			var types;
			if(trialType=="AC") {
				types = [A,C];
				types = _.shuffle(types);
				if(types[0]==A) {
					correctChoice = "left";
				}
				else {
					correctChoice = "right";
				}
			}		
			else if(trialType=="AB") {
				types = [A,B];
				types = _.shuffle(types);
				if(types[0]==A) {
					correctChoice = "left";
				}
				else {
					correctChoice = "right";
				}
			}
			else if(trialType=="BC") {
				types = [B,C];
				types = _.shuffle(types);
				if(types[0]==B) {
					correctChoice = "left";
				}
				else {
					correctChoice = "right";
				}
			}
			else if(trialType=="BD") {
				types = [B, D];
				types = _.shuffle(types);
				if(types[0]==B) {
					correctChoice = "left";
				}
				else {
					correctChoice = "right";
				}
			}
			else if(trialType=="CD") {
				types = [C, D];
				types = _.shuffle(types);
				if(types[0]==C) {
					correctChoice = "left";
				}
				else {
					correctChoice = "right";
				}
			}
			else if(trialType=="ACB") {
				types = [AC,B];
				types = _.shuffle(types);
				//no prescribed correct choice
				if(types[0]==AC) {
					correctChoice = "ACleft";
				}
				else {
					correctChoice = "ACright";
				}
			}
			
			rewards = computeRewards(types);

			drawStimulus(ctx1, types[0]);
			drawStimulus(ctx2, types[1]);
	
			//response handling
			trialStartTime = new Date().getTime();
			listening = true;
			d3.select("#query").html('<p id="prompt"> &nbsp &nbsp Press the left arrow key (&#8592), or the right arrow key (&#8594) to make your selection.</p>');

		}
		else {
			finish(); //shift to next phase of experiment
		}	
		trial = trial + 1;	//increment trial number
	};
	
	var computeRewards = function(types) {
		mean1 = means[types[0]];
		mean2 = means[types[1]];
		var1 = variances[types[0]];
		var2 = variances[types[1]];
		
		r1 = sampleFromTriangularDistribution(mean1, var1);
		r2 = sampleFromTriangularDistribution(mean2, var2);
		r1 = r1*scalingFactor;
		r2 = r2*scalingFactor;
		return [r1, r2];
	};
	
	
	var sampleFromTriangularDistribution = function(mean, variance) {
		u = Math.random();
		c = mean;
		a = mean-variance;
		b = mean+variance;
		
		// http://en.wikipedia.org/wiki/Triangular_distribution 
		if(u<.5) {
			x = a + Math.sqrt( u*(b-a)*(c-a) )
		}
		else {
			x = b - Math.sqrt( (1-u)*(b-a)*(b-c) )
		}
		return x;
	};
	
	var drawStimulus = function(ctx, type) {
		colors = _.shuffle(colors);
		sides = _.shuffle(sides);
		t = generateStimulusStructure();
		for(i=0; i<4; i++) { //loop through rows
			for(j=0; j<4; j++) { //loop through columns
				//x = (j+1)*(size+separation)-size;
				//y = (i+1)*(size+separation)-size;
				x = j*separation + (2*j+1)*size;
				y = i*separation + (2*i+1)*size;
				if(type==0) {	//rows same shape
					side = sides[i];
					color = colors[t[i][j]-1];
				}
				else if(type==1) {	//columns same color
					side = sides[t[i][j]-1];
					color = colors[j];
				}
				else if(type==2) {	//quadrants same color and shape (B)
					if(i<=1 && j<=1) {
						side = sides[0];
						color = colors[0];
					}
					else if(i<=1 && j>=2) {
						side = sides[1];
						color = colors[1];
					}
					else if(i>=2 && j<=1) {
						side = sides[2];
						color = colors[2];
					}
					else if(i>=2 && j>=2) {
						side = sides[3];
						color = colors[3];
					}
				}
				else if(type==3) { //rows same shape AND columns same color (AC)
					side = sides[i];
					color = colors[j];
				}
				else if(type==4) {	//type D
					if((i==0 || i==3) && (j==0 || j==3)) {
						side = sides[0];
						color = colors[0];
					}
					else if((i==1 || i==2) && (j==1 || j==2)) {
						side = sides[1];
						color = colors[1];
					}
					else if((i==1 || i==2) && (j==0 || j==3)) {
						side = sides[2];
						color = colors[2];
					}
					else if((i==0 || i==3) && (j==1 || j==2)) {
						side = sides[3];
						color = colors[3];
					}
				}
				drawPolygon(ctx, side, x, y, size, color);
			}
		}
	};
	
	var drawPolygon = function(ctx, numberOfSides, Xcenter, Ycenter, size, fillStyle) {
		if(numberOfSides == 0) { 
			//create circle
			ctx.fillStyle = fillStyle;
			ctx.beginPath();
				  	 // x, y, r, start, stop
			ctx.arc(Xcenter,Ycenter,size,0,2*Math.PI);
			ctx.fill();
		}
		else {
			ctx.beginPath();
			ctx.moveTo (Xcenter +  size * Math.cos(0), Ycenter +  size *  Math.sin(0));          

			for (var i = 1; i <= numberOfSides;i += 1) {
				ctx.lineTo (Xcenter + size * Math.cos(i * 2 * Math.PI / numberOfSides), Ycenter + size * Math.sin(i * 2 * Math.PI / numberOfSides));
			}

			//ctx.strokeStyle = "#000000";
			//ctx.lineWidth = 1;
			//ctx.stroke();
			ctx.fillStyle = fillStyle;
			ctx.fill();
		}
	};
	
	var response_handler = function(e) {
		if (!listening) return;

		var keyCode = e.keyCode,
			response;

		switch (keyCode) {
			case 37:
				// "left arrow"
				response="left";
				break;
			case 39:
				// "right array"
				response="right";
				break;
		}
		if (response.length>0) {
			listening = false;
			//var hit = response == stim[1];
			var rt = new Date().getTime() - trialStartTime;
			var isCorrect = 0;
			var chosenCatExp = "";

			if(response==correctChoice) {
				correctCount = correctCount+1;
				isCorrect = 1;
				bonusCount = bonusCount+1;
				if(trialType=="AB") {
					corrAB = corrAB+1;
					chosenCatExp = "A";
				}
				else if(trialType=="BC") {
					corrBC = corrBC+1;
					chosenCatExp = "B";
				}
				else if(trialType=="AC") {
					corrAC = corrAC+1;
					chosenCatExp = "A";
				}
				else if(trialType=="BD") {
					corrBD = corrBD+1;
					chosenCatExp = "B";
				}
				else if(trialType=="CD") {
					corrCD = corrCD+1;
					chosenCatExp = "C";
				}
				
			}
			else {
				correctCount = 0;
				if(trialType=="AB") {
					corrAB = 0;
					chosenCatExp = "B";
				}
				else if(trialType=="BC") {
					corrBC = 0;
					chosenCatExp = "C";
				}
				else if(trialType=="AC") {
					corrAC = 0;
					chosenCatExp = "C";
				}
				else if(trialType=="BD") {
					corrBD = 0;
					chosenCatExp = "D";
				}
				else if(trialType=="CD") {
					corrCD = 0;
					chosenCatExp = "D";
				}
			}
			
			if(trialType=="ACB") {
				if(response=="left" && correctChoice=="ACleft") {
					ACvB = ACvB+1;
					chosenCatExp = "AC";
				}
				else if(response=="right" && correctChoice=="ACright") {
					ACvB = ACvB+1;
					chosenCatExp = "AC";
				}
				else{
					chosenCatExp = "B";
				}
			}
			
	
			psiTurk.recordTrialData({'phase':phase,
									 'trialNum':trial,
                                     'trialType':trialType,
                                     'chosenCatExp':chosenCatExp,                 
                                     'correctCount':correctCount,
                                     'corrAB':corrAB,
                                     'corrBC':corrBC,
                                     'corrAC':corrAC,
                                     'corrBD':corrBD,
                                     'corrCD':corrCD,
                                	 'correctChoice':correctChoice,
                                     'response':response,
                                     'isCorrect':isCorrect,
                                     'ACvB':ACvB,
                                     'bonusCount':bonusCount,
                                     'rewards':rewards,
                                     'rt':rt}
                                   );

			if(phase=="train") {
				displayTrainingFeedback(response); 
			}
			else if(phase=="test") {
				displayTestFeedback(response);
			}						 
		}
	};
	
	var displayTrainingFeedback = function(response) {
		var c1 = document.getElementById("canvas1");
		var ctx1 = c1.getContext("2d");
		var c2 = document.getElementById("canvas2");
		var ctx2 = c2.getContext("2d");
		
		//clear canvases
		ctx1.clearRect(0,0,c1.width, c1.height);
		ctx2.clearRect(0,0,c2.width, c2.height);
		

		if(response=="left") {
			ctx1.fillStyle = "black";
			ctx1.font = "30px Arial";
			ctx1.fillText("Your selection is worth:", c1.width*.10, c1.height*.10);
			ctx1.fillText("$" + rewards[0].toFixed(2), c1.width*.40, c1.height*.50);
		}
		else if(response=="right") {
			ctx2.fillStyle = "black";
			ctx2.font = "30px Arial";
			ctx2.fillText("Your selection is worth:", c2.width*.10, c2.height*.10);
			ctx2.fillText("$" + rewards[1].toFixed(2), c2.width*.40, c2.height*.50);
		}
		
		setTimeout(function(){doTrial()}, 2000);
	};
	
	
	var displayTestFeedback = function(response) {
		var c1 = document.getElementById("canvas1");
		var ctx1 = c1.getContext("2d");
		var c2 = document.getElementById("canvas2");
		var ctx2 = c2.getContext("2d");
		
		//clear canvases
		ctx1.clearRect(0,0,c1.width, c1.height);
		ctx2.clearRect(0,0,c2.width, c2.height);
		
		setTimeout(function(){doTrial()}, 500);
	};

	var finish = function() {
		if(phase=="train") {	
			$("body").unbind("keydown", response_handler); // Unbind keys
			psiTurk.doInstructions(
    			instructionPagesTest, // a list of pages you want to display in sequence
    			function() { currentview = new ShapesExperiment("test"); } // what you want to do when you are done with instructions
   			);
		}
		else if(phase=="test") {
	    	$("body").unbind("keydown", response_handler); // Unbind keys
	    	currentview = new Questionnaire();
	    }
	};
	
	// Load the stage.html snippet into the body of the page
	psiTurk.showPage('stage.html');
	
	// Register the response handler that is defined above to handle any
	// key down events.
	$("body").focus().keydown(response_handler); 
	
	//initialization functions
	setConditionsAndCounterbalances();
	generateTrialSequence();
	
	//start the Trial sequence
	doTrial();
};



/****************
* Questionnaire *
****************/

var Questionnaire = function() {

	var error_message = "<h1>Oops!</h1><p>Something went wrong submitting your HIT. This might happen if you lose your internet connection. Press the button to resubmit.</p><button id='resubmit'>Resubmit</button>";

	

	record_responses = function() {

		

		$('textarea').each( function(i, val) {
			psiTurk.recordUnstructuredData(this.id, this.value);
		});
		$('select').each( function(i, val) {
			psiTurk.recordUnstructuredData(this.id, this.value);		
		});

	};

	prompt_resubmit = function() {
		replaceBody(error_message);
		$("#resubmit").click(resubmit);
	};

	resubmit = function() {
		replaceBody("<h1>Trying to resubmit...</h1>");
		reprompt = setTimeout(prompt_resubmit, 10000);
		
		psiTurk.saveData({
			success: function() {
			    clearInterval(reprompt); 
                psiTurk.computeBonus('compute_bonus', function(){finish()}); 
			}, 
			error: prompt_resubmit
		});
	};

	// Load the questionnaire snippet 
	psiTurk.showPage('postquestionnaire.html');
	psiTurk.recordTrialData({'phase':'postquestionnaire', 'status':'begin'});
	
	var bonusPay = bonusCount*.005;
	bonusPay = bonusPay.toFixed(2);
	d3.select("#bonus").html('<p id="bonus">Nice work! You have earned a bonus of $' + bonusPay + '</p>');

	
	$("#next").click(function () {
	    record_responses();
	    psiTurk.saveData({
            success: function(){
                psiTurk.computeBonus('compute_bonus', function() { 
                	psiTurk.completeHIT(); // when finished saving compute bonus, the quit
                }); 
            }, 
            error: prompt_resubmit});
	});
    
	
};

// Task object to keep track of the current phase
var currentview;



/*******************
 * Run Task
 ******************/
$(window).load( function(){
	//window.resizeTo(1100,700);
	//window.resizeTo(window.screen.availWidth, window.screen.availHeight); //window size set in ad.html
    psiTurk.doInstructions(
    	instructionPagesTraining, // a list of pages you want to display in sequence
    	function() { currentview = new ShapesExperiment("train"); } // what you want to do when you are done with instructions
    );
});
