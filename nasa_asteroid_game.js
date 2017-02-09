// Global Variables
var DIFFICULTY = 2;			//how fast the game gets mor difficult
var ROCK_TIME = 110;		//aprox tick count until a new asteroid gets introduced
var SUB_ROCK_COUNT = 4;		//how many small rocks to make on rock death
var BULLET_TIME = 5;		//ticks between bullets
var BULLET_ENTROPY = 100;	//how much energy a bullet has before it runs out.

var TURN_FACTOR = 7;		//how far the ship turns per frame
var BULLET_SPEED = 17;		//how fast the bullets move

var KEYCODE_ENTER = 13;		//useful keycode
var KEYCODE_SPACE = 32;		//useful keycode
var KEYCODE_UP = 38;		//useful keycode
var KEYCODE_LEFT = 37;		//useful keycode
var KEYCODE_RIGHT = 39;		//useful keycode
var KEYCODE_W = 87;			//useful keycode
var KEYCODE_A = 65;			//useful keycode
var KEYCODE_D = 68;			//useful keycode

var manifest;           // used to register sounds for preloading
var preload;

var shootHeld;			//is the user holding a shoot command
var lfHeld;				//is the user holding a turn left command
var rtHeld;				//is the user holding a turn right command
var fwdHeld;			//is the user holding a forward command

var timeToRock;			//difficulty adjusted version of ROCK_TIME
var nextRock;			//ticks left until a new space rock arrives
var nextBullet;			//ticks left until the next shot is fired

var rockBelt;			//space rock array
var bulletStream;		//bullet array

var canvas;			//Main canvas
var stage;			//Main display stage

var ship;			//the actual ship
var alive;			//wheter the player is alive

var messageField;		//Message display field
var scoreField;			//score Field


var loadingInterval = 0;



