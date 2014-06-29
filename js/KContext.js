// ===== CartesianTransformation Class ====
function CartesianTransformation(x,y,r,xx,yy){
	this.x = x || 0;
	this.y = y || 0;
	this.rotation = r || 0;
	this.scaleX = xx || 1;
	this.scaleY = yy || 1;
}


// - Applies inverse Transformation to a coordinate pair (global to local);
CartesianTransformation.prototype.applyInverse =  function(xx,yy){			
	return Kanvas.__rotateCoords(	(xx - this.x)/this.scaleX, 
									(yy - this.y)/this.scaleY, 
									-this.rotation || 0);
									
}


// - Applies Transformation to a coordinate pair (local to global)
CartesianTransformation.prototype.apply =  function(xx,yy){		
	// - Applies Rotation
	var temp = Kanvas.__rotateCoords(	xx,	yy, this.rotation);
	
	temp[0] *= this.scaleX;
	temp[1] *= this.scaleY;
	
	temp[0] += this.x;
	temp[1] += this.y;
	
	return temp;
}


// - returns object with main variables on it
CartesianTransformation.prototype.save =  function(){		
	return (this.setFrom.call({}, this));
}


// - Applies Transformation to a coordinate pair (local to global)
CartesianTransformation.prototype.apply =  function(xx,yy){		
	// - Applies Rotation
	var temp = Kanvas.__rotateCoords(	xx,	yy, this.rotation);
	
	temp[0] *= this.scaleX;
	temp[1] *= this.scaleY;
	
	temp[0] += this.x;
	temp[1] += this.y;
	
	return temp;
}

// - Inherits all properties from an input object
CartesianTransformation.prototype.setFrom =  function(object){	
	this.rotation 	= object.rotation;
	this.x 			= object.x;
	this.y  		= object.y;
	this.scaleX  	= object.scaleX;
	this.scaleY 	= object.scaleY;
	return this;
}



CartesianTransformation.prototype.addToParent =  function(CARTESIAN){	
	// - Determine Origin's global position using input Cartesian
	var temp = CARTESIAN.apply(this.x, this.y);
	this.x = temp[0];
	this.y = temp[1];
	
	// - Combine other Variables
	this.rotation += CARTESIAN.rotation;
	this.scaleX *= CARTESIAN.scaleX;
	this.scaleY *= CARTESIAN.scaleY;
}	



// ===== HitBox Base Class =====
function BasicHitBox(){
	this.type = 'basic';
	this.isHitBox = true;
}
BasicHitBox.prototype.setObject = function(object){
	this.object = object;
	this.needsUpdate = true;
}
BasicHitBox.prototype.hitTest = function(xx,yy){
	console.error('must be extended');
	return false;
}
BasicHitBox.prototype.update = function(){}


// ===== Radial HitBox =====
function RadialHitBox(xx, yy, rr){
	BasicHitBox.call(this);
	this.type = 'radial'
	this.x = xx;
	this.y = yy;
	this.radius = rr;
}
RadialHitBox.prototype = new BasicHitBox();
RadialHitBox.prototype.constructor = RadialHitBox
RadialHitBox.prototype.hitTest = function(xx,yy){
	return (	Math.sqrt( 	Math.pow( xx - this.x, 2)  +
							Math.pow( yy - this.y, 2))  < this.radius);
							
}



// ===== Rectangle HitBox =====
function RectangleHitBox(){
	BasicHitBox.call(this);
	this.type = 'rectangle';
	this.x = [];
	this.y = [];
	if(arguments && arguments.length)this.setRect.apply(this, arguments);
}
RectangleHitBox.prototype = new BasicHitBox();
RectangleHitBox.prototype.constructor = RectangleHitBox

RectangleHitBox.prototype.setRect = function(Min_X, Min_Y, Max_X, Max_Y){
	this.x = [this.x[0] || Min_X, this.maxX || Max_X]
	this.y = [this.y[0] || Min_Y, this.maxY || Max_Y]
}
RectangleHitBox.prototype.hitTest = function(xx,yy){
	return	!( 	(xx	>	this.x[1]) || 
				(xx	<	this.x[0]) || 
				(yy	>	this.y[1]) || 
				(yy	<	this.y[0]));
}




// ===== Bounds HitBox =====

function BoundsHitBox(){
	RectangleHitBox.call(this);
	this.type = 'bounds';
	this.needsUpdate = false;
	this.dynamic = false;
}

BoundsHitBox.prototype = new RectangleHitBox();
BoundsHitBox.prototype.constructor = BoundsHitBox

BoundsHitBox.prototype.resetBounds = function(){
	this.setRect(null, null, null, null)
}
BoundsHitBox.prototype.includeCoordinate = function(xx, yy){
	this.minX = Math.min(this.minX, xx);
	this.maxX = Math.max(this.maxX, xx);
	this.minY = Math.min(this.minY, yy);
	this.maxY = Math.min(this.maxY, yy);
}
BoundsHitBox.prototype.update = function(force){
	if(!this.object)return false;
	if(!this.needsUpdate && !force && !this.dynamic)return false;
	
	Kanvas.contextInterpret.startTrack()//this.object.x, this.object.y)
	if(this.object.predraw)this.object.predraw.call(this.object, Kanvas.contextInterpret);
	if(this.object.draw)this.object.draw.call(this.object, Kanvas.contextInterpret);
	
	this.data = Kanvas.contextInterpret.closeTrack();
	
	// console.log('\nUPDATE BOUNDS FROM OBJECT:');
	this.setRect.apply(this, this.data.bounds);
	// console.log(this.data.paths);
	// console.log(this.data.bounds);
	
	// console.log('hello');
	// console.log(this)
	// console.log(data.bounds);
	this.needsUpdate = false;
}


// ===== Advanced HitBox =====

function AdvancedHitBox(){
	BoundsHitBox.call(this);
	this.type = 'advanced';
}

AdvancedHitBox.prototype = new BoundsHitBox();
AdvancedHitBox.prototype.constructor = AdvancedHitBox

AdvancedHitBox.prototype.basicHitTest = RectangleHitBox.prototype.hitTest;
AdvancedHitBox.prototype.hitTest = function(xx,yy){
	// - Bounds Check Using Inherited Test
	if(!this.basicHitTest())return false;
	
	// - More Advanced BSP Check
	return true;
}


//---------------------------------------------------------
//		Base Kanvas Object Class
//	
//  (contains all functionality which 
//			will be inherited by other Kanvas Classes)
//---------------------------------------------------------


