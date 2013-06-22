
//-----------------------------------------------------//
//------------------K_Logger Object--------------------//
//-----------------------------------------------------//

function K_Logger(ktrl){
	var kontrol = ktrl;
	var logging = true;
	
	var traceCanvas = null;
	var traceFunc = null;
	var trace1 = null
	
	this.functionBindings = ["log"];
	
	this.log = function(severity, array, tc){
		if(!logging && severity != 2) return false;
		if(!severity || !array) return false;

		traceCanvas = tc||"Unnamed";

		if(severity == 0)traceFunc = 'log';
		else if(severity == 1)traceFunc = 'warn';
		else if(severity == 2)traceFunc = 'error';
		else return false;
		
		trace1 = '[' 
				+ (traceCanvas) 
				+ (severity==2)?(' Error '):('')
				+ ']:';
				
		console[traceFunc](trace1, 
							(array.length>0)?(array[0]):'',
							(array.length>1)?(array[1]):'',
							(array.length>2)?(array[2]):'',
							(array.length>3)?(array[3]):'',
							(array.length>4)?(array[5]):'',
							(array.length>4)?(array[6]):'',
							(array.length>4)?(array[7]):'',
							(array.length>4)?(array[8]):' ');
		
		return true;
	}
	
	this.startLogging = function() {
		logging = true;
	}

	this.stopLogging = function() {
		logging = false;
	}
}