//Ship and Rock object initialize
(function (window) {

	function Ship() {
		this.Container_constructor();

		this.shipFlame = new createjs.Shape();
		this.shipBody = new createjs.Shape();

		this.addChild(this.shipFlame);
		this.addChild(this.shipBody);

		this.makeShape();
		this.timeout = 0;
		this.thrust = 0;
		this.vX = 0;
		this.vY = 0;
	}
	var p = createjs.extend(Ship, createjs.Container);

	// public properties:
	Ship.TOGGLE = 60;
	Ship.MAX_THRUST = 2;
	Ship.MAX_VELOCITY = 5;

	// public properties:
	p.shipFlame;
	p.shipBody;

	p.timeout;
	p.thrust;

	p.vX;
	p.vY;

	p.bounds;
	p.hit;
	

	// public methods:
	p.makeShape = function () {
		//draw ship body
		var g = this.shipBody.graphics;
		g.clear();
		g.beginStroke("#FFFFFF");

		g.moveTo(0, 10);	//nose
		g.lineTo(5, -6);	//rfin
		g.lineTo(0, -2);	//notch
		g.lineTo(-5, -6);	//lfin
		g.closePath(); // nose


		//draw ship flame
		var o = this.shipFlame;
		o.scaleX = 0.5;
		o.scaleY = 0.5;
		o.y = -5;

		g = o.graphics;
		g.clear();
		g.beginStroke("#FFFFFF");

		g.moveTo(2, 0);		//ship
		g.lineTo(4, -3);	//rpoint
		g.lineTo(2, -2);	//rnotch
		g.lineTo(0, -5);	//tip
		g.lineTo(-2, -2);	//lnotch
		g.lineTo(-4, -3);	//lpoint
		g.lineTo(-2, -0);	//ship

		//furthest visual element
		this.bounds = 10;
		this.hit = this.bounds;
	}

	p.tick = function (event) {
		//move by velocity
		this.x += this.vX;
		this.y += this.vY;

		//with thrust flicker a flame every Ship.TOGGLE frames, attenuate thrust
		if (this.thrust > 0) {
			this.timeout++;
			this.shipFlame.alpha = 1;

			if (this.timeout > Ship.TOGGLE) {
				this.timeout = 0;
				if (this.shipFlame.scaleX == 1) {
					this.shipFlame.scaleX = 0.5;
					this.shipFlame.scaleY = 0.5;
				} else {
					this.shipFlame.scaleX = 1;
					this.shipFlame.scaleY = 1;
				}
			}
			this.thrust -= 0.5;
		} else {
			this.shipFlame.alpha = 0;
			this.thrust = 0;
		}
	}

	p.accelerate = function () {
		//increase push ammount for acceleration
		this.thrust += this.thrust + 0.6;
		if (this.thrust >= Ship.MAX_THRUST) {
			this.thrust = Ship.MAX_THRUST;
		}

		//accelerate
		this.vX += Math.sin(this.rotation * (Math.PI / -180)) * this.thrust;
		this.vY += Math.cos(this.rotation * (Math.PI / -180)) * this.thrust;

		//cap max speeds
		this.vX = Math.min(Ship.MAX_VELOCITY, Math.max(-Ship.MAX_VELOCITY, this.vX));
		this.vY = Math.min(Ship.MAX_VELOCITY, Math.max(-Ship.MAX_VELOCITY, this.vY));
	}

	window.Ship = createjs.promote(Ship, "Container");

	function SpaceRock(size) {
		this.Shape_constructor(); // super call

		this.activate(size);
	}

	var p = createjs.extend(SpaceRock, createjs.Shape);

	// static properties:
	SpaceRock.LRG_ROCK = 40;
	SpaceRock.MED_ROCK = 20;
	SpaceRock.SML_ROCK = 10;

	// public properties:

	p.bounds;	//visual radial size
	p.hit;		//average radial disparity
	p.size;		//size value itself
	p.spin;		//spin ammount
	p.score;	//score value

	p.vX;		//velocity X
	p.vY;		//velocity Y

	p.active;	//is it active
	

	// public methods:

	//handle drawing a spaceRock
	p.getShape = function (size) {
		var angle = 0;
		var radius = size;

		this.size = size;
		this.hit = size;
		this.bounds = 0;

		//setup
		this.graphics.clear();
		this.graphics.beginStroke("#FFFFFF");
		this.graphics.moveTo(0, size);

		//draw spaceRock
		while (angle < (Math.PI * 2 - .5)) {
			angle += .25 + (Math.random() * 100) / 500;
			radius = size + (size / 2 * Math.random());
			this.graphics.lineTo(Math.sin(angle) * radius, Math.cos(angle) * radius);

			//track visual depiction for interaction
			if (radius > this.bounds) {
				this.bounds = radius;
			}	//furthest point

			this.hit = (this.hit + radius) / 2;					//running average
		}

		this.graphics.closePath(); // draw the last line segment back to the start point.
		this.hit *= 1.1; //pad a bit
	}

	//handle reinit for poolings sake
	p.activate = function (size) {
		this.getShape(size);

		//pick a random direction to move in and base the rotation off of speed
		var angle = Math.random() * (Math.PI * 2);
		this.vX = Math.sin(angle) * (5 - size / 15);
		this.vY = Math.cos(angle) * (5 - size / 15);
		this.spin = (Math.random() + 0.2 ) * this.vX;

		//associate score with size
		this.score = (5 - size / 10) * 100;
		this.active = true;
	}

	//handle what a spaceRock does to itself every frame
	p.tick = function (event) {
		this.rotation += this.spin;
		this.x += this.vX;
		this.y += this.vY;
	}

	//position the spaceRock so it floats on screen
	p.floatOnScreen = function (width, height) {
		//base bias on real estate and pick a side or top/bottom
		if (Math.random() * (width + height) > width) {
			//side; ensure velocity pushes it on screen
			if (this.vX > 0) {
				this.x = -2 * this.bounds;
			} else {
				this.x = 2 * this.bounds + width;
			}
			//randomly position along other dimension
			if (this.vY > 0) {
				this.y = Math.random() * height * 0.5;
			} else {
				this.y = Math.random() * height * 0.5 + 0.5 * height;
			}
		} else {
			//top/bottom; ensure velocity pushes it on screen
			if (this.vY > 0) {
				this.y = -2 * this.bounds;
			} else {
				this.y = 2 * this.bounds + height;
			}
			//randomly position along other dimension
			if (this.vX > 0) {
				this.x = Math.random() * width * 0.5;
			} else {
				this.x = Math.random() * width * 0.5 + 0.5 * width;
			}
		}
	}

	p.hitPoint = function (tX, tY) {
		return this.hitRadius(tX, tY, 0);
	}

	p.hitRadius = function (tX, tY, tHit) {
		//early returns speed it up
		if (tX - tHit > this.x + this.hit) {
			return;
		}
		if (tX + tHit < this.x - this.hit) {
			return;
		}

		if (tY - tHit > this.y + this.hit) {
			return;
		}

		if (tY + tHit < this.y - this.hit) {
			return;
		}

		//now do the circle distance test
		return this.hit + tHit > Math.sqrt(Math.pow(Math.abs(this.x - tX), 2) + Math.pow(Math.abs(this.y - tY), 2));
	}


	window.SpaceRock = createjs.promote(SpaceRock, "Shape");
}(window));