function KanvasBaseClass(){};
KanvasBaseClass.kName = "Base Kanvas Class";
KanvasBaseClass.prototype = {
	
	//====== Constructor =======
	__init:function(name, args){
	
		// - Main Variables 
			this.__kanvasObject = true;
			this.Super = (this.Super || null);
			this.kName = name;
			this.isStage = false;
		
		
		
		// - Main Position Variables
			this.x = 0;
			this.y = 0;
			this.rotation = 0;
			this.scaleX = 1;
			this.scaleY = 1;
			this.__global = new CartesianTransformation();
			
			
		// - Tree Variables
			this.parent = null;
			this.children = new Array();
			this.__events = {
				mouse: {self:false, listeners:[]},
			}
		
		
		// - Mouse Variables
			this.mouseX = null;
			this.mouseY = null;
			this.rolled = false;
			this.mouseChange = false;
			
			
		// - Other Render Variables
			this.showBox = false;
			this.alpha = 1;
			this.context = null;
			
		// - Hitbox Variables
			this.hitBox = null;
			this.setHitBox(null);
		
		
		//Run Extended initialization
		if(this.init)this.init.apply(this,args); 
	},
	
	//====== Other ======
		__setRunRules:function(rules){				//Sets rules that signal which functions should run every frame
			if(!this.__rules || !rules)return (this.__rules = {
				every: true,
				render: true,
			});
			
			this.__rules.every = rules.every || this.__rules.every;
			this.__rules.render = rules.render || this.__rules.render;
			
			return this.__rules;
		},
		__matchCanvasDimension: function(force){	//Forces a stage to mimic dimensions of it's canvas
			if(force || (this.canvas.width != this.width) ||	(this.canvas.height != this.height)){
				this.width = this.canvas.width;
				this.height = this.canvas.height;
				this.setHitBox(0,0,this.width,this.height);
			}else return false;
		},
		
	
	//====== Coordinate Space Math ======
	
		__orientCartesian: function(){			//Combines the current objects orientation and it's parent object's orientation
			this.__global.setFrom(this);
			if(this.parent){
				// console.log('inhertiting cartesian from parent')
				this.__global.addToParent(this.parent.__global);
			}
		},	
		

		
	//===== HitBox Functionality =====
		setHitBox:function(){
			// - Reset HitBox
			this.hitBox = null
			
			// - Discern from arguments
			if(arguments){
				if(arguments.length == 1 && arguments[0]){
					// - When Provided 1 String
					// - Create an object dependant HitBox 
					if(typeof(arguments[0]) == 'string'){
						if(arguments[0] == 'bounds')this.hitBox = new BoundsHitBox();
						if(arguments[0] == 'advanced')this.hitBox = new AdvancedHitBox();
					}
					// - When provided a hitBox
					else if(arguments[0].isHitBox)this.hitBox = arguments[0];
				}
				
				// - When Provided With Array Length 3
				// - Set as arguments for a radial HitBox
				else if(arguments.length == 3){
					this.hitBox = new RadialHitBox(arguments[0], arguments[1], arguments[2]);
				}
				
				// - When Provided With Array Length 4
				// - Set as arguments for a Rectangular HitBox
				else if(arguments.length == 4){
					this.hitBox = new RectangleHitBox(arguments[0], arguments[1], arguments[2], arguments[3]);
				}
			}
			
			// - Default case
			this.hitBox = this.hitBox || new BoundsHitBox();
			this.hitBox.setObject(this);
			
		},		
		mouseHitTest: function(){
			if(!this.hitBox)return true;
			var isGood = this.hitBox.hitTest(this.mouseX, this.mouseY);;
			// console.log(this.hitBox.x , this.hitBox.y)
			// console.log('coords', this.x, this.y)
			// console.log('mouse', this.mouseX, this.mouseY, isGood);
			return isGood;
		},
		
	//====== Continuous Functionality =======
		run: function(rules){					//Stage "every-tick" function
		
			
			if(!this.isStage)return false		//Check Pre Run Conditions
			if(!this.canvas)return false;
					
			
			this.__setRunRules(rules);			//Update Run Conditions if provided
			this.__matchCanvasDimension();		//Update Stage Size
			this.__runMouseEvents();			//Run Mouse Events
			
			
			
			this.__run(this);					//Continue by running normal loop
		},	
		__run: function(Stage){					//Recursive "every-tick" function for lower level Kanvas Objects
			
			//Copy Stage Attributes
				if(!this.isStage){
				
					//Check Connection
					if(!Stage)return console.error('tried to run a non-stage without a link to a stage');
					if(!this.parent || !this.parent.__kanvasObject)return console.error('tried running a node without a parent or a bad parent:', this.parent);
					
					//Inherit Variables
					this.__stage = Stage;
					this.context = this.parent.context;
				} 
				
			//Prepare
				if(Stage.__rules.every && this.every)this.every();		// Run 'Every-Tick' Function on this object
				this.__orientCartesian();								// Align Cartesian for render
				if(this.hitBox)this.hitBox.update();					// Try Hit-box Update
			
			//Run Render and Continue
				if(Stage.__rules.render)this.__preRender(this.context);	//	Run Pre-Render
				for(var child in this.children){						//	Run all Children
					this.children[child].__index = child;					//	Set Index Value
					this.children[child].__run(this.__stage||this);			//	Recursive run
				}
				if(Stage.__rules.render)this.__postRender(this.context);	//Run Post-Render
			
		},
		
		__preRender: function(context){			//Preps the context for render
			
			
			//Position Context
			if(this.x || this.y){
				this.__contextTranslate = true;
				context.translate(this.x, this.y);
			}
			
			if(this.scaleX != 1 || this.scaleY != 1){
				this.__contextScale = true;
				context.scale(this.scaleX, this.scaleY);
			}
			
			if(this.rotation != 0){
				this.__contextRotate = true;
				context.rotate(this.rotation);
			}
			
			if(this.alpha != context.globalAlpha){
				context.globalAlpha = this.alpha;
			}
			
			
			//Run the main background (pre-child) render on this object
			if(this.predraw)this.predraw(context);
		},	
		__postRender: function(context){		//Cleans up the context post-render
		
			//Double check alpha
			if(this.alpha != context.globalAlpha)context.globalAlpha = this.alpha;
			
			//Run the main draw function
			if(this.draw)this.draw(context); 
			
			//Reset Context Position
			if(this.__contextRotate){
				context.rotate(-this.rotation);
				this.__contextRotate = false;
			}
			if(this.__contextScale){
				context.scale(1/this.scaleX, 1/this.scaleY);
				this.__contextScale = false;
			}
			if(this.__contextTranslate){
				 context.translate(-this.x, -this.y);
				 this.__contextTranslate = false;
			}
			
			//Draw outline box
			if(this.showBox)Kanvas.__boxObject.call(this, context);
		},
		
	
	//===== Kanvas Tree Functionality =====
		
		addChild:function(child, before){
		
			//if child has a parent, return false;
			if(child.parent)return console.warn('tried adding child', child, 'but it already had a parent', child.parent);
			//Add Child to this objects children;
			if(!before)this.children.push(child);
			else this.children.unshift(child);
			//Register self as child's parent
			child.parent = this;
			//Run on Add Script for Child
			if(child.onAdd)child.onAdd();
			
			//For every event type
			for(var ii in child.__events){ 
				//loop through children's listener events and apply them to this objects events,
				//
				for(var currentListener in child.__events[ii].listeners){
					//Register all listeners from child to this, and pass up the listener
					this.__registerEventListener(child.__events[ii].listeners[currentListener], ii);
				}
			}
			
			//HANDPRINT HACK, REMOVE
			if(this.__stage && this.__stage.$EL){
				this.__stage.$EL.forceUpdate = 1;
			}
		},
		removeChild:function(index){
			//Check Argument
			if(index==null)return false;
			//Change index to a number if they searched with a non number
			if(typeof(index) != 'number')index = this.children.indexOf(index);
			//If Index doesn't exist, return false;
			if(index<0)return false;
			//Set Temp child by splicing it from children
			var child = this.children.splice(index,1)[0];
			//Call On Object Remove scripts if they exist
			if(child.onRemove)child.onRemove();
			//Remove the child's parent
			child.parent = null;
			
			//Deregister all Events on self (recursive to parents)
			for(var ii in this.__events){ 
				this.__deregisterEventListener(child, ii)
			}
			
			//HANDPRINT HACK, REMOVE
			if(this.__stage && this.__stage.$EL){
				this.__stage.$EL.forceUpdate = 1;
			}
		},
		
	
	//===== General Event Functionality =====
		
		// - User Commands
		addEventListener:function(ev_type){
		
			//rationalize the type of event
			ev_type = Kanvas.eventSuperName(ev_type);
			
			//Grab the current event
			this.event = this.__events[ev_type];
			
			//If the event is already added to self, return with error
			if(this.event.self)return console.error('Tried adding event twice to object', ev_type, 'to', this);
			
			//Make sure we register that this object needs the event
			this.event.self = true;
			this.event.listeners.push([this]);
			
			//if mouse event added compute hitBox
			if(!this.hitBox || ev_type == 'mouse'){
				this.__boxNeedsUpdate = true;
			}
			
			// If parent	: 		Transverse to the top most parentless object and register event there,
			//             			If the transversal reaches a top node (canvas connected), end there.
			// If no parent	:		Wait for add Child to be called and the parent will deal with idle listeners
			if(this.parent){
				this.parent.__registerEventListener( [this], ev_type);
			}
			
			
		},
		removeEventListener:function(ev_type){
			//Rationalize the type of event
			ev_type = Kanvas.EventSuperName(ev_type);
			
			//Grab the current event
			this.event = this.__events[ev_type];
			
			//If the event is not running, break
			if(!this.event.self)return false;
			
			//Make sure we register that this object doesn't need the event
			this.event.self = false;
			
			//Remove traces of this event from parents
			if(this.parent){ //tack true at the end to disremember self event as well
				this.parent.__deregisterEventListener(this, ev_type);
			}
			
			//copy all listeners in event minus the one that corresponds to this
			this.newListeners = [];
			for(var listener in this.event.listeners){
				if(!this.event.listeners[listener][0] == this){
					this.newListeners.push(this.event.listeners[listener]);
				}
			}
			this.event.listeners = this.newListeners;
			
		},
		
		// - Recursive Controls for determining which Events are active on which elements
		__registerEventListener: function(childObjectArray, ev_type){
		
			//Duplicate a child's event listener
			childObjectArray = childObjectArray.slice(0)
			//Add this to the listener [targetChild, targetChild.parent, this]
			childObjectArray.push(this);
			//Add the newly computed listener to the list of event listeners
			this.__events[ev_type].listeners.push(childObjectArray)
			
			//Register Event to parent
			if(this.parent)this.parent.__registerEventListener(childObjectArray, ev_type);
			
		},
		__deregisterEventListener:function(child, ev_type, dontInclude){
			
			if(!this.__events[ev_type])return false;
			
			this.newListeners = [];
			for(var currentListener in this.__events[ev_type].listeners){
				var tempListener = this.__events[ev_type].listeners[currentListener]
				//If the Listener is not just this
				if(tempListener.indexOf(child) < 0){
					this.newListeners.push(tempListener);
				}
			}
			this.__events[ev_type].listeners = this.newListeners
			
			//Recuse up the tree
			if(this.parent)this.parent.__deregisterEventListener(child, ev_type);
		},
		__resetEvents: function(){					//Reset All events to default on this object 
			this.__events = {
				mouse: {self:false, listeners:[]},
			}
		},
		__eventToString: function(eventName){		//Debug: Log all events stemming from this object, takes an event type
			//set up trace formatting
			this.toReturn = '\n\n--------Event Trace--------\n'
			//Return one line event not existant and faile
			if(!this.__events[eventName])this.toReturn + 'Event '+eventName+' not found on this object';
			else{
				if(this.__events[eventName].self){ //display active 
					this.toReturn = this.toReturn + '# Object is actively tracking Event '+eventName+'!\n';
				} else { //display inactive
					this.toReturn = this.toReturn + '- Object is not actively tracking Event '+eventName+'\n';
				}
				
				if(this.__events[eventName].listeners.length<=0){
					this.toReturn = this.toReturn + '- Object has no listener events stored '+eventName+'\n';
				}else{
					this.toReturn = this.toReturn + '# Object has '+ this.__events[eventName].listeners.length + ' Listeners!\n';
					for(var tt in this.__events[eventName].listeners){
						this.toReturn = this.toReturn + '\tListener '+ (Number(tt)+1) + ':\n';
						for(var el in this.__events[eventName].listeners[tt]){
							
							this.toReturn = this.toReturn + '\t\t';
							if(this.__events[eventName].listeners[tt][el]==this)this.toReturn = this.toReturn + '# This';
							else if(this.__events[eventName].listeners[tt][el]==this.parent)this.toReturn = this.toReturn + '# Parent of this';
							else if(this.children.indexOf(this.__events[eventName].listeners[tt][el])>=0)this.toReturn = this.toReturn + '# Child of This';
							else this.toReturn = this.toReturn + '- Object';
							if(el == 0 || el == '0')this.toReturn = this.toReturn +' (Event Object)';
							this.toReturn = this.toReturn + '\n';
						}
					}
				}
			}
			
			this.toReturn = this.toReturn + '----------------------------\n';	
			return this.toReturn;
		},
		__checkValidListener: function(object, event){
			if(!object)											return false
			if(!object.__events[event].listeners.length)		return false;	//Not remembering event
			if(!object.parent && !object.isStage)				return false;	//Not added to scene graph
			if(object.__stage != this) 							return false;	//Different or no stage
			return true;
		},
		
	

	
	
	//===== Stage Functionality =====
	
		// - Mouse
		__setMouseCoords: 	function(xx, yy){		// Set Mouse Coordinates on this object
			var temp = this.__global.applyInverse(xx,yy);	
			this.mouseX = temp[0];
			this.mouseY = temp[1];
			temp = null;
		},
		__stageMouseMove: 	function(xx,yy){		// Runs on mouse move if mouse events are active
			this.mouseX = xx;
			this.mouseY = yy;
			this.mouseChange = true;
		},
		__stageMouseDown: 	function(ev){			// Runs on mouse click if mouse events are active
			if(	this.__stageRolled && 
				this.__stageRolled.parent){
				//Run Mouse Down on Object
				this.__pressedObject = this.__stageRolled;
				this.__pressedObject.pressed = true;
				if(this.__pressedObject.mouseDown)this.__pressedObject.mouseDown();
			}
		},
		__stageMouseUp: 	function(ev){			// Runs on mouse release if mouse events are active
			if(	this.__pressedObject && 
				this.__pressedObject.parent){
				//Unpress
				this.__pressedObject.pressed = false;
				if(this.__pressedObject.mouseUp)this.__pressedObject.mouseUp();
				this.__pressedObject = null;
			}
		},	
		__runMouseEvents: 	function(){				// Runs 'every-tick' and runs mouse events on relevant objects
			//Check prereqs
				// if(!this.mouseChange)return false;
				if(!this.isStage)return false;
			
			//Set Vars
				var LAST = this.__stageRolled;
				var CURRENT = null;
				var LISTEN = this.__events['mouse'].listeners;
			
			//Forget last if irrelevant
				if(!this.__checkValidListener(LAST, 'mouse')) LAST = null;
			
			//Find Top most rolled Object
				for(var LL = LISTEN.length-1; LL >= 0; LL -= 1){
					var OBJECT = LISTEN[LL][0];									//	Set Temp Object
					if(!this.__checkValidListener(OBJECT, 'mouse'))continue;	// Return if invalid Object
					OBJECT.__setMouseCoords(this.mouseX, this.mouseY);			// Set Coordinates on eventObject
					
					//If mouse is over it 
					if(OBJECT.mouseHitTest()){
						CURRENT = OBJECT;
						if(!OBJECT.rolled && OBJECT.mouseEnter)		OBJECT.mouseEnter();
						if(OBJECT.mouseMove)						OBJECT.mouseMove();
						OBJECT.rolled = true;
					}else OBJECT.rolled = false;
					
				}
				
			//Unroll Last frame's rolled object
				if(LAST && LAST!=CURRENT){
					LAST.rolled = false;
					LAST.pressed = false;
					if(LAST.mouseOut)LAST.mouseOut();
				}
			
			//Finish up
				this.__stageRolled = CURRENT;
				this.mouseChange = false;
		},
	

	
	
	
	//====== Old HitBox
	
	/*__tryBoxUpdate: function(){
		//Check if we already have a hitBox, or if we aren't dynamic and don't have an update flag
		if(this.__hitBoxOverride || (!this.dynamic && !this.__boxNeedsUpdate))return false;
		
		//Begin Tracking With the Alt Context
		Kanvas.__altContext.beginTrack()
		
		//Begin Tracking With the Alt Context
		if(this.predraw)this.predraw(Kanvas.__altContext);
		if(this.draw)this.draw(Kanvas.__altContext);
		
		this.temp = Kanvas.__altContext.closeTrack();
		//Set the Hit Box
		this.__setHitBox(this.temp.hitBox, true)
		
		//Reset Box Update Flag
		this.__boxNeedsUpdate = false;
	},
	__setHitBox: function(hb, notUserGenerated){
		//If not user generated, but there is a user generated one in place return false
		if(notUserGenerated && this.__hitBoxOverride)return false
		//If no hitbox given, set to a small radius?
		if(!hb)hb = 2;
		
		//If User Generated, Put the Override in place
		if(!notUserGenerated){
			this.__hitBoxOverride = true;
		}
		
		
		//Set HitBox
		this.__hitBox =  hb;
		if(typeof(this.__hitBox)=='number')this.__hitBox = [0,0, this.__hitBox]
		if(this.__hitBox.length == 3 && typeof(this.__hitBox[0])=='number'){
			//Calculate Position for a circular HitBox
			this.__insideX = this.__hitBox[2]-this.__hitBox[0];
			this.__insideY = this.__hitBox[2]-this.__hitBox[1];
			this.__width =  this.__hitBox[2]*2;
			this.__height = this.__hitBox[2]*2;
		}else if(this.__hitBox.length == 4 && typeof(this.__hitBox[0])=='number'){
			//Calculate Position for a Rectangular HitBox
			this.__insideX = -hb[0];
			this.__insideY = -hb[1];
			this.__width =  hb[2];
			this.__height =  hb[3];
		} 
	},
	
	mouseHitTest: function(){
		return this.hitTestLocal(this.mouseX, this.mouseY);
	},
	
	hitTest: function(xx, yy){
		//Set variables to local space for testing
		if(typeof(xx)=='number'&& typeof(yy)=='number'){
			return this.hitTestLocal.apply(this, this.globalToLocal(xx,yy));
		}	
	},
	hitTestLocal:function(xx, yy){
		//Return if we have no hit Box or bad arguments
		if(this.__hitBox == null)return false;
		if(!typeof(xx)=='number' || !typeof(yy)=='number')return false
		
		//If we have a radial Hit Box, test the radius against the distance to the point
		if(this.__hitBox.length == 3 && typeof(this.__hitBox[0])=='number'){
			return (Math.sqrt( 	Math.pow(xx - this.__hitBox[0], 2)	+
								Math.pow(yy - this.__hitBox[1], 2)	) < this.__hitBox[2])
		}
		
		//If we use a rectangular hitBox, Check if the point is in the rectangle
		else if(this.__hitBox.length == 4 && typeof(this.__hitBox[0])=='number'){
			return Kanvas.__pointInRect(xx, yy, 
										this.__hitBox[0],
										this.__hitBox[1],
										this.__hitBox[0]+this.__hitBox[2],
										this.__hitBox[1]+this.__hitBox[3])
		}
		
	},
	
	__clearHitBox: function(){
	}
		this.__hitBoxOverride = false;
		this.__boxNeedsUpdate = true;
	},*/
	
}

