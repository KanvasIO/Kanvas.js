function KContext(){
	//
	var self = this;
	
	var supportedFunctions = ['trace', 'boxMe', 'fillArc'];
	var supportedVars = [];
	var warning = [];
	var commands = [];
	var saveStack = [];
	var tracking = false;
	
	var TRANS, SCALE, ROT;
	var _TRANS, _SCALE, _ROT;
	
	var tempCan = document.createElement('canvas');
	var tempCTX = tempCan.getContext('2d');
	
	for(xx in tempCTX)((typeof(tempCTX[xx]) == "function")?(supportedFunctions):(supportedVars)).push(xx);
	
	tempCan = null;
	tempCTX = null;
	
	var proxyFunc = function(){
		if(!tracking)return false;
		commands.push([this.name, proxyFunc.arguments, this.varName]); 
	};
	
	for (var ii in supportedFunctions){
		self[supportedFunctions[ii]] = proxyFunc.bind({name:supportedFunctions[ii]});
	}
	for (var ii in supportedVars){
		///
		self.__defineGetter__(supportedVars[ii], function(){
			if(!tracking)return false;
			return this[supportedVars[ii]+"X"];
		})
		//
		self.__defineSetter__(supportedVars[ii], proxyFunc.bind({
			name:'setVar', 
			varName:supportedVars[ii]
		}));
	}
	
	
	
	var __beginTrack = function(args){
		tracking = true;
		clearVars();
		ROT = (args.rot||0);
	}
	this.beginTrack = function(args){
		__beginTrack(args);
	}
	
	var clearVars = function(){
		commands = [];
		saveStack = [];
		xy = null;
		mxy = null;
		TRANS = [0, 0];
		SCALE = [1, 1];
		REAL = [0, 0];
		ROT = 0;
	}
	this.clearVars = function(){clearVars()};
	
	var __clearTrack = function(){
		commandsStack = [];
	}
	this.clearTrack = function(){
		__clearTrack();
	}
	//
	var hasPoint = function(xx, yy){
		var temp = rotateCoords(xx,yy, ROT);
		xx = temp[0] * SCALE[0] + REAL[0];
		yy = temp[1] * SCALE[1] + REAL[1];
		
		if(!xy){
			xy = [	xx, yy ];
			mxy = [ xx, yy ];
		}
		else{
			xy[0] = Math.min(xy[0], xx);
			xy[1] = Math.min(xy[1], yy);
			mxy[0] = Math.max(mxy[0], xx);
			mxy[1] = Math.max(mxy[1], yy);
		}
	}
	
	var __closeTrack = function(){
		tracking = false;
		for(var ii in commands){
			var args = commands[ii][1];
			switch(commands[ii][0]){
				case 'save': 
					saveStack.push([TRANS[0],
									TRANS[1],
									SCALE[0],
									SCALE[1],
									REAL[0],
									REAL[1],
									ROT]);
					break;
				case 'restore': 
					var temp = saveStack.pop();
					TRANS = [temp[0],temp[1]];
					SCALE = [temp[2],temp[3]];
					REAL = [temp[4],temp[5]]
					ROT = temp[6];
					break;
				case 'scale':
					SCALE[0] *= args[0];
					SCALE[1] *= args[1];
					break;
				case 'rotate':
					ROT += args[0];
					_ROT += args[0];
					break;
				case 'translate':
					TRANS[0] += args[0];
					TRANS[1] += args[1];
					REAL[0] += (args[0]*SCALE[0] * Math.cos(ROT)) - (args[1]*SCALE[1] * Math.sin(ROT));
					REAL[1] += (args[0]*SCALE[0] * Math.sin(ROT)) + (args[1]*SCALE[1] * Math.cos(ROT));
					break;
				case 'moveTo':
				case 'lineTo':
					hasPoint(args[0], args[1]);
					break;
				case 'rect':
				case 'strokeRect':
				case 'fillRect':
					hasPoint(args[0], args[1]);
					hasPoint(args[2]+ args[0], args[3]+ args[1]);
					hasPoint(args[0]+ args[2], args[1]);
					hasPoint(args[0], args[3] +args[1]);
					break;
				case 'fillArc':
				case 'strokeArc':
				case 'arc':
					var temp = args[2] * 0.8
					hasPoint(args[0] - temp, args[1] - temp);
					hasPoint(args[0] + temp, args[1] - temp);
					hasPoint(args[0] + temp, args[1] + temp);
					hasPoint(args[0] - temp, args[1] + temp);
					temp = null;
					break;
			}
		}
		var toReturn = {
			hitBox : (xy&&mxy)?([xy[0], xy[1],mxy[0], mxy[1]]):null,
			data: commands,
		};
		clearVars()
		return toReturn;
		//Evaluate Width/Height
	}
	
	this.closeTrack = function(){
		return __closeTrack();
	}
	
	var traceMe = function(){
		console.log('ME:');
		console.log(xy, 'xy');
		console.log(mxy, 'mxy');
		console.log(TRANS, 'trans');
		console.log(SCALE, '');
		console.log(ROT, 'rotation');
	}
	this.traceMe = function(){					
		traceMe();
	}
	
}

