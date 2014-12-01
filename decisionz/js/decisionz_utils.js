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