var Kanvas = new (function(){

	//----- Override Html Canvas And Context
		this.tempCanvas = document.createElement('canvas');
		this.tempContext = this.tempCanvas.getContext('2d');
		
		this.CanvasClass = this.tempCanvas.constructor;
		this.ContextClass = this.tempContext.constructor;
	
		OverrideCanvas(this.CanvasClass, this.ContextClass);
		this.contextInterpret = new ContextInterpretor(this.tempContext);
	
	//-----	Class Functions
		this.ClassAssign = function(Class, properties, noWarn){
			if(!noWarn && Class.created)console.warn('Mutating prototype, as an instance has already been created');
			for(var prop in properties){
				Class.prototype[prop] = properties[prop]
			}
		}
		this.ClassExtend = function(Class, className){
		
			
			className = className||'Unnamed Class';
			
			//Create class and fill all linkers
			function KanvasClass(){
				KanvasClass.created = true;
				KanvasClass.amt = (KanvasClass.amt||0)+1;
				this.__init(''+KanvasClass.kName+' '+KanvasClass.amt,arguments);
			}
			
			// - Relink prototype/constructor
			// - Set Class Name
			KanvasClass.prototype = new Class();
			KanvasClass.prototype.constructor = KanvasClass;
			KanvasClass.prototype.Super = Class.prototype;
			KanvasClass.kName = className;
			
			
			return KanvasClass;
		}
		this.Class = function(name, blueprint){
			if(typeof(name)!='string'){
				blueprint = name;
				name = "Unnamed Class";
			}
			var newClass = Kanvas.ClassExtend(KanvasBaseClass, name);
			Kanvas.ClassAssign(newClass, blueprint);
			return newClass;
		}
	
	
	//----- Various Functions
		this.makeCanvas = function(element, dim){
		
		//Interpret element input:
			//Set Canvas as input element if it was a canvas
			if(element && element.constructor && element.constructor.name==this.CanvasClass.name) this.newCanvas = element;
			else{ 
				//Create a new canvas using the document
				this.newCanvas = document.createElement('canvas');
				//Append Canvas to HTML/DOM
				if(element){ 
					if(element.append) element.append(this.newCanvas);					 //using append
					else if(element.appendChild) element.appendChild(this.newCanvas); 	//using append child
					else console.warn('Could not use append or appendChild to add the canvas to the dom');
				}
			}
		
		//Resize the canvas
			if(dim){ //Resize canvas to input dimensions
				if(!dim[0] || !dim[1]!=null) console.error('bad canvas dimensions');
				else {
					this.newCanvas.width = dim[0];
					this.newCanvas.height = dim[1];
				}
			}//Resize canvas to DOM container's size
			else if(element && element.getBoundingClientRect()){
				this.newCanvas.width =  element.getBoundingClientRect().width;
				this.newCanvas.height =  element.getBoundingClientRect().height;
			}
		
		//Force Functions on to newCanvas, as it could have come from anywhere
			this.newCanvas.startEvents = function(ev){Kanvas.startCanvasEvents.call(this, ev)};
			this.newCanvas.stopEvents = function(rmEv){Kanvas.stopCanvasEvents.call(this, rmEv)};
			this.newCanvas.stopAllEvents = function(){Kanvas.stopAllCanvasEvents.call(this)};
		
		return this.newCanvas; //Return the newly created canvas
	}
		this.eventSuperName = function(ev_type){
			switch(ev_type.toUpperCase()){
				case 'MOUSEDOWN':
				case 'MOUSEUP':
				case 'MOUSEMOVE':
				case 'MOUSE':
					return 'mouse';
					break;
				default:
					console.error('event type', ev_type, 'not found.', 'mouseDown, mouseOver, and mouseMove are the only supported ATM');
					return false;
			}
		},
	
	//----- On Canvas Event Functions
	
		//Event Listeners
		this.canvasMouseMoveHandler = function(e){
			if(!this.stage || !this.stage.__stageMouseMove)return
			
			//figure canvas local mouse position
			if(e.clientX){
				var rect = this.getBoundingClientRect();
				if(rect) 			this.stage.__stageMouseMove(e.clientX - rect.left, e.clientY - rect.top)
				else 				this.stage.__stageMouseMove(e.clientX  - this.offsetLeft, e.clientY - this.offsetTop);
			}else if(e.offsetX) 	this.stage.__stageMouseMove(e.offsetX, e.offsetY);
			else if(e.layerX) 		this.stage.__stageMouseMove(e.layerX, e.layerY);
			else console.warn("Couldn't Determine Mouse Coordinates");
			
		}	
		this.canvasMouseDownHandler = function(e){
			if(!this.stage || !this.stage.__stageMouseDown)return;
			this.stage.__stageMouseDown();
		}	
		this.canvasMouseUpHandler = function(e){
			if(!this.stage || !this.stage.__stageMouseDown)return;
			this.stage.__stageMouseUp();
		}
		
		//Specific Event Controller functions
		this.startCanvasMouse = function(){
			if(this.__activeEvents.mouse)return;
			this.addEventListener('mousemove', Kanvas.canvasMouseMoveHandler);
			this.addEventListener('mousedown', Kanvas.canvasMouseDownHandler);
			this.addEventListener('mouseup', Kanvas.canvasMouseUpHandler);
			this.__activeEvents.mouse = true;
		},
		this.stopCanvasMouse = function(){
			if(!this.__activeEvents.mouse)return;
			this.removeEventListener('mousemove', Kanvas.canvasMouseMoveHandler);
			this.removeEventListener('mousedown', Kanvas.canvasMouseDownHandler);
			this.removeEventListener('mouseup', Kanvas.canvasMouseUpHandler);
			this.__activeEvents.mouse = false;
		},
		
		//Main Event Controllers
		this.startCanvasEvents = function(events){
			this.events = events || this.events || {
				mouse: true,
				keys: true
			};
			this.__activeEvents = {};
			if(this.events.mouse) Kanvas.startCanvasMouse.call(this);
	
		},
		this.stopCanvasEvents = function(rmEvents){
			rmEvents = rmEvents || {
				mouse: true,
				keys: true
			};	
			
			if(rmEvents.mouse) Kanvas.stopCanvasMouse.call(this);s
		},	
		this.stopAllCanvasEvents = function(){
			Kanvas.stopCanvasMouse.call(this);
		},
	
	
	//----- General Math Functionality
		this.moveTo = function(val1, val2, spd, round){
			if(Math.abs(val2 - val1) < Math.abs(0.001*val2)) {
				return val2;
			}else if(round)return Math.round(val1 + (val2 - val1)/spd);
			return val1 + (val2 - val1)/spd
		}
		this.__rotateCoords = function(xx,yy,rr){
			return [((xx * Math.cos(rr)) - (yy * Math.sin(rr))),((xx * Math.sin(rr)) + (yy * Math.cos(rr)))];
		}
		this.__pointInRect = function(xx, yy, left, up, right, down){
			if(xx > left &&  xx < right && yy > up &&  yy < down)return true;
			return false
		}
	
	
	
	
	
	//Draw a box around an Object
	// this.__boxObject = function(cc){
		// cc.save();
		// cc.translate(this.x, this.y);
		// cc.rotate(this.rotation);
		
		// var needsClosure = false;
		// if(this.__hitBox && this.__hitBox.length == 3){
			// needsClosure = true;
			// cc.save();
			// cc.scale(this.scaleX, this.scaleY);
			// cc.beginPath();
			// cc.arc(-this.__insideX+this.__hitBox[2],-this.__insideY+this.__hitBox[2],this.__hitBox[2], 0, Math.PI*2, true);
			// cc.closePath()
		// }
		// else if(this.__width){
			// needsClosure = true;
			// cc.save();
			// cc.beginPath();
			// cc.rect(-this.__insideX,-this.__insideY,this.__width,this.__height);
			// cc.closePath()
		// }
		
		// if(needsClosure){
			// cc.strokeStyle = "#FFF";
			// cc.stroke();
			// cc.lineWidth = 1.5 / ((this.__global.scaleX+.__global.scaleY)/2);
			// cc.strokeStyle = "#000";
			// cc.setLineDash([3,3])
			// cc.stroke();
			// cc.restore();
		// }
		
		// cc.scale(1/this.__global.scaleX, 1/this.__global.scaleY);
		// cc.fillStyle = "#000";
		// cc.fillRect(-1.5,-4,3,8);
		// cc.fillRect(-4,-1.5,8,3);
		// cc.fillStyle = "#fff";
		// cc.fillRect(-0.5,-3,1,6);
		// cc.fillRect(-3,-0.5,6,1);
		
		// cc.restore();
	
	// }
})

	
//-----Default classes
Kanvas.StageClass = Kanvas.Class('Kanvas Stage Class', {
	init:function(){
		// - Main Variables
		this.color = null
		this.showMouse = false;
	},
	
	
	predraw:function(context){
	
		if((typeof this.color) == 'string'){
			context.fillStyle = this.color;
			context.fillRect(0,0,this.width,this.height);
		}else{
			context.clearRect(0,0,this.width, this.height);
			if((typeof this.color) == 'function'){
				this.color.call(this,context);
			}
		}
	},
	
	draw:function(context){
		if(this.showMouse){
			context.beginPath()
			context.moveTo(0, this.mouseY)
			context.lineTo(this.width, this.mouseY)
			context.moveTo(this.mouseX, 0)
			context.lineTo(this.mouseX, this.height)
			
			context.lineWidth = 3;
			context.strokeStyle = "red";
			context.stroke()
			
			context.lineWidth = 1;
			context.strokeStyle = "green";
			context.stroke()
		}
	}
});

