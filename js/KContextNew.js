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
	
	
	
	var __beginTrack = function(){
		tracking = true;
		clearVars();
	}
	this.beginTrack = function(){
		__beginTrack();
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
	
	var __clearTrack = function(){
		commandsStack = [];
	}
	this.clearTrack = function(){
		__clearTrack();
	}
	//
	var getCoords = function(xx,yy){
		var temp2 = ((xx * Math.cos(ROT)) - (yy * Math.sin(ROT)))* SCALE[0] + REAL[0];
		yy = ((xx * Math.sin(ROT)) + (yy * Math.cos(ROT)))* SCALE[1] + REAL[1];
		return [temp2,yy];
	}
	var hasPoint = function(xx, yy){
		var temp = getCoords(xx,yy);
		xx = temp[0];
		yy = temp[1];
		
		
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
		for(var ii in commands){
			var args = commands[ii][1];
			switch(commands[ii][0]){
				case 'trace':
					traceMe();
					break
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
					REAL[1] += (args[0]*SCALE[0] * Math.sin(ROT)) + (args[1]*SCALE[1] * Math.cos(ROT))
					break;
				case 'moveTo':
				case 'lineTo':
					hasPoint(args[0], args[1]);
					break;
				case 'rect':
				case 'strokeRect':
				case 'fillRect':
					hasPoint(args[0], args[1]);
					hasPoint(args[2] + args[0], args[3] + args[1]);
					hasPoint(args[0] + args[2], args[1]);
					hasPoint(args[0], args[3] + args[1]);
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
			cmds: commands,
			globalX: REAL[0],
			globalY: REAL[1],
			hitBox : [xy[0], xy[1],mxy[0]-xy[0], mxy[1]-xy[1]]
		}
		clearVars();
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
		console.log(SCALE, 'scale');
		console.log(ROT, 'rotation');
	}
	
	
	
}
function newClass(bluePrint){
	var newC = new Function('this.__init.call(this, arguments);');
	newC.prototype = {
		name: 'Unnamed Class', 
		x: 0,
		y: 0,
		scaleX: 1,
		scaleY: 1,
		rotation: 0,
		showBox: false, 
		globalX: 0,
		globalY: 0,
		hitBox : null,
		drawData: null,
		drawFunction: null,
		render: function(cc){
			//if(this.every)this.every();
			cc.save();
			this.scrape();
			cc.translate(this.x, this.y);
			cc.scale(this.scaleX, this.scaleY);
			cc.rotate(this.rotation);
			//console.log(this.hitBox);
			if(!this.hitBox)return false;
			for(var ii in this.drawData){
				if(cc[this.drawData[ii][0]])cc[this.drawData[ii][0]].apply(cc, this.drawData[ii][1]);
				else{
					switch(this.drawData[ii][0]){
						case 'fillArc':
							cc.beginPath();
							cc.arc.apply(cc, this.drawData[ii][1]);
							cc.closePath();
							cc.fill();
							break;
						case 'strokeArc':
							cc.beginPath();
							cc.arc.apply(cc, this.drawData[ii][1]);
							cc.closePath();
							cc.stroke();
							break;
						case 'setVar':
							cc[this.drawData[ii][2]] = this.drawData[ii][1][0];
							break;
						case 'boxMe':
							cc.save();
							
							cc.globalAlpha= 1;
							cc.fillStyle= "#000000";
							cc.fillRect(-1.5,-4,3,8);
							cc.fillRect(-4,-1.5,8,3);
							cc.fillStyle= "#ffffff";
							cc.fillRect(-0.5,-3,1,6);
							cc.fillRect(-3,-0.5,6,1);
							
							cc.translate(-this.x, -this.y);
							cc.translate(-this.rotation);
							
							cc.beginPath();
							cc.rect(this.hitBox[0],this.hitBox[1],this.hitBox[2],this.hitBox[3]);
							cc.closePath();
							cc.strokeStyle = "#000";
							cc.setLineDash(0)
							cc.stroke();
							cc.lineWidth = 1.5
							cc.strokeStyle = "#FFf";
							cc.setLineDash([3,3])
							cc.stroke();
							cc.restore();
							break
					}
				}
			}
			cc.restore();
		},
		
		
		scrape: function(){
			if(!this.draw)return false;
			
			context.beginTrack();
			context.save();
			context.translate(this.x, this.y);
			context.scale(this.scaleX, this.scaleY);
			context.rotate(this.rotation);
			this.draw();
			if(this.showBox)context.boxMe();
			context.restore();
			var temp = context.closeTrack();
			
			this.drawData = temp.cmds;
			this.globalX = temp.globalX;
			this.globalY = temp.globalY;
			this.hitBox = temp.hitBox;
			
		},
		__init: function(aa){
		
			this.init.apply(this,aa);
			this.scrape();
		},
		init:function(){
			console.log('init not defined on ' + this.name);
		},
	}
	//newC.prototype.__defineSetter__('draw',function(d){
	//	this.drawFunction = d;
	//	this.scrape();
	//})
	if(typeof(bluePrint)=="function"){
		newC.prototype.draw = bluePrint.bind(newC.prototype);
	}else{
		for(var prop in bluePrint){
			newC.prototype[prop] = bluePrint[prop];
		}
	}
	bluePrint = null;
	return newC;
}