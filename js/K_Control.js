
function KanvasControl(){
	var kontrol = this;
	var b,c = null;
	var components;
	
	this.bindComponent(new K_Logger())
	
	this.log(1, ["Kontrol Done"]);


	
	//
	
	for(cc in components.array()){
		var c = components.getValue(cc);
		if(c.postLoad)c.postLoad();
		c = null;
	}
	//
}
KanvasControl.prototype.bindComponent = function(comp){
	if(!comp || !comp.length)comp = [comp];
	for(cc in comp){
		c = comp[cc];
		if(c.functionBindings){
			for(bb in c.functionBindings){
				var b = c.functionBindings[bb];
				console.log("Applied function", b, "to the Kontroller");
				this[b] = new KanvasControlProxyFunction(c, b);
				this[b] = this[b].proxy;
			}
		}
	}
}

function KanvasControlProxyFunction(co, fn){
	var pf = this;
	this.callObject = co||this.callObject;
	this.functionName = fn||this.functionName;
	this.proxy = function(){
		if(pf.callObject && pf.functionName){
			pf.callObject[pf.functionName].apply(pf.callObject, pf.proxy.arguments)
		}
	}
}

//
var Kontrol = new KanvasControl();