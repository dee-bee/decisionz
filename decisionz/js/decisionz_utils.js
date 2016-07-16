var params = getParams(window.location.href);

function getParams(url, ignoreArray) {
	if(typeof ignoreArray === 'undefined' ){
		ignoreArray = [];
	}
	
    var regex = /([^=&?]+)=([^&#]*)/g, params = {}, parts, key, value;

    while((parts = regex.exec(url)) != null) {

        key = parts[1], value = parts[2];
		
		var ignoreElement = false;
		for(var i=0; i< ignoreArray.length; i++){
			if(key == ignoreArray[i]){
				ignoreElement = true;
			}
		}

		if(ignoreElement == true){
			continue;
		}

        var isArray = /\[\]$/.test(key);

        if(isArray) {
            params[key] = params[key] || [];
            params[key].push(value);
        }
        else {
            params[key] = value;
        }
    }

    return params;
}

function loadjscssfile(filename, filetype, callback){
 if (filetype=="js"){ //if filename is a external JavaScript file
  var fileref=document.createElement('script')
  fileref.setAttribute("type","text/javascript")
  fileref.setAttribute("src", filename)
 }
 else if (filetype=="css"){ //if filename is an external CSS file
  var fileref=document.createElement("link")
  fileref.setAttribute("rel", "stylesheet")
  fileref.setAttribute("type", "text/css")
  fileref.setAttribute("href", filename)
 }
 
 if (typeof fileref!="undefined"){
  if(callback){
  	fileref.onload = callback;
  }
  
  document.getElementsByTagName("head")[0].appendChild(fileref)
 }
}

function generateESpeakScript(){
	$(xml).find("scene").each( function(){
	    var sceneName = $(this).attr("name");
	    
	    $(this).find("page").each( function(){
	        var pageName = $(this).attr("id");
	        
	        var content = new XMLSerializer().serializeToString(
	                                        $(this).find("content")[0]
	                                    );
	
		content = content.replace(/"/g, ' quote ').
							replace(/(\n)+/g, ' ').
							replace(/[ ]+/g, " ").
							replace(/(\t)+/g, " ");        
	
	        console.log("espeak -m -v en \"" + 
	                    content + 
	                    "\" -w " + 
	                    sceneName + "-" + pageName + 
	                    ".wav -p 10 \n");
	    });
	});
}

function rgbToHex(r, g, b) {
	if (r > 255 || g > 255 || b > 255)
		throw "Invalid color component";
	return ((r << 16) | (g << 8) | b).toString(16);
}

//Check for undefined or blank
//Todo add object keys support
function uob(value){
    if(value == undefined){
        return true
    }

    if(value.length == 0){
        return true
    }

    return false
}

//Fubze = False/Undefined/Blank/Zero/Empty And much more!
function fubze(value){
    if(!value){
        /*
        will evaluate to true if value is :
            null
            undefined
            NaN
            empty string ("")
            0
            false

        */

        return true
    }

    if(value === "false")
        return true

    if(typeof value == "object"){
        if(value instanceof Array){ 
            //Check for zero length arrays
            if(value.length == 0)
                return true
        }else{
            //Must be object
            //Check for empty object
            if(Object.keys(value).length == 0)
                return true
        }
    }

    return false
}

////////////////////////////////////////////////
// Time
////////////////////////////////////////////////

function Timer(callback, delay) {
    var timerId, start, remaining = delay;

    this.pause = function() {
        window.clearTimeout(timerId);
        remaining -= new Date() - start;
    };

    this.resume = function() {
        start = new Date();
        window.clearTimeout(timerId);
        timerId = window.setTimeout(callback, remaining);
    };

    this.resume();
}

var TICKS_PER_SEC = 1000;
var TICKS_PER_MIN = 60 * TICKS_PER_SEC;
var TICKS_PER_HOUR = 60 * TICKS_PER_MIN;
var TICKS_PER_DAY = 24 * TICKS_PER_HOUR;

var iso = /^(\d{4})-(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{1,2}):(\d{1,2})$/;

function calculateTicksFromTimeString(timeString){
	var timeParts = timeString.match(iso);
	var timeTicks = (timeParts[DAY_INDEX] * TICKS_PER_DAY) + 
							(timeParts[HOUR_INDEX] * TICKS_PER_HOUR)+ 
							(timeParts[MIN_INDEX] * TICKS_PER_MIN)+ 
							(timeParts[SEC_INDEX] * TICKS_PER_SEC);
	return timeTicks;
}

function calculateTimeStringFromTicks(timeTicks){
	//Days
	var days =  Math.floor(timeTicks/TICKS_PER_DAY);
	timeTicks -= (days * TICKS_PER_DAY);

	//Hours
	var hours =  Math.floor(timeTicks/TICKS_PER_HOUR);
	timeTicks -= (hours * TICKS_PER_HOUR);	
	
	//Mins
	var mins =  Math.floor(timeTicks/TICKS_PER_MIN);
	timeTicks -= (mins * TICKS_PER_MIN);	
	
	//Seconds
	var sec =  Math.floor(timeTicks/TICKS_PER_SEC);
	timeTicks -= (sec * TICKS_PER_SEC);	

	var timeString = "0000-00-";	

	if(days < 10){
		timeString += "0" + days;
	}else{
		timeString += days;
	}
	timeString += " ";

	if(hours < 10){
		timeString += "0" + hours;
	}else{
		timeString += hours;
	}
	timeString += ":";

	if(mins < 10){
		timeString += "0" + mins;
	}else{
		timeString += mins;
	}
	timeString += ":";
	
	if(sec < 10){
		timeString += "0" + sec;
	}else{
		timeString += sec;
	}	
	
	return timeString;
}