var rotateCoords = function(xx,yy,rr){
	return [((xx * Math.cos(rr)) - (yy * Math.sin(rr))),((xx * Math.sin(rr)) + (yy * Math.cos(rr)))];
}

var pointInRect = function(xx, yy, left, up, right, down){
	if(xx > left &&  xx < right && yy > up &&  yy < down)return true;
	else return false
}
	
var mouseX = 0;
var mouseY = 0;

function mouseMoveHandler(e){
	//
	if(e.clientX){
		var rect = this.getBoundingClientRect();
		if(rect){
			mouseX = e.clientX - rect.left,
			mouseY = e.clientY - rect.top
		}else{
			mouseX = e.clientX - this.offsetLeft;
			mouseY = e.clientY - this.offsetLeft;
		}
	}else if(e.offsetX) {
		mouseX = e.offsetX;
		mouseY = e.offsetY;
	}else if(e.layerX) {
		mouseX = e.layerX;
		mouseY = e.layerY;
	}else console.log("Couldn't Determine Mouse Coordinates", e.offsetX, e.layerX, e.pageX, e.clientX);
	
}

function mouseMove(){
	for(var object in mouseMoveObjects){
		var temp = rotateCoords(mouseX - mouseMoveObjects[object].x , 
								mouseY - mouseMoveObjects[object].y,
								-mouseMoveObjects[object].rotation);
	
		mouseMoveObjects[object].mouseX = (temp[0])/mouseMoveObjects[object].scaleX;
		mouseMoveObjects[object].mouseY = (temp[1])/mouseMoveObjects[object].scaleY;
		
		if(mouseMoveObjects[object].__hitBox){
			mouseMoveObjects[object].rolled = pointInRect(	temp[0],temp[1],
															mouseMoveObjects[object].__hitBox[0],
															mouseMoveObjects[object].__hitBox[1],
															mouseMoveObjects[object].__hitBox[2],
															mouseMoveObjects[object].__hitBox[3]);
		
		}else mouseMoveObjects[object].rolled = false;
	}
}