//register key functions
window.onload = function() {
  init_game();
};

//register key functions
window.onkeydown = handleKeyDown;
window.onkeyup = handleKeyUp;

function init_game() {
	if (!createjs.Sound.initializeDefaultPlugins()) {
		document.getElementById("error").style.display = "block";
		document.getElementById("content").style.display = "none";
		return;
	}

	if (createjs.BrowserDetect.isIOS || createjs.BrowserDetect.isAndroid || createjs.BrowserDetect.isBlackberry) {
		document.getElementById("mobile").style.display = "block";
		document.getElementById("content").style.display = "none";
		return;
	}

	canvas = document.getElementById("gameCanvas");
	stage = new createjs.Stage(canvas);
	messageField = new createjs.Text("Loading", "bold 24px Arial", "#FFFFFF");
	messageField.maxWidth = 1000;
	messageField.textAlign = "center";
	messageField.textBaseline = "middle";
	messageField.x = canvas.width / 2;
	messageField.y = canvas.height / 4;
	stage.addChild(messageField);
	stage.update(); 	//update the stage to show text

	// begin loading content
	
	var assetsPath = "sites/all/modules/nasa_asteroid/sounds/";
	manifest = [
		{id: "begin", src: "spawn.ogg"},
		{id: "break", src: "break.ogg", data: 6},
		{id: "death", src: "death.ogg"},
		{id: "laser", src: "shot.ogg", data: 6},
		{id: "music", src: "music.ogg"}
	];
	

	createjs.Sound.alternateExtensions = ["mp3"];
	preload = new createjs.LoadQueue(true, assetsPath);
	preload.installPlugin(createjs.Sound);
	preload.addEventListener("complete", doneLoading); // add an event listener for when load is completed
	preload.addEventListener("progress", updateLoading);
	preload.loadManifest(manifest);
}

function stop() {
	if (preload != null) {
		preload.close();
	}
	createjs.Sound.stop();
}

function updateLoading() {
	messageField.text = "Loading " + (preload.progress * 100 | 0) + "%";
	stage.update();
}

function doneLoading(event) {
	fetchHighScore(function(result) {
		clearInterval(loadingInterval);
		scoreField = new createjs.Text("0", "bold 18px Arial", "#FFFFFF");
		scoreField.textAlign = "right";
		scoreField.x = canvas.width - 20;
		scoreField.y = 20;
		scoreField.maxWidth = 1000;

		messageField.text = "Welcome: Click to play";
    		var highScoreArray = result;
    		if(highScoreArray.length > 0){
			highScoreText = buildHighScoreText(highScoreArray);
			highScoreField = new createjs.Text(highScoreText, "bold 24px Arial", "#FFFFFF");
			highScoreField.lineWidth = 300;
			highScoreField.textAlign = "center";
			highScoreField.textBaseline = "middle";
			highScoreField.x = canvas.width / 2;
			highScoreField.y = (canvas.height / 4) + 30;
			stage.addChild(highScoreField);
			stage.update();
		}
		watchRestart();
	});
	
}

function watchRestart() {
	//watch for clicks
	stage.addChild(messageField);
	stage.update(); 	//update the stage to show text
	canvas.onclick = handleClick;
}

function handleClick() {
	//prevent extra clicks and hide text
	canvas.onclick = null;
	stage.removeChild(messageField);

	// indicate the player is now on screen
	createjs.Sound.play("begin");

	restart();
}

//reset all game logic
function restart() {

	//hide anything on stage and show the score
	stage.removeAllChildren();
	scoreField.text = (0).toString();
	stage.addChild(scoreField);

	//new arrays to dump old data
	rockBelt = [];
	bulletStream = [];

	//create the player
	alive = true;
	ship = new Ship();
	ship.x = canvas.width / 2;
	ship.y = canvas.height / 2;

	//log time untill values
	timeToRock = ROCK_TIME;
	nextRock = nextBullet = 0;

	//reset key presses
	shootHeld = lfHeld = rtHeld = fwdHeld = dnHeld = false;

	//ensure stage is blank and add the ship
	stage.clear();
	stage.addChild(ship);

	//start game timer
	if (!createjs.Ticker.hasEventListener("tick")) {
		createjs.Ticker.addEventListener("tick", tick);
	}
}

