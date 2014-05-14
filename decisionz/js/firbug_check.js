if(params['firebug'] != undefined){
	// get some kind of XMLHttpRequest
	var xhrObj = new XMLHttpRequest();
	// open and send a synchronous request
	xhrObj.open('GET', "../lib/firebug-lite/firebug-lite.css", false);
	xhrObj.send('');
	// add the returned content to a newly created script tag
	var se = document.createElement('style');
	//se.rel = "stylesheet"
	se.type = "text/css";
	
	
	se.type = 'text/css';
	if (se.styleSheet){
	  se.styleSheet.cssText = xhrObj.responseText;
	} else {
	  se.appendChild(document.createTextNode(xhrObj.responseText));
	}
	document.getElementsByTagName('head')[0].appendChild(se);


	var xhrObj2 = new XMLHttpRequest();
	// open and send a synchronous request
	xhrObj2.open('GET', "../lib/firebug-lite/firebug-lite-1_2.js", false);
	xhrObj2.send('');
	// add the returned content to a newly created script tag
	var se2 = document.createElement('script');
	se2.type = "text/javascript";
	se2.text = xhrObj2.responseText;
	document.getElementsByTagName('head')[0].appendChild(se2);
	
	loadjscssfile("../lib/firebug-lite/firebug-lite.css", "css")
	/*loadjscssfile("js/firebug-lite-1_2.js", "js")*/
}
