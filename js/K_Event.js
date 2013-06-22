//-----------------------------------------------------//
//-------------K_EventController Object----------------//
//-----------------------------------------------------//

function K_EventController(ktrl){
	var kontrol = ktrl
	var _self = this;
	
	var allEvents = [];
	this.functionBindings = ["newEvent", "getEvent", "addEventListener"];
	 
	
	this.newEvent = function(cID){
		var kEvent = new K_Event(cID, t);
		allEvents[cID] = kEvent;
		kEvent = null;
	}
	this.addEventListener = function(cID, funcName){
		if(allEvents[cID]==null)return false;
		allEvents[cID].addListener(this, funcName);
		return true;
	}
	this.getEvent = function(cID){
		return allEvents[cID];
	}
	
	
}