function tick(event) {
	//handle firing
	if (nextBullet <= 0) {
		if (alive && shootHeld) {
			nextBullet = BULLET_TIME;
			fireBullet();
		}
	} else {
		nextBullet--;
	}

	//handle turning
	if (alive && lfHeld) {
		ship.rotation -= TURN_FACTOR;
	} else if (alive && rtHeld) {
		ship.rotation += TURN_FACTOR;
	}

	//handle thrust
	if (alive && fwdHeld) {
		ship.accelerate();
	}

	//handle new spaceRocks
	if (nextRock <= 0) {
		if (alive) {
			timeToRock -= DIFFICULTY;	//reduce spaceRock spacing slowly to increase difficulty with time
			var index = getSpaceRock(SpaceRock.LRG_ROCK);
			rockBelt[index].floatOnScreen(canvas.width, canvas.height);
			nextRock = timeToRock + timeToRock * Math.random();
		}
	} else {
		nextRock--;
	}

	//handle ship looping
	if (alive && outOfBounds(ship, ship.bounds)) {
		placeInBounds(ship, ship.bounds);
	}

	//handle bullet movement and looping
	for (bullet in bulletStream) {
		var o = bulletStream[bullet];
		if (!o || !o.active) {
			continue;
		}
		if (outOfBounds(o, ship.bounds)) {
			placeInBounds(o, ship.bounds);
		}
		o.x += Math.sin(o.rotation * (Math.PI / -180)) * BULLET_SPEED;
		o.y += Math.cos(o.rotation * (Math.PI / -180)) * BULLET_SPEED;

		if (--o.entropy <= 0) {
			stage.removeChild(o);
			o.active = false;
		}
	}

	//handle spaceRocks (nested in one loop to prevent excess loops)
	for (spaceRock in rockBelt) {
		var o = rockBelt[spaceRock];
		if (!o || !o.active) {
			continue;
		}

		//handle spaceRock movement and looping
		if (outOfBounds(o, o.bounds)) {
			placeInBounds(o, o.bounds);
		}
		o.tick(event);

		//handle spaceRock ship collisions
		if (alive && o.hitRadius(ship.x, ship.y, ship.hit)) {
			alive = false;

			stage.removeChild(ship);
			enterHighScore();
			

			//play death sound
			createjs.Sound.play("death", {interrupt: createjs.Sound.INTERRUPT_ANY});
			continue;
		}

		//handle spaceRock bullet collisions
		for (bullet in bulletStream) {
			var p = bulletStream[bullet];
			if (!p || !p.active) {
				continue;
			}

			if (o.hitPoint(p.x, p.y)) {
				var newSize;
				switch (o.size) {
					case SpaceRock.LRG_ROCK:
						newSize = SpaceRock.MED_ROCK;
						break;
					case SpaceRock.MED_ROCK:
						newSize = SpaceRock.SML_ROCK;
						break;
					case SpaceRock.SML_ROCK:
						newSize = 0;
						break;
				}

				//score
				if (alive) {
					addScore(o.score);
				}

				//create more
				if (newSize > 0) {
					var i;
					var index;
					var offSet;

					for (i = 0; i < SUB_ROCK_COUNT; i++) {
						index = getSpaceRock(newSize);
						offSet = (Math.random() * o.size * 2) - o.size;
						rockBelt[index].x = o.x + offSet;
						rockBelt[index].y = o.y + offSet;
					}
				}

				//remove
				stage.removeChild(o);
				rockBelt[spaceRock].active = false;

				stage.removeChild(p);
				bulletStream[bullet].active = false;

				// play sound
				createjs.Sound.play("break", {interrupt: createjs.Sound.INTERUPT_LATE, offset: 0.8});
			}
		}
	}

	//call sub ticks
	ship.tick(event);
	stage.update(event);
}



function outOfBounds(o, bounds) {
	//is it visibly off screen
	return o.x < bounds * -2 || o.y < bounds * -2 || o.x > canvas.width + bounds * 2 || o.y > canvas.height + bounds * 2;
}

function placeInBounds(o, bounds) {
	//if its visual bounds are entirely off screen place it off screen on the other side
	if (o.x > canvas.width + bounds * 2) {
		o.x = bounds * -2;
	} else if (o.x < bounds * -2) {
		o.x = canvas.width + bounds * 2;
	}

	//if its visual bounds are entirely off screen place it off screen on the other side
	if (o.y > canvas.height + bounds * 2) {
		o.y = bounds * -2;
	} else if (o.y < bounds * -2) {
		o.y = canvas.height + bounds * 2;
	}
}