// this.EmptyObject = this.Class('Container Object', {init:function(){}, draw:function(){}});
		


//--------------------------------------------
//	 Kanvas Halfway Interpretor Context Object
//--------------------------------------------
function ContextInterpretor( modelContext){
	
	this.functionMap = {	'save': 'saveHandle',
							'restore': 'restoreHandle',
							'scale': 'scaleHandle',
							'translate': 'translateHandle',
							'rotate': 'rotateHandle',
							
							'beginPath': 'beginPathHandle',
							'closePath': 'closePathHandle',
							
							'moveTo': 'moveToHandle',
							'lineTo': 'lineToHandle',
							
							'rect': 'rectHandle',
							'strokeRect': 'rectHandle',
							'fillRect': 'rectHandle',
							
							'arc': 'arcHandle',
							'fillArc': 'arcHandle',
							'strokeArc': 'arcHandle',
							'basicArc': 'arcHandle',
							
							'drawImage': 'imageHandle' }
				
	this.segmentAccuracy = 24;
	var self = this;
	
	
	
	// - Set placeholders for context functions we don't cover
	for(xx in modelContext){
		if(typeof(modelContext[xx]) == "function" && !this.functionMap[xx]){
			this[xx] = function(){};
		}
	}
	
	// - Set Up a Temporary Function/Object
	var proxyFunc = function(){
		var input = null
		if(proxyFunc.arguments.length == 0) input = [this.caller];
		else if(proxyFunc.arguments.length == 1) input = [this.caller, proxyFunc.arguments[0]];
		else{
			input = Array.apply(null, proxyFunc.arguments);
			input.splice(0,0,this.caller);
		}
		// console.log(this.caller, proxyFunc.arguments,  'called');
		self[this.name].apply(self, input); 
	};
	
	// - Apply batch of new functions to this object using function map
	for(ff in this.functionMap){
		this[ff] = proxyFunc.bind({name: this.functionMap[ff], caller: ff});
	}
	
	
	this.cartesian = new CartesianTransformation();
	
	
	this.startTrack = function(startX,startY){
		// console.log('\nstarting track');
		// - Set Vars
		this.cartesian.setFrom({x:0, y:0, rotation:0, scaleX:1, scaleY: 1});
		this.saveStack = [];
		this.paths = [];
		this.holes = [];
	}
	this.closeTrack = function(){
		
		// - Finalize
		this.closePathHandle();
		if(this.saveStack.length)console.warn(this.saveStack.length, 'saves without restores');
		this.saveStack = null;
		
		// - Return all Data
		return {
			paths: this.paths, 
			holes: this.holes, 
			bounds: this.boundsFromArrays(this.paths)
		};
	}
	
	this.boundsFromArrays = function(PointArrays){
		var bounds = [null, null, null, null];
		var xx,yy;
		for(var array in PointArrays){
			for(var point in PointArrays[array]){
				xx = PointArrays[array][point][0];
				yy = PointArrays[array][point][1];
				
				if(bounds[0] === null || xx < bounds[0]) bounds[0] = xx; 
				if(bounds[1] === null || yy < bounds[1]) bounds[1] = yy;
				if(bounds[2] === null || xx > bounds[2]) bounds[2] = xx; 
				if(bounds[3] === null || yy > bounds[3]) bounds[3] = yy;
			}
		}
		return bounds;
	}
	
	
	
	this.saveHandle = function(){
		this.saveStack.push(this.cartesian.save());
	}
	
	this.restoreHandle = function(){
		if(!this.saveStack.length)return;
		this.cartesian.setFrom(this.saveStack.pop())
	}
	
	this.rotateHandle = function(caller, r){
		this.cartesian.rotation += r;
	}
	
	this.scaleHandle = function(caller, x, y){
		this.cartesian.scaleX *= x;
		this.cartesian.scaleY *= y;
	}
	
	this.translateHandle = function(caller, x, y){
		// - Find Global Translation values under current rotation/scale
		var temp = this.cartesian.apply(x, y);
		this.cartesian.x = temp[0];
		this.cartesian.y = temp[1];
	}
	
	
	this.hasPoint = function(x,y){
		// console.log(x,y);
		// - Automatically start new Path
		if(this.path == null)this.beginPathHandle();
		
		//Convert any local transforms or 
		// console.log('has point:');
		// console.log('\t',x,y);
		// console.log(this.cartesian);
		var temp = this.cartesian.apply(x,y);
		// console.log('\t',temp[0], temp[1]);
		this.path.push(temp);
		
	}
	
	this.beginPathHandle = function(){
		this.closePathHandle();
		this.path = [];
	}
	this.closePathHandle = function(){
		if(!this.path)return false;
		this.paths.push(this.path);
		this.path = null;
	}
	
	//-- Handles Rectangle
	this.rectHandle = function(caller, x,y,w,h){
		if(caller != 'rect')this.beginPathHandle();
		this.hasPoint(x,y);
		this.hasPoint(x+w,y);
		this.hasPoint(x+w,y+h);
		this.hasPoint(x,y+h);
		if(caller != 'rect')this.closePathHandle();
	}
	
	
	this.arcHandle = function(caller, x, y, r, a1, a2, cw){
	
		// - helper vars
			var PI2 = Math.PI*2;
			var maxSegments = this.segmentAccuracy;
		
		// - Set input to range
			a1 = a1 || 0;
			a2 = a2 || 0;
			cw = cw || false;
			while(a1<0)a1 += PI2;
			while(a2<0)a2 += PI2;
			while(a1>PI2)a1 -= PI2;
			while(a2>PI2)a2 -= PI2;
		
		// - Determine relative maximum/minimum
			var bigger = Math.max(a1,a2);
			var smaller = Math.min(a1,a2);
		
		// - Distort input angles to match cw/ccw requirements
			if(cw && a2>=a1){
				bigger = a1 + PI2;
				smaller = a2;
			}else if(!cw && a1>=a2){
				bigger = a2 + PI2;
				smaller = a1;
			}
			
		// - Traverse Angles
			if(caller != 'arc')this.beginPathHandle();
			var distance = bigger - smaller;
			var segments = Math.ceil((distance/(Math.PI*2))* maxSegments)
			for(var rr = smaller; rr <= bigger+0.01; rr += distance/segments){
				this.hasPoint(x + Math.cos(rr)*r, y + Math.sin(rr)*r);
			}
			if(caller != 'arc')this.closePathHandle();
	
	}
	
	this.moveToHandle = function(caller, x, y){
		// - If there is a path close it
		this.closePathHandle();
		this.hasPoint(x,y);
	}
	
	this.lineToHandle = function(caller, x, y){
		this.hasPoint(x,y);
	}
	
	this.imageHandle = function(caller, img, x,y, w, h){
		if(!img || !img.width)return;
		
		w = w || img.width
		h = h || img.width
		
		this.hasPoint(x	 	, 	y);
		this.hasPoint(x + w ,	y + h);
		this.hasPoint(x + w , 	y);
		this.hasPoint(x		, 	y + h);
	}
	// case 'drawImage':
		// if(args[0] && args[0].width){
			// var ww = (args.length>3)?(args[3]):(args[0].width)
			// var hh = (args.length>3)?(args[4]):(args[0].height)
			// hasPoint(args[1]	 , args[2]);
			// hasPoint(args[1]+ ww , args[2] + hh);
			// hasPoint(args[1]+ ww , args[2]);
			// hasPoint(args[1]	 , args[2] + hh);
		// }
					// break;
				// default:
					// break;
	// var supportedVars = [];
	// var warning = [];
	// var commands = [];
	// var saveStack = [];
	// var tracking = false;
	
	// var TRANS, SCALE, ROT;
	// var _TRANS, _SCALE, _ROT;
	
	
	// for (var ii in supportedFunctions){
		// self[supportedFunctions[ii]] = proxyFunc.bind({name:supportedFunctions[ii]});
	// }
	// for (var ii in supportedVars){
		// self.__defineGetter__(supportedVars[ii], function(){
			// if(!tracking)return false;
			// return this[supportedVars[ii]+"X"];
		// })
		
		// self.__defineSetter__(supportedVars[ii], proxyFunc.bind({
			// name:'setVar', 
			// varName:supportedVars[ii]
		// }));
	// }
	
	
	
	// var __beginTrack = function(){
		// tracking = true;
		// clearVars();
	// }

	// this.beginTrack = function(){
		// __beginTrack();
	// }
	
	// var clearVars = function(){
		// commands = [];
		// saveStack = [];
		// xy = null;
		// mxy = null;
		// TRANS = [0, 0];
		// SCALE = [1, 1];
		// REAL = [0, 0];
		// ROT = 0;
	// }
	// this.clearVars = function(){clearVars()};
	
	// var __clearTrack = function(){
		// commandsStack = [];
	// }
	// this.clearTrack = function(){
		// __clearTrack();
	// }
	
	// var hasPoint = function(xx, yy){
		
		// var temp = Kanvas.__rotateCoords(xx,yy, ROT);
		// xx = temp[0] * SCALE[0] + REAL[0];
		// yy = temp[1] * SCALE[1] + REAL[1];
		// if(!xy){
			// xy = [	xx, yy ];
			// mxy = [ xx, yy ];
		// }
		// else{
			// xy[0] = Math.min(xy[0], xx);
			// xy[1] = Math.min(xy[1], yy);
			// mxy[0] = Math.max(mxy[0], xx);
			// mxy[1] = Math.max(mxy[1], yy);
		// }
	// }
	
	// var __closeTrack = function(){
		// tracking = false;
		// for(var ii in commands){
			// var args = commands[ii][1];
			// switch(commands[ii][0]){
				// case 'save': 
					// saveStack.push([TRANS[0],
									// TRANS[1],
									// SCALE[0],
									// SCALE[1],
									// REAL[0],
									// REAL[1],
									// ROT]);
					// break;
				// case 'restore': 
					// var temp = saveStack.pop();
					// TRANS = [temp[0],temp[1]];
					// SCALE = [temp[2],temp[3]];
					// REAL = [temp[4],temp[5]]
					// ROT = temp[6];
					// break;
				// case 'scale':
					// SCALE[0] *= args[0];
					// SCALE[1] *= args[1];
					// break;
				// case 'rotate':
					// ROT += args[0];
					// _ROT += args[0];
					// break;
				// case 'translate':
					// TRANS[0] += args[0];
					// TRANS[1] += args[1];
					// REAL[0] += (args[0]*SCALE[0] * Math.cos(ROT)) - (args[1]*SCALE[1] * Math.sin(ROT));
					// REAL[1] += (args[0]*SCALE[0] * Math.sin(ROT)) + (args[1]*SCALE[1] * Math.cos(ROT));
					// break;
			
			// }
		// }
		// var toReturn = {
			// hitBox : (xy&&mxy)?([xy[0], xy[1],mxy[0]-xy[0], mxy[1]-xy[1]]):null,
			// data: commands,
		// };
		// clearVars()
		// return toReturn;
		// Evaluate Width/Height
	// }
	
	// this.closeTrack = function(){
		// return __closeTrack();
	// }
	
}

