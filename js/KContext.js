var Kanvas = new (function(){
	var tempCanvas = document.createElement('canvas');
	var tempContext = tempCanvas.getContext('2d');
	//inject Context Functions
	if(!tempContext.constructor.overridden){
		tempContext.constructor.prototype.fillArc = function (xx,yy,rr,start,stop,cw) {
			this.basicArc(xx,yy,rr,start,stop,cw,true);
		}
		
		tempContext.constructor.prototype.strokeArc = function (xx,yy,rr,start,stop,cw) {
			this.basicArc(xx,yy,rr,start,stop,cw,false);
		}
		tempContext.constructor.prototype.basicArc = function (xx,yy,rr,start,stop,cw,fill) {
			this.beginPath();
			this.arc(xx,yy,rr,start||0,stop||Math.PI*2,cw||true);
			this.closePath();
			if(fill)this.fill();
			else this.stroke();
		}
		tempContext.constructor.overridden = true;
	}
	this.__CANVASCLASSNAME = tempCanvas.constructor.name;
	
	//Done Injecting
	var all = [];
	
	this.__addKanvas = function(k){
		all.push(k);
	}
	
	this.__rotateCoords = function(xx,yy,rr){
		return [((xx * Math.cos(rr)) - (yy * Math.sin(rr))),((xx * Math.sin(rr)) + (yy * Math.cos(rr)))];
	}
	
	this.__pointInRect = function(xx, yy, left, up, right, down){
		if(xx > left &&  xx < right && yy > up &&  yy < down)return true;
		return false
	}
	
	this.create = function(element, properties){
		return new KanvasElement(this, element, properties);
	}

	this.class = function(bluePrint){
		return newKanvasClass(bluePrint)
	}
	
	this.moveTo = function(val1, val2, spd, round){
		if(Math.abs(val2 - val1) < Math.abs(0.001*val2)) {
			return val2;
		}else if(round)return Math.round(val1 + (val2 - val1)/spd);
		return val1 + (val2 - val1)/spd
	}
	
	this.StageClass = this.class({
		init:function(){
			this.dynamic = false;
			this.isStage = true;
			this.color = null
		},
		predraw:function(context){
			if(this.color){
				context.fillStyle = this.color;
				context.fillRect(0,0,this.kanvas.canvas.width,this.kanvas.canvas.height);
			}
		}	
	});
})
function newKanvasClass(bluePrint){
	var KanvasClass = new Function('this.__init.call(this, arguments);');
	
	KanvasClass.prototype = {
		__init: function(args){
			this.name = 'Unnamed Class',
			this.x = 0;
			this.y = 0;
			this.scaleX = 1;
			this.scaleY = 1;
			this.rotation = 0;
			this.showBox = false;
			this.dynamic = true;
			this.rolled = false;
			this.onlyRolled = false;
			this.kanvas = null;
			this.children = new Array();
			
			//this.draw = null;
			//this.predraw = null;
			//this.every = null;
			//this.mouseOver = null;
			//this.mouseOut = null;
			//this.mouseMove = null;
			
			this.__hitBox = null;
			this.__hitBoxOverride = false;
			this.__width = null;
			this.__height = null;
			this.__insideX = 0;
			this.__insideY = 0;
			this.__needsRedraw = true;
			this.__drawData = null;
			this.__globalCoords = [0,0];
			this.__globalScales = [1,1];
			this.__globalRotation = 0;
			this.__toApply = [];
			this.__blockRoll = false;
			this.__kanvasObject = true;
			
			this.init.apply(this,args);
			this.__needsRedraw = true;
		},
		__render: function(){
			if(this.parent){
				delete this.__globalCoords;
				this.__globalRotation = this.parent.__globalRotation + this.rotation;
				this.__globalCoords = Kanvas.__rotateCoords(this.x*this.parent.__globalScales[0],
															this.y*this.parent.__globalScales[1], 
															this.parent.__globalRotation);
				this.__globalCoords[0] += this.parent.__globalCoords[0];
				this.__globalCoords[1] += this.parent.__globalCoords[1];
				this.__globalScales[0] = this.scaleX * this.parent.__globalScales[0];
				this.__globalScales[1] = this.scaleY * this.parent.__globalScales[1];
			}else{
				this.__globalRotation = this.rotation;
				this.__globalCoords[0] = this.x;
				this.__globalCoords[1] = this.y;
				this.__globalScales[0] = this.scaleX;
				this.__globalScales[1] = this.scaleY;
			}
			this.kanvas.context.save();
			this.kanvas.context.translate(this.x, this.y);
			this.kanvas.context.scale(this.scaleX, this.scaleY);
			this.kanvas.context.rotate(this.rotation);
			
			if(this.__needsRedraw){
				this.__trackDraw();
			}
			
			
			if(this.predraw)this.predraw(this.kanvas.context);
			//draw Children
			for(child in this.children){
				this.children[child].__render();
			}
			if(this.draw)this.draw(this.kanvas.context);
			
			
			
			
			this.kanvas.context.restore();
			if(this.showBox)this.__boxMe(this.kanvas.context);
		},
		addEventListener:function(ev_type){
			if(this.kanvas)this.kanvas.addEventListener(this, ev_type);
			else if(this.__toApply.indexOf(ev_type)<0)this.__toApply.push(ev_type);
		},
		removeEventListener:function(ev_type){
			if(this.kanvas)this.kanvas.removeEventListener(this, ev_type);
			else if(this.__toApply.indexOf(ev_type)>=0)this.__toApply.splice(this.__toApply.indexOf(ev_type),1);
		},
		addChild:function(child){
			var ind = this.children.indexOf(child);
			if(ind>=0)this.children.splice(ind,1);
			this.children.push(child);
			child.parent = this;
			//child.__needsRedraw = true;
			if(child.onAdd)child.onAdd();
		},
		removeChild:function(index){
			var ind;
			if(typeof(index) == 'number')ind = index;
			else ind = this.children.indexOf(index);
			
			if(ind>=0){
				var child = this.children.splice(ind,1)[0];
				if(child.onRemove)child.onRemove();
				child.parent = null;
			}
		},
		refocus:function(child){
			if(!child && this.parent)this.parent.refocus(this);
			if(this.children.indexOf(child)>=0){
				this.removeChild(child);
				this.addChild(child);
			}
		},
		__every:function(kanvas){
		
			this.kanvas = kanvas;
			while(this.__toApply.length>0 && this.kanvas){
				this.addEventListener(this.__toApply[0])
				this.__toApply.splice(0,1);
			}
			//run every
			if(this.every){
				this.every();
			}
			//run childrens every
			var tempChildren = this.children.valueOf();
			for(child in tempChildren)tempChildren[child].__every(kanvas);
			tempChildren = null
			
			if(this.postevery){
				this.postevery();
			}
		},
		init:function(){
			console.log('init not defined on ' + this.name);
		},
		
		
		__trackDraw: function(){
			this.kanvas.__altContext.beginTrack({rot:0})//this.rotation})
			
			if(this.predraw)this.predraw(this.kanvas.__altContext);
			if(this.draw)this.draw(this.kanvas.__altContext);
			
			var temp = this.kanvas.__altContext.closeTrack();
			
			
			this.__setHitBox(temp.hitBox, true)
			this.__drawData = temp.data;
			
			temp = null
			if(!this.dynamic || this.__hitBoxOverride)this.__needsRedraw = false;
		},
		__setHitBox: function(hb, ovrd){
			if(!hb)return false;
			if(!ovrd)this.__hitBoxOverride = true;
			if(ovrd && this.__hitBoxOverride)return false;
			this.__hitBox =  hb;
			if(typeof(this.__hitBox) == 'number'){
				this.__insideX = this.__hitBox;
				this.__insideY = this.__hitBox;
				this.__width =  this.__hitBox*2;
				this.__height = this.__hitBox*2;
			}else if(this.__hitBox.length == 4 && typeof(this.__hitBox[0])=='number'){
				this.__insideX = -hb[0];
				this.__insideY = -hb[1];
				this.__width =  hb[2]-hb[0];
				this.__height =  hb[3]-hb[1];
			} 
		},
		hitTest: function(){
			if(this.__hitBox == null)return false;
			if(arguments == null)return false;
			if(arguments.length == 2 && typeof(arguments[0])=='number'&& typeof(arguments[1])=='number'){
				return this.hitTestLocal.apply(this, this.__globalToLocal(arguments[0],arguments[1]));			
			}
		},
		hitTestLocal:function(){
			if(this.__hitBox == null)return false;
			if(arguments == null)return false;
			if(arguments.length == 2 && typeof(arguments[0])=='number'&& typeof(arguments[1])=='number'){
				var tempX = arguments[0]
				var tempY = arguments[1]
			}
			if(typeof(this.__hitBox) == 'number'){
				return (Math.sqrt((tempX*tempX)+(tempY*tempY)) < this.__hitBox)
			}else if(this.__hitBox.length == 4 && typeof(this.__hitBox[0])=='number'){
				return Kanvas.__pointInRect(tempX, tempY, 
											this.__hitBox[0],
											this.__hitBox[1],
											this.__hitBox[2],
											this.__hitBox[3])
			}
			
		},
		__clearCustomHitBox: function(){
			this.__hitBoxOverride = false;
		},
		__globalToLocal: function(xx,yy){
			return Kanvas.__rotateCoords(	(xx - this.__globalCoords[0])/this.__globalScales[0], 
											(yy - this.__globalCoords[1])/this.__globalScales[1],
											-this.__globalRotation || 0);
		},
		__boxMe: function(cc){
			cc.save();
			cc.translate(this.x, this.y);
			cc.rotate(this.rotation);
			
			var needsClosure = false;
			if(this.__hitBox && typeof(this.__hitBox) == 'number'){
				needsClosure = true;
				cc.save();
				cc.scale(this.scaleX, this.scaleY);
				cc.beginPath();
				cc.arc(0,0,this.__hitBox, 0, Math.PI*2, true);
				cc.closePath()
			}
			else if(this.__width){
				needsClosure = true;
				cc.save();
				cc.scale(this.scaleX, this.scaleY);
				cc.beginPath();
				cc.rect(-this.__insideX,-this.__insideY,this.__width,this.__height);
				cc.closePath()
			}
			
			if(needsClosure){
				cc.strokeStyle = "#FFF";
				cc.stroke();
				cc.lineWidth = 1.5 / ((this.__globalScales[0]+this.__globalScales[1])/2);
				cc.strokeStyle = "#000";
				cc.setLineDash([3,3])
				cc.stroke();
				cc.restore();
			}
			
			//cc.scale(1/this.__globalScales[0], 1/this.__globalScales[1]);
			cc.fillStyle = "#000";
			cc.fillRect(-1.5,-4,3,8);
			cc.fillRect(-4,-1.5,8,3);
			cc.fillStyle = "#fff";
			cc.fillRect(-0.5,-3,1,6);
			cc.fillRect(-3,-0.5,6,1);
			
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
						
						case 'setVar':
							if(!cc[this.__drawData[ii][2]])console.log('Property ' + this.__drawData[ii][2] + " doesn't exist on Context");
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
	


	KanvasClass.prototype.__defineSetter__('rotation',function(r){
		this.__rotationChange = true;
		this.__rotation = r;
	})
	KanvasClass.prototype.__defineGetter__('rotation', function(){
		return this.__rotation;
	});

	KanvasClass.prototype.__defineGetter__('width', function(){
		return this.__width;
	});

	KanvasClass.prototype.__defineGetter__('height', function(){
		return this.__height;
	});

	if(typeof(bluePrint)=="function"){
		KanvasClass.prototype.draw = bluePrint.bind(KanvasClass.prototype);
	}else{
		for(var prop in bluePrint){
			if(typeof(bluePrint[prop])=='function'){
				KanvasClass.prototype[prop] = bluePrint[prop].bind(KanvasClass.prototype);
			}
			KanvasClass.prototype[prop] = bluePrint[prop];
		}
	}
	
	bluePrint = null;
	return KanvasClass;
}
function KanvasElement(_mainKanvas, element, props){
	if(!props)props = {};
	
	//main vars
	var _self = this;
	this.Kanvas = _mainKanvas;
	this.mouseX = 0;
	this.mouseY = 0;
	this.mouseDown = false;
	this.paused = false;
	this.stage = new this.Kanvas.StageClass();
	this.baseFPS = props.baseFPS||60;
	
	
	//start canvas
	this.makeCanvas(element);
	this.Kanvas.__addKanvas(this);
	this.__setWidthHeight(props.width, props.height)
	this.context = this.canvas.getContext('2d');
	this.canvas.kanvas = this;
	
	//other vars
	this.__altContext = new KContext(this.context);
	this.__trackingMouse = false;
	this.__mouseMoveListeners = [];
	this.__mouseDownListeners = [];
	this.__needsMouseCalculation = true;
	this.__AdHoc = function(){_self.MAIN()}
	
	this.startTrackingMouse();
	if(!props.still)this.animate();
	//
}
KanvasElement.prototype.addEventListener = function(object, type){
	var tempAr = this.getListenersFor(type);
	if(tempAr && tempAr.indexOf(object)<0){
		tempAr.push(object);
	}
}

KanvasElement.prototype.removeEventListener = function(object, type){
	var tempAr = this.getListenersFor(type);
	if(tempAr){
		var tempInd = tempAr.indexOf(object);
		if(tempInd>0){
			tempAr.splice(tempInd,1);
		}
	}
}
KanvasElement.prototype.getListenersFor = function(type){
	var ar;
	switch(type.toUpperCase()){
		case 'MOUSEDOWN':
		case 'MOUSEUP':
			ar = this.__mouseDownListeners
			break;
		case 'MOUSEMOVE':
			ar = this.__mouseMoveListeners
			break;
		default:
			console.log('event type', type, 'not found.', 'mouseDown, mouseOver, and mouseMove are the only supported ATM');
			break;
	}
	return ar;
}
KanvasElement.prototype.animate = function(stop){
	if(stop)clearInterval(this.__AdHoc);
	else setInterval(this.__AdHoc,1000/this.baseFPS);
}

KanvasElement.prototype.MAIN = function(){
	this.runMouseRoll();
	this.stage.__every(this);
	this.stage.__render()
}

KanvasElement.prototype.makeCanvas = function(element){
	this.__containingElement = element;
	if(element.constructor && element.constructor.name==this.Kanvas.__CANVASCLASSNAME){//object is a canvas
		this.canvas = element;
	}else{//object to put a canvas in
		this.canvas = document.createElement('canvas');
		
		if(element.append){
			element.append(this.canvas); 
		}else if(element.appendChild){
			element.appendChild(this.canvas);
		}
	}
}

KanvasElement.prototype.__setWidthHeight = function(ww,hh){
	if(this.__containingElement.constructor && this.__containingElement.constructor.name==this.Kanvas.__CANVASCLASSNAME){//object is a canvas
		this.__containingElement.width = ww||200;
		this.__containingElement.height = hh||200;
	}else{
		if(ww)this.canvas.width = ww;
		else this.canvas.width = $(this.__containingElement).width();
		
		if(hh)this.canvas.height = hh;
		else this.canvas.height = $(this.__containingElement).height();
	}
}
KanvasElement.prototype.startTrackingMouse = function(){
	if(!this.__trackingMouse){
		this.canvas.addEventListener('mousemove', this.mouseMoveHandler);
		this.canvas.addEventListener('mousedown', this.mouseDownHandler);
		this.canvas.addEventListener('mouseup', this.mouseUpHandler);
		this.__trackingMouse = true;
	}
}
KanvasElement.prototype.stopTrackingMouse = function(){
	if(this.__trackingMouse){
		this.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
		this.canvas.removeEventListener('mousedown', this.mouseDownHandler);
		this.canvas.removeEventListener('mouseup', this.mouseUpHandler);
		this.__trackingMouse = false;
	}
}
KanvasElement.prototype.mouseMoveHandler = function(e){
	//From Canvas Scope.
	if(e.clientX){
		var rect = this.getBoundingClientRect();
		if(rect){
			this.kanvas.mouseX = e.clientX - rect.left,
			this.kanvas.mouseY = e.clientY - rect.top
		}else{
			this.kanvas.mouseX = e.clientX - this.offsetLeft;
			this.kanvas.mouseY = e.clientY - this.offsetLeft;
		}
	}else if(e.offsetX) {
		this.kanvas.mouseX = e.offsetX;
		this.kanvas.mouseY = e.offsetY;
	}else if(e.layerX) {
		this.kanvas.mouseX = e.layerX;
		this.kanvas.mouseY = e.layerY;
	}else console.log("Couldn't Determine Mouse Coordinates", e.offsetX, e.layerX, e.pageX, e.clientX);
}
KanvasElement.prototype.mouseDownHandler = function(e){this.kanvas.onMouseDown();}
KanvasElement.prototype.mouseUpHandler = function(e){this.kanvas.onMouseUp();}
KanvasElement.prototype.onMouseDown = function(){
	this.mouseDown = true;
	var allClicked = [];
	for(var object in this.__mouseDownListeners){
		this.getMouseCoords(this.__mouseDownListeners[object])
		if(this.__mouseDownListeners[object].trackyeah)console.log(this.__mouseDownListeners[object].mouseX, this.__mouseDownListeners[object].mouseY,this.__mouseDownListeners[object].rolled )
		if(this.__mouseDownListeners[object].rolled){
			allClicked.push(this.__mouseDownListeners[object]);
			if(this.__mouseDownListeners[object].mouseDown)this.__mouseDownListeners[object].mouseDown();
		}
	}
	
	
}
KanvasElement.prototype.onMouseUp = function(){
	this.mouseDown = false;
	for(var object in this.__mouseDownListeners){
		this.getMouseCoords(this.__mouseDownListeners[object])
		if(this.__mouseDownListeners[object].mouseUp){
			this.__mouseDownListeners[object].mouseUp(this.__mouseDownListeners[object].rolled);
		}
		
	}
}
KanvasElement.prototype.runMouseRoll = function(){
	var _rolled = null;
	for(var object in this.__mouseMoveListeners){
		var ob = this.__mouseMoveListeners[object];
		this.getMouseCoords(ob);
		
		ob.onlyRolled = false;
		var rolledBefore = ob.rolled;
		
		
		ob.rolled = this.determineRolled(ob)
		if(ob.rolled && ob.__blockRoll && !_rolled)_rolled = ob;
		if(_rolled != ob && ob.rolled && ob.mouseOut)ob.mouseOut()
		
		if(ob.rolled && ob.mouseMove)ob.mouseMove();
		
		if(!rolledBefore && ob.rolled && !_rolled && ob.mouseOver)ob.mouseOver();
		if(rolledBefore && !ob.rolled && !_rolled && ob.mouseOut)ob.mouseOut();
			
	}
	if(_rolled)_rolled.onlyRolled = true;
}
KanvasElement.prototype.getMouseCoords = function(ob){
	var temp = ob.__globalToLocal(this.mouseX, this.mouseY);	

	ob.mouseX = temp[0];
	ob.mouseY = temp[1];
}
	
	
KanvasElement.prototype.determineRolled = function(ob){
	return ob.hitTestLocal(ob.mouseX,ob.mouseY);
}

function KContext(model){
	var self = this;
	
	var supportedFunctions = ['trace', 'boxMe', 'fillArc'];
	var supportedVars = [];
	var warning = [];
	var commands = [];
	var saveStack = [];
	var tracking = false;
	
	var TRANS, SCALE, ROT;
	var _TRANS, _SCALE, _ROT;
	
	for(xx in model)((typeof(model[xx]) == "function")?(supportedFunctions):(supportedVars)).push(xx);
	
	
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
		var temp = Kanvas.__rotateCoords(xx,yy, ROT);
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
					for(var ii = 0; ii < 4; ii += 1){
						var r = (args[3]||0) + (((args[4]||Math.PI*2) - (args[3]||0)) * (ii/3));
						hasPoint(args[0] + Math.cos(r)*args[2], args[3] +args[1]+ Math.sin(r)*args[2]);
					}
					temp = null;
					break;
				case 'drawImage':
					if(args[0] && args[0].width){
						var ww = (args.length>3)?(args[3]):(args[0].width)
						var hh = (args.length>3)?(args[4]):(args[0].height)
						hasPoint(args[1]	 , args[2]);
						hasPoint(args[1]+ ww , args[2] + hh);
						hasPoint(args[1]+ ww , args[2]);
						hasPoint(args[1]	 , args[2] + hh);
					}
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
	
	this.traceMe = function(){					
		traceMe();
	}
}