function fireBullet() {
	//create the bullet
	var o = bulletStream[getBullet()];
	o.x = ship.x;
	o.y = ship.y;
	o.rotation = ship.rotation;
	o.entropy = BULLET_ENTROPY;
	o.active = true;

	//draw the bullet
	o.graphics.beginStroke("#FFFFFF").moveTo(-1, 0).lineTo(1, 0);

	// play the shot sound
	createjs.Sound.play("laser", {interrupt: createjs.Sound.INTERUPT_LATE});
}

function getSpaceRock(size) {
	var i = 0;
	var len = rockBelt.length;

	//pooling approach
	while (i <= len) {
		if (!rockBelt[i]) {
			rockBelt[i] = new SpaceRock(size);
			break;
		} else if (!rockBelt[i].active) {
			rockBelt[i].activate(size);
			break;
		} else {
			i++;
		}
	}

	if (len == 0) {
		rockBelt[0] = new SpaceRock(size);
	}

	stage.addChild(rockBelt[i]);
	return i;
}

function getBullet() {
	var i = 0;
	var len = bulletStream.length;

	//pooling approach
	while (i <= len) {
		if (!bulletStream[i]) {
			bulletStream[i] = new createjs.Shape();
			break;
		} else if (!bulletStream[i].active) {
			bulletStream[i].active = true;
			break;
		} else {
			i++;
		}
	}

	if (len == 0) {
		bulletStream[0] = new createjs.Shape();
	}

	stage.addChild(bulletStream[i]);
	return i;
}

//allow for WASD and arrow control scheme
function handleKeyDown(e) {
	//cross browser issues exist
	if (!e) {
		var e = window.event;
	}
	switch (e.keyCode) {
		case KEYCODE_SPACE:
			shootHeld = true;
			return false;
		case KEYCODE_A:
		case KEYCODE_LEFT:
			lfHeld = true;
			return false;
		case KEYCODE_D:
		case KEYCODE_RIGHT:
			rtHeld = true;
			return false;
		case KEYCODE_W:
		case KEYCODE_UP:
			fwdHeld = true;
			return false;
		case KEYCODE_ENTER:
			if (canvas.onclick == handleClick) {
				handleClick();
			}
			return false;
	}
}

function handleKeyUp(e) {
	//cross browser issues exist
	if (!e) {
		var e = window.event;
	}
	switch (e.keyCode) {
		case KEYCODE_SPACE:
			shootHeld = false;
			break;
		case KEYCODE_A:
		case KEYCODE_LEFT:
			lfHeld = false;
			break;
		case KEYCODE_D:
		case KEYCODE_RIGHT:
			rtHeld = false;
			break;
		case KEYCODE_W:
		case KEYCODE_UP:
			fwdHeld = false;
			break;
	}
}

function addScore(value) {
	//trust the field will have a number and add the score
	scoreField.text = (Number(scoreField.text) + Number(value)).toString();
}

function enterHighScore(){
	stage.removeAllChildren();
	messageField.text = "You're dead:  Click or hit enter to play again";
	stage.addChild(messageField);
	watchRestart();
        insertHighScore(function(result) {
    		var highScoreArray = result;
    		if(highScoreArray.length > 0){
			highScoreText = buildHighScoreText(highScoreArray);
			highScoreField = new createjs.Text(highScoreText, "bold 24px Arial", "#FFFFFF");
			highScoreField.lineWidth = 300;
			highScoreField.textAlign = "center";
			highScoreField.textBaseline = "middle";
			highScoreField.x = canvas.width / 2;
			highScoreField.y = (canvas.height / 4) + 30;
			stage.addChild(highScoreField);
			stage.update();
		}
		
	});
}

function insertHighScore(callback){
	jQuery.ajax({
                    type: 'POST',
                    url: '/game/insert_score',
                    data: 'score=' + scoreField.text,
                    dataType: 'json',
                 	success: callback
                });
}

function fetchHighScore(callback){
        jQuery.ajax({
                 type: 'POST',
                 url: '/game/fetch_scores',
                 dataType: 'json',
                 success: callback
                });    
}


function buildHighScoreText(highScoreArray){
	var highScoreText = "";
	if(highScoreArray.length > 0){
		highScoreText += "HIGH SCORES ";
	}
	for (var i = 0; i < highScoreArray.length; i++){
		highScoreText += highScoreArray[i]['name'] != "" ? highScoreArray[i]['name'] : "Anonymous";
		highScoreText += ":" + highScoreArray[i]['score'] + " ";
	}
	return highScoreText;
}