function OverrideCanvas(CanvasClass, ContextClass){
	
	if(!ContextClass.override){
		// - Alternate Colors
		ContextClass.prototype.setFillRGB = function (rr,gg,bb){
			this.fillStyle = 'rgb('+Math.round(rr||0)+','+Math.round(gg||0)+','+Math.round(bb||0)+')';
		}
		ContextClass.prototype.setStrokeRGB = function (rr,gg,bb){
			this.strokeStyle = 'rgb('+Math.round(rr||0)+','+Math.round(gg||0)+','+Math.round(bb||0)+')';
		}
		ContextClass.prototype.setFillRGBA = function (rr,gg,bb,aa){
			this.fillStyle = 'rgba('	+Math.round(rr||0)+','
										+Math.round(gg||0)+','
										+Math.round(bb||0)+','
										+(Math.round((aa*1000)||1000)/1000)+')';
		}
		ContextClass.prototype.setStrokeRGBA = function (rr,gg,bb,aa){
			this.strokeStyle = 'rgba('	+Math.round(rr||0)+','
										+Math.round(gg||0)+','
										+Math.round(bb||0)+','
										+(Math.round((aa*1000)||1000)/1000)+')';
		}
		
		// - Easier Circles
		ContextClass.prototype.fillArc = function (xx,yy,rr,start,stop,cw) {
			this.basicArc(xx,yy,rr,start,stop,cw,true);
		}
		ContextClass.prototype.strokeArc = function (xx,yy,rr,start,stop,cw) {
			this.basicArc(xx,yy,rr,start,stop,cw,false);
		}
		ContextClass.prototype.basicArc = function (xx,yy,rr,start,stop,cw,fill) {
			this.beginPath();
			this.arc(xx,yy,rr,start||0,stop||Math.PI*2,cw||true);
			this.closePath();
			if(fill)this.fill();
			else this.stroke();
		}
		
		// - Text Handling
		ContextClass.prototype.mlFunction = function(text, x, y, w, h, hAlign, vAlign, lineheight, fn) {
			text = text.replace(/[\n]/g, " \n ");
			text = text.replace(/\r/g, "");
			var words = text.split(/[ ]+/);
			if(words && words.length == 1){
				words = [text];
			}
			if(words && words.length == 0){
				words = [" "];
			}
			var sp = this.measureText(' ').width;
			var lines = [];
			var actualline = 0;
			var actualsize = 0;
			var wo;
			lines[actualline] = {};
			lines[actualline].Words = [];
			i = 0;
			while (i < words.length) {
				var word = words[i];
				if (word == "\n") {
					lines[actualline].EndParagraph = true;
					actualline++;
					actualsize = 0;
					lines[actualline] = {};
					lines[actualline].Words = [];
					i++;
				} else {
					wo = {};
					wo.l = this.measureText(word).width;
					if (actualsize === 0) {
						
						
						wo.word = word;
						lines[actualline].Words.push(wo);
						actualsize = wo.l;
						i++;
					} else {
						if (actualsize + sp + wo.l > w) {
							lines[actualline].EndParagraph = false;
							actualline++;
							actualsize = 0;
							lines[actualline] = {};
							lines[actualline].Words = [];
						} else {
							wo.word = word;
							lines[actualline].Words.push(wo);
							actualsize += sp + wo.l;
							i++;
						}
					}
				}
			}
			//if (actualsize === 0) lines[actualline].pop();
			lines[actualline].EndParagraph = true;

			var totalH = lineheight * lines.length;
			while (totalH > h) {
				lines.pop();
				totalH = lineheight * lines.length;
			}

			var yy;
			if (vAlign == "bottom") {
				yy = y + h - totalH + lineheight;
			} else if (vAlign == "center") {
				yy = y + h / 2 - totalH / 2 + lineheight;
			} else {
				yy = y + lineheight;
			}

			var oldTextAlign = this.textAlign;
			this.textAlign = "left";
			
			for (var li in lines) {
				var totallen = 0;
				var xx, usp;
				for (wo in lines[li].Words) totallen += lines[li].Words[wo].l;
				if (hAlign == "center") {
					usp = sp;
					xx = x + w / 2 - (totallen + sp * (lines[li].Words.length - 1)) / 2;
				} else if ((hAlign == "justify") && (!lines[li].EndParagraph)) {
					xx = x;
					usp = (w - totallen) / (lines[li].Words.length - 1);
				} else if (hAlign == "right") {
					xx = x + w - (totallen + sp * (lines[li].Words.length - 1));
					usp = sp;
				} else { // left
					xx = x;
					usp = sp;
				}
				for (wo in lines[li].Words) {
					if (fn == "fillText") {
						this.fillText(lines[li].Words[wo].word, Math.round(xx), Math.round(yy));
					} else if (fn == "strokeText") {
						this.strokeText(lines[li].Words[wo].word, xx, yy);
					}
					xx += lines[li].Words[wo].l + usp;
				}
				yy += lineheight;
			}
			this.textAlign = oldTextAlign;
			return (((lines.length<1000000000000000000)?(lines.length):(1)) * lineheight);
		};
		ContextClass.prototype.mlFillText = function (text, x, y, w, h, vAlign, hAlign, lineheight) {
			return this.mlFunction(text, x, y, w, h, hAlign, vAlign, lineheight, "fillText");
		};
		ContextClass.prototype.mlStrokeText = function (text, x, y, w, h, vAlign, hAlign, lineheight) {
			return this.mlFunction(text, x, y, w, h, hAlign, vAlign, lineheight, "strokeText");
		};
		ContextClass.prototype.fillTextSpacing = function (text, x, y, letterSpacing, dontRender) {
	        if (!text || typeof text !== 'string' || text.length === 0) {
	            return;
	        }
	        
	        if (typeof letterSpacing === 'undefined') {
	            letterSpacing = 0;
	        }
	        
	        // letterSpacing of 0 means normal letter-spacing
	        this.save();
			
	        var characters = String.prototype.split.call(text, '');
	        var index = 0;
	        var current;
	        var currentPosition = x;
	        var align = 1;
			var centerOffSet = 0;

				
	        if (this.textAlign === 'center') {
				this.textAlign = 'left';
				centerOffSet = 10;
				for(var ii in characters) {
					centerOffSet += (this.measureText(characters[ii]).width + letterSpacing);
				}
				this.translate(-centerOffSet/2,0);
			}else if (this.textAlign === 'right') {
				characters = characters.reverse();
				align = -1;
			}
				
			while (index < text.length) {
				current = characters[index++];
				if(!dontRender) this.fillText(current, currentPosition, y);
				currentPosition += (align * (this.measureText(current).width + letterSpacing));
			}
			
			this.restore();

			return currentPosition;
		}

		ContextClass.override = true;
	}

	if(!CanvasClass.override){
	
		// - Grabs a 2d context and remembers it, returning it from then on out without requesting new contexts
		CanvasClass.prototype.context = function(){
			this.CTX = this.CTX || this.getContext('2d');
			return this.CTX;
		},
		
		// - Kanvas
		CanvasClass.prototype.setStage = function(stage){ //Sets a Kanvas object as the 'stage' of this canvas
			//Remove the current stage
			if(this.stage){
				this.stage.canvas 		= null;
				this.stage.context 		= null;
				this.stage.isStage		= null;
				this.stage.__stage		= null;
			}
			
			this.stage = stage;
			
			if(this.stage){
				this.stage.canvas 		= this;
				this.stage.context 		= this.context();
				this.stage.isStage		= true;
				this.stage.__stage		= this.stage;
				
				// this.stage.__matchCanvasDimension(true);
				// this.stage.__tryStartMouseTrack();
			}
		}
	}
}


