function newClass(bluePrint){
	var KanvasClass = new Function('this.__init.call(this, arguments);');
	KanvasClass.prototype = {
		name: 'Unnamed Class',
		x: 0,
		y: 0,
		scaleX: 1,
		scaleY: 1,
		rotation: 0,
		showBox: false,
		dynamic: true,
		rolled:false,
		__rotation: null,
		__hitBox: null,
		__width : null,
		__height : null,
		__insideX : 0,
		__insideY : 0,
		__drawFunction: null,
		__needsRedraw: true,
		__drawData: null,
		__globalX: 0,
		__globalY: 0,
		render: function(cc){
			//if(this.every)this.every();
			if(this.__needsRedraw){
				this.__trackDraw();
			}else{
				this.__drawFunction();
			}
			cc.save();
			cc.translate(this.x, this.y);
			cc.scale(this.scaleX, this.scaleY);
			cc.rotate(this.rotation);
			this.__processDraw(cc);
			cc.restore();
			if(this.showBox)this.__boxMe(cc);
		},
		init:function(){
			console.log('init not defined on ' + this.name);
		},
		__postDrawFunction:function(){
			if(!this.__drawFunction)return false;
			this.__needsRedraw = true;
		},
		__init: function(aa){
			this.init.apply(this,aa);
			this.every();
			this.__drawFunction();
			this.__postDrawFunction();
		},
		__trackDraw: function(){
		
			if(!this.__drawFunction)return false;
			context.beginTrack({rot:0})//this.rotation})
			this.__drawFunction();
			var temp = context.closeTrack();
			if(temp.hitBox){
				this.__hitBox =  temp.hitBox;
				this.__insideX = -temp.hitBox[0];
				this.__insideY = -temp.hitBox[1];
				this.__width =  temp.hitBox[2]-temp.hitBox[0];
				this.__height =  temp.hitBox[3]-temp.hitBox[1];
			}
			this.__drawData = temp.data;
			
			temp = null
			if(!this.dynamic)this.__needsRedraw = false;
		},
		__boxMe: function(cc){
			cc.save();
			cc.translate(this.x, this.y);
			cc.rotate(this.rotation);
			cc.scale(this.scaleX, this.scaleY);
			cc.fillStyle = "#000";
			cc.fillRect(-1.5,-4,3,8);
			cc.fillRect(-4,-1.5,8,3);
			cc.fillStyle = "#fff";
			cc.fillRect(-0.5,-3,1,6);
			cc.fillRect(-3,-0.5,6,1);
			if(this.mouseX){
				cc.save();
				cc.translate(this.mouseX, this.mouseY);
				cc.fillStyle = "#F00";
				cc.fillRect(-5,-5,10,10);
				cc.restore();
			}
			if(this.__width){
				cc.beginPath();
				cc.rect(this.__hitBox[0],this.__hitBox[1],this.__hitBox[2]-this.__hitBox[0],this.__hitBox[3]-this.__hitBox[1]);
				cc.closePath();
				cc.strokeStyle = "#211";
				cc.setLineDash(0)
				cc.stroke();
				cc.lineWidth = 1.5;
				cc.strokeStyle = "#edd";
				cc.setLineDash([3,3])
				cc.stroke();
				cc.restore();
				
				
			}
			cc.restore();
		},
		__processDraw: function(cc){
			if(!this.__drawData)return false;
			for(var ii in this.__drawData){
				if(cc[this.__drawData[ii][0]])cc[this.__drawData[ii][0]].apply(cc, this.__drawData[ii][1]);
				else{
					switch(this.__drawData[ii][0]){
						case 'trace':
							traceMe();
							break
						case 'fillArc':
							cc.beginPath();
							cc.arc.apply(cc, this.__drawData[ii][1]);
							cc.closePath();
							cc.fill();
							break;
						case 'strokeArc':
							cc.beginPath();
							cc.arc.apply(cc, this.__drawData[ii][1]);
							cc.closePath();
							cc.stroke();
							break;
						case 'setVar':
							if(!cc[this.__drawData[ii][2]])console.log('Property ' + this.__drawData[ii][2] + " doesnt exist on Context");
							else cc[this.__drawData[ii][2]] = this.__drawData[ii][1][0];
							break;
						default:
							console.log('Function '+this.__drawData[ii][0]+ " doesn't exist on Context");
							break
					}
				}
			}
		}
	}
	
	if(typeof(bluePrint)=="function"){
		KanvasClass.prototype.__drawFunction = bluePrint.bind(KanvasClass.prototype);
	}else{
		for(var prop in bluePrint){
			if(prop == "draw")KanvasClass.prototype['__drawFunction'] = bluePrint[prop];
			else KanvasClass.prototype[prop] = bluePrint[prop];
		}
	}
	KanvasClass.prototype.__defineSetter__('draw',function(d){
		this.__drawFunction = d;
		this.__postDrawFunction(d);
	})
	KanvasClass.prototype.__defineGetter__('draw', function(){
		return this.__drawFunction;
	});
	KanvasClass.prototype.__defineSetter__('rotation',function(r){
		this.__rotationChange = true;
		this.__rotation = r;
	})
	KanvasClass.prototype.__defineGetter__('rotation', function(){
		return this.__rotation;
	});
	
		
	bluePrint = null;
	return KanvasClass;
}