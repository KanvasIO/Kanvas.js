function KContext(){
	//
	var self = this;
	
	var supportedFunctions = ['trace', 'boxMe', 'circle'];
	var supportedVars = [];
	var warning = [];
	var commands = [];
	var saveStack = [];
	
	var tempCan = document.createElement('canvas');
	var tempCTX = tempCan.getContext('2d');
	
	for(xx in tempCTX)((typeof(tempCTX[xx]) == "function")?(supportedFunctions):(supportedVars)).push(xx);
	
	tempCan = null;
	tempCTX = null;
	
	var proxyFunc = function(){
		commands.push([this.name, proxyFunc.arguments, this.varName]); 
	};
	
	for (var ii in supportedFunctions){
		self[supportedFunctions[ii]] = proxyFunc.bind({name:supportedFunctions[ii]});
	}
	for (var ii in supportedVars){
		///
		self.__defineGetter__(supportedVars[ii], function(){
			return this[supportedVars[ii]+"X"];
		})
		//
		self.__defineSetter__(supportedVars[ii], proxyFunc.bind({
			name:'setVar', 
			varName:supportedVars[ii]
		}));
	}
	
	//
	this.beginTrack = function(){
		commands = [];
		saveStack = [];
		xy = null;
		mxy = null;
		TRANS = [0, 0];
		SCALE = [1, 1];
		ROT = 0;
	}
	var hasPoint = function(xx, yy){
		var temp = ((xx * Math.cos(ROT)) - (yy * Math.sin(ROT)))* SCALE[0] + TRANS[0];
		yy = ((xx * Math.sin(ROT)) + (yy * Math.cos(ROT)))* SCALE[1] + TRANS[1];
		xx = temp;
		
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
	
	var closeTrackX = function(){
		for(var ii in commands){
			var args = commands[ii][1];
			switch(commands[ii][0]){
				case 'save': 
					saveStack.push([TRANS[0],
									TRANS[1],
									SCALE[0],
									SCALE[1],
									ROT]);
					break;
				case 'restore': 
					var temp = saveStack.pop();
					TRANS = [temp[0],temp[1]];
					SCALE = [temp[2],temp[3]];
					ROT = temp[4];
					break;
				case 'scale':
					SCALE[0] *= args[0];
					SCALE[1] *= args[1];
					break;
				case 'rotate':
					ROT += args[0];
					break;
				case 'translate':
					TRANS[0] += args[0];
					TRANS[1] += args[1];
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
					hasPoint(args[0], args[3]+args[1]);
					break;
				case 'arc':
					hasPoint(args[0]-args[2], args[1]-args[2]);
					hasPoint(args[0]+args[2], args[1]+args[2]);
					break;
			}
		}
		return 
		//Evaluate Width/Height
	}
	
	this.closeTrack = function(){
		return closeTrackX();
	}
	
	
	var traceMe = function(){					
		console.log('ME:');
		console.log(xy, 'xy');
		console.log(mxy, 'mxy');
		console.log(TRANS, 'trans');
		console.log(SCALE, '');
		console.log(ROT, 'rotation');
	}
	
	var drawToX = function(cc){
		if(!xy)return false;
		for(var ii in commands){
			if(cc[commands[ii][0]])cc[commands[ii][0]].apply(cc, commands[ii][1]);
			else{
				switch(commands[ii][0]){
					case 'trace':
						traceMe();
						break
					case 'circle':
						cc.beginPath();
						cc.arc.apply(cc, commands[ii][1].concat([0, Math.PI*2, true]));
						cc.closePath();
					case 'setVar':
						cc[commands[ii][2]] = commands[ii][1][0];
						break;
					case 'boxMe':
						cc.save();
						cc.fillStyle= "#000000";
						cc.fillRect(-1.5,-4,3,8);
						cc.fillRect(-4,-1.5,8,3);
						cc.fillStyle= "#ffffff";
						cc.fillRect(-0.5,-3,1,6);
						cc.fillRect(-3,-0.5,6,1);
						cc.rotate(-ROT);
						cc.scale(1/SCALE[0], 1/SCALE[1]);
						cc.translate(-TRANS[0], -TRANS[1]);
						cc.beginPath();
						cc.rect(xy[0], xy[1],mxy[0]-xy[0], mxy[1]-xy[1]);
						cc.closePath();
						cc.strokeStyle = "#FF0000";
						cc.setLineDash([3,3])
						cc.stroke();
						cc.restore();
						break
				}
			}
		}
	}
	this.drawTo = function(cc){drawToX(cc)};
	
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
		render: function(){
			context.beginTrack();
			context.save();
			context.translate(this.x, this.y);
			context.scale(this.scaleX, this.scaleY);
			context.rotate(this.rotation);
			this.draw();
			if(this.showBox)context.boxMe();
			context.closeTrack();
			context.restore();
			context.drawTo(ctx);
		},
		__init: function(aa){
			//console.log(aa);
			this.init.apply(this,aa);
		},
		init:function(){
			console.log('init not defined on ' + this.name);
		}
	}
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