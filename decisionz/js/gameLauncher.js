var params;
var configXml = "../assets/configs/sandbox.xml";

$(document).ready(function () {	
	//audioInit();
		
	window.onfocus = function() {
	    //unpauseAudio()
	};

	window.onblur = function() {
	    pauseAudio()
	};
	
	setInterval(updatePlayBtn,500);
	
	if(params["css"] != undefined){
		loadjscssfile(params["css"], "css")
	}else{
		loadjscssfile("../css/gameLauncher.css", "css")
	}

	if(params["debug"] != undefined){
		$("body").attr("debug", "true")
	}
	

	$( "#devTabs" ).tabs();
	$( "#setTabs" ).tabs();
	
	$("#xml_editor").text("<decisionz><test>Hi</test></decisionz>")
	//$("#xml_editor").append($("<decisionz><test>Hi</test></decisionz>"))
	
	loadGame();
});

function sendErrorReport(){
	var bodyJson = ""
	
	decisionVars.find("> variable[name='log'] > variable").each(function(i,v){
		bodyJson += $(v).attr("name") + "=" + $(v).attr("value") + ","
	})
	
    var link = "mailto:danielberm@yahoo.com"
             + "?subject=" + escape("Decisionz Error Report")
             + "&body=" + bodyJson

    window.location.href = link;
}

function multiplayerDispatch(){
	window.parent()
}

function multiplayerEvent(scene, page){
	currentTimeVar = $(decisionVars).find('> variable:[name="currentTime"]');	
	
	updateTimeDiv();
	
	currentSceneVar = $(xml).find("config > decisionvars > variable:[name='currentSceneName']");

	currentPageVar = $(xml).find("config  > decisionvars > variable:[name='currentPageName']");
	
	currentSceneVar.attr("value", scene);
	currentPageVar.attr("value", page);
	
	loadScene(currentSceneVar.attr("value"), currentPageVar.attr("value"))	
}

function multiplayerWaiting(){
	$("#pageContent").html("<h1>Waiting</h1>")
	//todo $("#nextPageBtn").css("display", "none");
	$("body").attr("sound", "false")
	$("#linkToWiki").css("display", "none");
}



function updatePlayBtn(){
	if(document.getElementById('narrationAudioPlayer') != null && 
			document.getElementById('narrationAudioPlayer').paused){
      $("#playPauseBtn").text(">")
  }else{
      $("#playPauseBtn").text("||")
  }  
}

function pauseAudio(){
    if(document.getElementById('musicAudioPlayer') != null &&
            document.getElementById('musicAudioPlayer').pause != null){
    	document.getElementById('musicAudioPlayer').pause()
	}
	
	if(document.getElementById('narrationAudioPlayer') != null &&
           document.getElementById('narrationAudioPlayer').pause != null){
    	document.getElementById('narrationAudioPlayer').pause()
	}
}

function unpauseAudio(){
	if(checkDecisionVarI("Sound", "true")){
		if(document.getElementById('musicAudioPlayer') != null){
			document.getElementById('musicAudioPlayer').play()	
		}
		
		if(document.getElementById('narrationAudioPlayer') != null){
			document.getElementById('narrationAudioPlayer').play()		
		}
	}
}

function loadGame(){
	if(params["configXml"] != null){
		if(params["databaseConfig"] != null){
			configXml = "config.php?config=" + params["configXml"];	
		}else{
			configXml = params["configXml"];		
		} 
	}
	
	
	if(params["forceLocalStorageReset"] != undefined || 
			localStorage.decisionz == undefined){
		localStorage.decisionz = "";
	}
	
	//If decisionz localStorage isn't empty then load from it
	//Othewise attempt to load from config file
	if(localStorage.decisionz != undefined 
			&& localStorage.decisionz.length > 0){
		parseXml(( new window.DOMParser() ).
						parseFromString(localStorage.decisionz, "text/xml"))
	}else{
		//Load config
		$.ajax({
		    type: "GET",
		    url: unescape(configXml),
		    dataType: "xml",
		    success: parseXml,
		    error: ajaxErrorFunc
		});
	}
}

var xml;
var decisionVars;
var currentTimeVar;
var currentSceneVar;
var jCurrentScene;
var currentPageVar;
var jCurrentPage;
var remotePageContentURL = "";
var currentCharacterName;
var jCurrentCharacter;

function convertXMLtoNewFormat(){
	//Convert nextPage to decision.
	$(xml).find("config > scenes > scene > page:not([type='pageForward'])").each(function(i,v){
	    if($(this).attr("nextpage") != null){
	        var nextPage = $(this).attr("nextpage")
	        
	        $(this).removeAttr("nextpage")
	       
	       	if($(this).find("> decisions").length == 0){
	       		$(this).append($("<decisions></decisions>"))
	       	}
	       	
	       	//todo - Bug in JQuery, removes attribute capitalization. So doing like this
	       	var dec = $("<decision label='Next Page'></decision>")
	       	
	        $(this).find(" > decisions").append(dec)
	        
	       	$(dec).attr('nextpage', nextPage)
	    }
	})
	
	//Convert location to decision
	$(xml).find("config > scenes > scene > page:not([type='pageForward'])").each(function(i,v){
	    if($(this).attr("location") != null){
	        var location = $(this).attr("location")
	        $(this).removeAttr("location")
	        
	        if($(this).find("> decisions").length == 0){
	       		$(this).append($("<decisions></decisions>"))
	       	}
	        
	        $(this).find("> decisions").append($("<decision label='Next Page' location='" + location + "'></decision>"))
	    }
	})
}

var jCurrentCharacterVar;

function parseXml(t_xml){
	/*$("#xml").append($(t_xml).find("config").clone())
	
	xml = $("#xml");*/
	
	xml = t_xml;
	
	convertXMLtoNewFormat()

	if(localStorage.decisionz != undefined &&
		 localStorage.decisionz.length > 0 &&
		 params["disableLocalStorage"] == undefined){
		$(xml).find("config > decisionvars").empty().html($($(localStorage.decisionz).find("> decisionvars").html()));
	}
	
	decisionVars = $(xml).find("config > decisionvars");
	
	if(params["character"] != null){
		currentCharacterName = params["character"].toLowerCase();
		jCurrentCharacter = $(xml).find("> characters > character").filter(function() {
									    return $(this).attr("name").toLowerCase() == currentCharacterName;
									});
	    
		jCurrentCharacterVar = $($(xml).find("config > decisionvars > variable:[name='currentCharacter']"));
		jCurrentCharacterVar.attr("value",currentCharacterName)
	}else{
		jCurrentCharacterVar = $($(xml).find("config > decisionvars > variable:[name='currentCharacter']"));
		currentCharacterName = jCurrentCharacterVar.attr("value").toLowerCase()
		jCurrentCharacter = $($(xml).find("> characters > character[name='" + currentCharacterName + "']")[0])
		
		jCurrentCharacter = $(xml).find("> characters > character").filter(function() {
									    return $(this).attr("name").toLowerCase() == currentCharacterName;
									});
	}
	
	
	if(checkDecisionVarI("Sound", "true")){
		$("body").attr("sound", "true")
		$("#checkbox_soundOn").attr("checked", "checked")
	}else{
		$("#checkbox_soundOn").removeAttr("checked")
	}

	if(checkDecisionVarI("disableDialog", "true")){
		$("body").attr("disableDialog", "true")
		$("#checkbox_disableDialog").attr("checked", "checked")
	}else{
		$("#checkbox_disableDialog").removeAttr("checked")
	}
	
	if(jCurrentCharacter.attr("start")!= null &&
			jDV("currentSceneName").attr("value").length == 0){
		jDV("currentSceneName").attr("value",jCurrentCharacter.attr("start"))
		
		jDV("currentPageName").attr("value","pageStart")
	}
	
	
	loadBookmarksList()
	
	//loadDecisionzLog()
	
	loadMutationObserver()
	
	writeDecisionVarsToLocalStorage()
	
	start();
	
	/*todo
	 else{
		multiplayerWaiting()
	}*/
}

function loadMutationObserver(){
	//var target = document.querySelector('#xml > config > decisionvars');
	var target = xml.documentElement.querySelector('decisionvars');
	
	// create an observer instance
	var MuteObs= window.WebKitMutationObserver 
					|| window.MutationObserver 
					|| window.MozMutationObserver 
					|| null 
	
	var lastMutatedDecisionVar	
	var observer =	new MuteObs(function(mutations) {
		
		mutations.forEach(function(mutation) {
		  
	    if($(mutation.target).attr("name") == "bookmarks" ||
	    		$(mutation.target).attr("name") == "currentBookmark" || 
	    		$(mutation.target).attr("name") == "log" ||
	    		$(mutation.target).attr("name") == "narrationLog" ||
	    		$(mutation.target).prop("tagName") == "bookmark" ||
	    		mutation.target == $(xml).find("decisionvars")[0] ){
	    	return;	
	    }
	    
	    if(lastMutatedDecisionVar != undefined 
				&& $(mutation.target).attr("name") == lastMutatedDecisionVar.attr("name")
				&& $(mutation.target).attr("value") == lastMutatedDecisionVar.attr("value")){
	    	return;
	    }
	    
	    /*switch(mutation.type){
	    	case "childList": 
	    		break;
	    	case "attributes": 
	    		break;
	    }*/
	    
	    lastMutatedDecisionVar = $(mutation.target).clone()
	    
	    $(xml).find("decisionvars > variable[name='log']").append($(mutation.target).clone())
	  });    
	});
	 
	// configuration of the observer:
	var config = { attributes: true, subtree: true, childList: true };
	 
	// pass in the target node, as well as the observer options
	observer.observe(target, config);
}

/*function loadDecisionzLog(){
	$(decisionVars).find("> variable").each(function(i,v){
		if($(v).attr("name") == "bookmarks"){
			return;
		}
		
		appendToDecisionzLog(v)
	})
	
}

function appendToDecisionzLog(decisionVar){
	$("#decisionzLog").append($("<p>").append( 
			$(document.createTextNode("<variable name='" + $(decisionVar).attr("name") 
									+ "' value='" + $(decisionVar).attr("value") + "'>\n"))))
}*/

function loadBookmarksList(){
	//Loop through bookmarks
	var jBookmarks = jDV("bookmarks")
	$(bookmarkPanel).empty().append(recursiveGenerateBookmarkItem(jBookmarks))
}

function recursiveGenerateBookmarkItem(jBookmarkParent){
	var output = ""
	
	$(jBookmarkParent).find("> bookmark").each(function(i,v){
		//take the bookmark and write 
		output +=   "<div class='bookmarkItem' id='" + $(v).attr("name") + "'>" + 
						"<div class='bookmarkLabel' onclick='bookmarkClicked(\"" + 
									$(v).attr("name") + "\")'>" + $(v).attr("label") + "</div>" + 
						recursiveGenerateBookmarkItem($(v))	+
					"</div>"				
	})
	
	return output;
}

function bookmarkClicked(bk_id){
	var bookmarks = $(xml).find("config > decisionvars > variable[name='bookmarks']").clone()
	var newDVs = $(bookmarks).find("bookmark[name='" + bk_id + "'] > dvdata").clone().children()
	
	if(newDVs == undefined || newDVs.length == 0){
		alert("newDVs undefined")
	}
	
	$(xml).find("config > decisionvars").empty().append(bookmarks).append(newDVs);
	
	$(xml).find("config > decisionvars > variable[name='currentBookmark']").attr("value", bk_id)
	
	start();
}

function showDialogOnChange(){
	if($("#checkbox_disableDialog").attr("checked") == "checked"){
		//Disable dialog
		$("body").attr("disableDialog", "true")
		setDV('disableDialog', "true")
	}else{
		//Enabling dialog
		$("body").attr("disableDialog", "false")
		setDV('disableDialog', "false")
	}
	
	writeDecisionVarsToLocalStorage()
}

function soundOnChange(){
	if($("#checkbox_soundOn").attr("checked") == "checked"){
		//Enabling sound
		//todo - add support for loading the audio if it isn't loaded yet
		
		if($("#musicAudioPlayer")[0] != null &&
				$("#narrationAudioPlayer")[0]){
			$("#musicAudioPlayer")[0].play()
			$("#narrationAudioPlayer")[0].play()
		}
		
		$("body").attr("sound", "true")	
		$(xml).find("decisionvars > variable[name='Sound']").attr("value", "true")
	}else{
		//Disable sound
		if($("#musicAudioPlayer")[0] != null &&
				$("#narrationAudioPlayer")[0]){
			$("#musicAudioPlayer")[0].pause()
			$("#narrationAudioPlayer")[0].pause()
		}
		
		$("body").attr("sound", "false")	
		$(xml).find("decisionvars > variable[name='Sound']").attr("value", "false")
	}
	
	writeDecisionVarsToLocalStorage()
}

function getBookmark(bk_name){
	return $(xml).find("config > decisionvars > variable[name='bookmarks'] " +
											" bookmark[name='" + bk_name + "'] ")
}

function setBookmarkOkClicked(){
	 setBookmark($("#bookmarkName").attr("value"))
}

function setBookmark(label){
	//Generate bookmark id
	var jBookmarks = $($(xml).find("config > decisionvars > variable[name='bookmarks']"))
	var bookmarkList = jBookmarks.find("bookmark")
	var bookmarkName = "bkm_" + (bookmarkList.length + 1);
		
	if(label == undefined){
		bookmarkLabel = "Bookmark " + (bookmarkList.length + 1);
	}else{
		bookmarkLabel = label
	}
	
	//Grab all variables except the bookmarks variable 
	var varOutput = ""
	$(decisionVars).find("> variable:not([name='bookmarks'])").each(function(i,v){
	    varOutput += new XMLSerializer().serializeToString(v)
	})
	
	// Is there a parent bookmark?
	var parentBookmark = jBookmarks
	if(jDV("currentBookmark").attr("value") != ""){
		//Parent is a bookmark so grab it
		parentBookmark = getBookmark(jDV("currentBookmark").attr("value"))
		
	}

	//Set bookmark
	parentBookmark.append($("<bookmark name='" + bookmarkName + "' label='" + bookmarkLabel +
																		"' ><dvdata>" + 
																			varOutput + 
																		"</dvdata></bookmark>"))
	
	//Set currentBookmark dv
	jDV("currentBookmark").attr("value",bookmarkName)
	
	//Show status text
	$("#statusTxt").fadeIn()
	$("#statusTxt").text("Bookmark Set: " + bookmarkLabel)
	setTimeout(hideStatusText, 3000)
	
	loadBookmarksList()
	
	setState('main')
	
	writeDecisionVarsToLocalStorage()
}

function hideStatusText(){
	$("#statusTxt").fadeOut()
}

function jDV(name){
	return $($(decisionVars).find("> variable:[name='" + name + "']"))
}

function updateTimeDiv(){
	var timeParts = /([0-9]{4})-([0-9]{2})-([0-9]{2}) ([0-9]{2}):([0-9]{2}):([0-9]{2})/.
										exec($(currentTimeVar).attr("value"))
	var hours = parseInt(timeParts[4])
	var isPM = false
	
	if(hours > 12){
		isPM = true
		hours = hours - 12
	}
	
	var timeStr = "Day " + (parseInt(timeParts[3]) + 1) + " &nbsp; " +
						hours + ":" + timeParts[5];
						
	if(isPM){
		timeStr += " PM"	
	} else{
		timeStr += " AM"
	}
	
	$("#currentTime").html(timeStr);
	
}

function start(){ 
	setState("main")
	
	currentTimeVar = $(decisionVars).find('> variable:[name="currentTime"]');
	
	updateTimeDiv();
	
	currentSceneVar = $(xml).find("config > decisionvars > variable:[name='currentSceneName']");

	currentPageVar = $(xml).find("config > decisionvars > variable:[name='currentPageName']");
	
	var jRemoteUrl = $(decisionVars).find('> variable:[name="remotePageContentURL"]')
	if(jRemoteUrl != undefined){
		remotePageContentURL = jRemoteUrl.attr("value");
	}
	
	loadScene(currentSceneVar.attr("value"), currentPageVar.attr("value"))
}

function loadMusic(name){
	parts = /(.+)([.][\w]+$)/.exec(name)
	$("#musicPlayerDiv").empty().append($('<audio id="musicAudioPlayer" width="0" height="0">' + 
												'<source src="../assets/music/' +
												parts[1] + '.ogg"' +
            									'type="audio/ogg"></source>' + 
            									'<source src="../assets/music/' +
												parts[1] + '.mp3"' +
            									'type="audio/mp3"></source>' + 
            								'</audio>'));
    
    
	if(checkDecisionVarI("Sound", "true")){
	    document.getElementById('musicAudioPlayer').play();	
	    document.getElementById('musicAudioPlayer').volume = .25;
   	}
}

function ajaxErrorFunc(jqXHR, textStatus, errorThrown){
	alert("Error- Can't load config xml.");
}


function loadLocation(name){
	//loop through all scene condtions until you find a match or use the default
	matchFound = false;
	
    var locationTag = $(xml).find("config > locations > location:[name='" + name + "']");
    
    if(locationTag.length == 0){
    	loadScene(name);
    }else{
	    $(locationTag).find("> scenecondition").each(function(){
	    	if(checkConditions(this)){
	    		//Condition passes. Now load appropriate page/scene
	    		if($(this).attr("setScene") != undefined && 
	    					$(this).attr("setScene").length > 0){
	    			loadScene($(this).attr("setScene"));
	    		}
	    		
	    		matchFound = true;
	    		
	    		return false;
	    	}
	    });
	    
	    if(matchFound){
	    	return;
	    }
	    
	    //None of the sceneConditions pass so load the default
	    if($(locationTag).attr("location") != undefined  && 
	    				$(locationTag).attr("location").length > 0){
			loadScene($(locationTag).attr("location"));
		}else if($(xml).find("config > scenes > scene:[name='" + 
						$(locationTag).attr("name") + 
						"']") != undefined ){
			loadScene($(locationTag).attr("name"));
		}else{
			alert("No location default set, and no sceneCondtions pass");
		}
	}

}

function loadScene(name, pageName){	
	currentSceneVar.attr("value",name);
	
	jCurrentScene = $(xml).find("config > scenes > scene:[name='" + name + "']");
	
	if(checkDecisionVarI("music", "true") && 
		jCurrentScene.attr("music") != undefined){
		loadMusic(jCurrentScene.attr("music"));
	}
	
	if(pageName != undefined){
		//Loading a bookmark
		loadPage(pageName);		
	}else{
		loadDecisionVars(jCurrentScene);
		loadPage("pageStart");
	}
}

function loadDecisionVars(container){	
	$(container).find("> decisionvar").each(function(){
		var dv = $(decisionVars).find('> variable:[name="' + $(this).attr("name") +  '"]');
		if(dv.length > 0){
			dv.attr("value", $(this).attr("value"));
		}else{
			//Need to add a new dv
			$(decisionVars).append($("<variable name='" + $(this).attr("name") + "' " + 
						" value='" + $(this).attr("value") + "'/>"));
		}
	});
}

var pass = "new XMLSerializer().serializeToString($(xml).clone())"

function writeDecisionVarsToLocalStorage(){
	//alert("writeDecisionVarsToLocalStorage start")
	if(params["disableLocalStorage"] == undefined){
		//alert("writeDecisionVarsToLocalStorage clone")
		
		//Doesn't seem to work on IPad
		//var xmlClone = $(xml).clone()
		
		//Don't save the local content if we're loading remotely
		if(remotePageContentURL.length > 0){
			//$(xmlClone).find("config > scenes > scene > page > content").empty()
			$(xml).find("config > scenes > scene > page > content").empty()
		}
		
		//var config_xml_string = new XMLSerializer().serializeToString(xmlClone)
		var config_xml_string = new XMLSerializer().serializeToString(xml)
		
		
		//alert("writeDecisionVarsToLocalStorage string = " + config_xml_string)
		
		localStorage.decisionz = config_xml_string
		
		//$("#xml_editor").val(config_xml_string)
		//$("#xml_editor").val("<decisionz><test>HI</test></decisonz>")
		
		if(config_xml_string.length != localStorage.decisionz.length){
			alert("LocalStorage was not completeley stored")
		}
	    
	    $("#localStorageLength").text("Local Storage Length Is: " + localStorage.decisionz.length)
	}
	
	validateDecisionVars()

	//alert("writeDecisionVarsToLocalStorage end")
}

function validateDecisionVars(){
	//This function just checks for error situations
	var variableNameObj = {}
	var variableNameDuplicatesObj = {}
	
	//todo -handle for variables without a value such as bookmarks
	
	decisionVars.find("> variable").each(function(i,v){
		var varName = $(v).attr("name")
		
		if(varName == undefined){
			return
		}
		
		if(variableNameObj[varName] == undefined){
			variableNameObj[varName] = 1
		}else{
			//Duplicate found
			if(variableNameDuplicatesObj[varName] == undefined){
				variableNameDuplicatesObj[varName] = 1
			}else{
				variableNameDuplicatesObj[varName]++
			}
		}
	})
	
	
	if(Object.keys(variableNameDuplicatesObj).length > 0){
		var output = ""
		
		$.each(Object.keys(variableNameDuplicatesObj), function(i,v){
			output += "\n" + v + ":" +  variableNameDuplicatesObj[v] + ";"
		})
		
		alert("Duplicate decisionVars found: " + output)
	}
	
	if(decisionVars.find("> variable[name='log'] > variable[name='currentBookmark']").length > 0){
		alert("CurrentBookmark found in log")
	}
}

/* todo
function nextPageAvailable(){
	//todo remove this function
	return false;
	
	if(jCurrentPage.attr("nextPage") != undefined ||
			jCurrentPage.attr("location") != undefined){
		return true;
	}
	
	return false;
}*/

var clickLock = false
function decisionClicked(index){
	if(clickLock){
		return
	}else{
		clickLock = true
	}
	
	var decision = jCurrentPage.find("> decisions > decision")[index];
	
	//append doesn't seem to work on IOS with xml
	//jDV("narrationLog").append("<p> You chose: " + $(decision).attr("label") +  "</p>\n")
	
	jDV("narrationLog").html(jDV("narrationLog").html() + "\n<p class='youChose'> You chose: " + $(decision).attr("label") +  "</p>\n")
	
	$("#narrationLog").empty().append($(jDV("narrationLog").html()))
	
	
	if($(decision).attr("nextpage") != undefined){
		loadPage($(decision).attr("nextpage"));
	}else if($(decision).attr("location")){
 		loadLocation($(decision).attr("location"));	
	}	
	
	clickLock = false
}


function remotePageContent(text){
	//jCurrentPage.find("content").html($(html).find("#mw-content-text").html());
	
	//alert(html);
	jCurrentPage.find("> content").empty().append($(text.replace(/[\[][\[].*[\]][\]]/g,"")));
	generatePage();
}

var sceneReturnObj


function generatePage(){
	//Load local content
	var output = "";
	
	if(jCurrentPage.attr("dontLoadContent") == undefined){
		jCurrentPage.find("> content *").each(function(){
		    if(!$(this).hasClass("todo")){
		    	output += new XMLSerializer().serializeToString(this);
		    }
		});
	}

	//Load decisions
	var tally = 0;
	jCurrentPage.find("> decisions > decision").each(function(){
        //Check if this decision should be displayed
        if(checkConditions(this)){
        	output = output + "<div class='decisionBtn' onclick='decisionClicked(" + tally + 
        								")' >" + $(this).attr("label") + "</div>";
		}
		tally++;
	});
	
	//If there's some code here then it may be in a CDATA
	output = output.replace("<![CDATA[", "").replace("]]>", "");
	
	//output page
	$("body #pageContent").html(output);
	
	if(jDV("narrationLog").length == 0 ||
		jDV("narrationLog").html().length == 0){
		if(params["debug"] != undefined){
			alert("narrationLog is empty")
		}
		
		setDV("narrationLog", "")
	}
	
	
	//Doesn't seem to work on IOS
	//jDV("narrationLog").append(output)
	if(jDV("narrationLog").children().last().hasClass("youChose")){
		jDV("narrationLog").html(jDV("narrationLog").html() + output)

	}

	jDV("narrationLog").find("div.decisionBtn").removeAttr("onclick")

	$("#narrationLog").empty().append($(jDV("narrationLog").html()))

	if(jCurrentPage.find("> script")[0] != undefined){
		eval($(jCurrentPage.find("> script")[0]).text())
	}

	//Launch a load function if present
	if(sceneReturnObj != undefined && 
		sceneReturnObj.initPageScript != undefined) {
	    sceneReturnObj.initPageScript()
	}
	

	writeDecisionVarsToLocalStorage();

	//if audio is present and the narrative is on load the audio
	if(jCurrentPage.attr("dontLoadContent") == undefined){
		if(checkDecisionVarI("narration", "true")){
			//$("#narrationAudioPlayer")[0].pause()
			$("#narrationPlayerDiv").empty().append($('<audio id="narrationAudioPlayer" width="0" height="0"' +
														//'oncanplay="audioCanPlay()">' + 
														'><source src="assets/narration/wav/' +
		            											jCurrentScene.attr("name") + '-' + 
		            											jCurrentPage.attr("id") + '.wav"' +
		            											'type="audio/wav"></source>' + 
		            									'</audio>'));
	   	
	   		
			if(checkDecisionVarI("Sound", "true")){
		   		$("#narrationAudioPlayer")[0].play()
		   	}
	   	}
	   	
	   	
		if(checkDecisionVarI("music", "true") && 
			jCurrentPage.attr("music") != undefined){
			loadMusic(jCurrentPage.attr("music"));
		}
   	}
   	/* todo
   	if(nextPageAvailable()){
		$("#nextPageBtn").css("display", "inherit");
	}else{
		$("#nextPageBtn").css("display", "none");
	}*/
}

function audioCanPlay(){
	if(checkDecisionVarI("Sound", "true")){
		document.getElementById('narrationAudioPlayer').play();	
		alert("hi audio2");
	}
}

function sendMail() {
    var link = "mailto:me@example.com"
             + "?cc=myCCaddress@example.com"
             + "&subject=" + escape("This is my subject")
             + "&body=" + escape(document.getElementById('myText').value)
    ;

    window.location.href = link;
}

//Case insensitive
function checkDecisionVarI(name, value){
	var dv = $(decisionVars).find('> variable:[name="' + name + '"]');
	
	if(dv != undefined && dv.attr("value") != undefined &&
			dv.attr("value").toLowerCase() == value){
		return true;
	}else{
		return false;
	}
}

function capitaliseFirstLetter(string)
{
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function clearLocalStorage(){
	if(params["disableLocalStorage"] == undefined){
		localStorage.decisionz = "";
		//loadGame();
	}
}

/* todo
function loadNextPage(){
	//Multiplayer conditions trump so if the characters are present 
	//  then the condition is tested
	var disableNextPage = false;
	jCurrentPage.find("multiplayerCondition").each(function(){
    	if($(xml).find("characters > character[name='" + 
    	           $(this).attr("character") + "'][active='true']").length > 0){
    	    //We have an active character for this multiplayerCondition
    	    // so test the conditions        
    	    if( checkConditions(this)){
    	        //Conditions pass so dispatch the event
    	        disableNextPage = true; //only if a multiplayer dispatch is sent
    	        window.parent.frames['iframe' + $(this).attr("character")].
    	                multiplayerEvent($(this).attr("scene"), $(this).attr("page"))
    	    
    	        if($(this).attr("type") == "waitForResponse"){
                    multiplayerWaiting() 
                }
    	    }
    	}
    });
	
	todo
	if(!disableNextPage){ 
	    if(jCurrentPage.attr("nextPage") != undefined){
    		loadPage(jCurrentPage.attr("nextPage"));
    	}else if(jCurrentPage.attr("location") != undefined){
    		loadLocation(jCurrentPage.attr("location"));	
    	}
	}
}*/

var jCurrentScene;

function addDurationToCurrentTime(duration){
		var durationTicks = 
			calculateTicksFromTimeString(duration) 
		var currentTimeTicks = 
			calculateTicksFromTimeString($(currentTimeVar).attr("value"));
		
		currentTimeTicks += durationTicks;
		
		$(currentTimeVar).attr("value",
			calculateTimeStringFromTicks(currentTimeTicks));
}

function loadPage(pageId){
	sceneReturnObj = undefined
	
	currentPageVar.attr("value",pageId);
	
	jCurrentPage = jCurrentScene.find("> page:[id='" + pageId + "']");

	loadDecisionVars(jCurrentPage);

	//If we have a checkpoint make sure it hasn't already been set in this individual path
	if(jCurrentPage.attr("checkpoint") != undefined &&
		getBookmark(jDV("currentBookmark").attr("value")).attr("label") != jCurrentPage.attr("checkpoint") &&
		getBookmark(jDV("currentBookmark").attr("value")).
				find("> bookmark[label='" + jCurrentPage.attr("checkpoint") + "']").length == 0){
		setBookmark(jCurrentPage.attr("checkpoint"))
	}

	if(jCurrentPage.attr("duration") != undefined){
		addDurationToCurrentTime(jCurrentPage.attr("duration"))
	}

	//A decisionVar might have set this, or a duration might have incrimented this
	updateTimeDiv()
	
	if(handlePageForward()){
		//A pageCondition of pageForward has been loaded so so nothing
	}else{
		if(remotePageContentURL != undefined &&
				remotePageContentURL.length > 0 &&
				jCurrentPage.attr("dontLoadContent") == undefined){
			var remotePageUrl = remotePageContentURL + "?title=" + 
			    				jCurrentScene.attr("name") +  ":" + 
			    				jCurrentPage.attr("id");
			    				
			$("#linkToWiki").attr("href", remotePageUrl);
			
			//Load remote content
			$.ajax({
			    type: "GET",
			    async: false,
			    url: remotePageUrl + "&action=raw",
			    dataType: "text",
			    success: remotePageContent,
			    error: ajaxErrorFunc
			});
		}else{
			generatePage();
		}
	}
	
	window.scrollTo(0, 0)
}

var DAY_INDEX = 3;
var HOUR_INDEX = 4;
var MIN_INDEX = 5;
var SEC_INDEX = 6;


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

function generateExpressionForCondition(condition){
	var output = "(";
	
	var currentTimeString = $(decisionVars).find('> variable:[name="currentTime"]').attr('value');
	var currentTimeTicks = calculateTicksFromTimeString(currentTimeString);
		
	//If this is blank than we probably have a time check
	if($(condition).attr("name") != undefined){
		if($(condition).attr("value") == undefined){
			//This is a check to see if the variable is present
			output = output + "$(decisionVars).find('> variable:[name=\"" + $(condition).attr("name") + "\"]').length == 0"
		}else{
			output = output + "$(decisionVars).find('> variable:[name=\"" + $(condition).attr("name") + "\"]').length != 0" + 
						" && $(decisionVars).find('> variable:[name=\"" + 
							$(condition).attr("name") + "\"]').attr('value') == '" + $(condition).attr("value") + "'";
		}
	}
	
	if($(condition).attr("startTime") != undefined){
		var conditionStartTime = $(condition).attr("startTime");
		var startTimeTicks = calculateTicksFromTimeString(conditionStartTime);
		
		if(output.length > 1){
			output = output + " && ";
		}
		
		output = output + startTimeTicks + " < " + currentTimeTicks + " ";
	}
	
	if($(condition).attr("endTime") != undefined){
		var conditionEndTime = $(condition).attr("endTime");
		var endTimeTicks = calculateTicksFromTimeString(conditionEndTime);
		
		if(output.length > 1){
			output = output + " && ";
		}
		
		output = output + endTimeTicks + " >= " + currentTimeTicks + " ";
	}
	
	
	return output + ")";
}

function recursiveConstructConditionExpression(expression, conditionsContainer){
	var output = "";
	var firstTime = true;
	$(conditionsContainer).find("> condition").each(function(){
		var exp = generateExpressionForCondition(this);
		
		//wrap it up
		exp = "(" + exp + ")";
		
		exp = recursiveConstructConditionExpression(exp, this);
		
		if(firstTime){
			output = exp;
		}else{
			output = output + " || " +  exp ; 
		}
		
		firstTime = false;
	});
	
	if(output.length == 0){
		return expression;
	}
	
	if(expression.length > 0){
		return "(" + expression + " && " + output + ")";	
	}else{
		return "(" + output + ")";	
	}
}

function checkConditions(conditionsContainer){	
	var expression = recursiveConstructConditionExpression("", conditionsContainer);
	
	console.log(expression);
	
	if(expression == ""){
		return true;
	}
	
	var output = eval(expression);
	console.log(output);
	
	return output;
}

var matchFound = false;

function handlePageForward(){
	 //loop through page conditions
	var forceReturn = false
    jCurrentPage.find("> pagecondition").each(function(){
    	if(checkConditions(this)){
    		//Condition passes. Now load appropriate page/scene
    		if($(this).attr("location") != undefined && 
    					$(this).attr("location").length > 0){
    			loadLocation($(this).attr("location"));
    		}else if($(this).attr("nextpage") != undefined && 
    					$(this).attr("nextpage").length > 0){
    			loadPage($(this).attr("nextpage"));
    		}
    		
    		forceReturn = true
    		return false
    	}
    });
    
	if(forceReturn){
		return true
	}
	
    //No match found so load the nextpage or the location if this is a pageForward
    if(jCurrentPage.attr("type") == "pageForward"){
	    if(jCurrentPage.attr("location") != undefined  && 
	    				jCurrentPage.attr("location").length > 0){
			loadLocation(jCurrentPage.attr("location"));
		}else if(jCurrentPage.attr("nextpage") != undefined  && 
						jCurrentPage.attr("nextpage").length > 0){
			loadPage(jCurrentPage.attr("nextpage"));
		}
	    
	    return true
    }
    
    return false
}

function espeakOutput(){
	$(xml).find("scene > page > content").each(function(i){
		var xmlSerialString = new XMLSerializer().serializeToString(this)
		var oldString = xmlSerialString.replace(/\n/g, " ").
										replace(/["]/g, ' quote ').
										replace(/\t/g, ' ').
										replace(/<content>/g, '').
										replace(/<\/content>/g, ' ');
		var newString = oldString;
		
		do{
			oldString = newString;
			newString = oldString.replace(/[ ][ ]/g, " ");
		}
		while(newString.length != oldString.length)
		
		console.log('espeak -m -v en "' + 
				newString + '" -w output_' + 
				i + '.wav -p 10' + "\n"); 
	});
}

function setState(state){
	switch(state){
		case "bookmarks":
			$("body").attr("state", "bookmarks")
			break;
		case "main":
			$("body").attr("state", "main")
			break;
		case "dev_mode":
			$("body").attr("state", "dev_mode")
			break;
		case "settings":
			$("body").attr("state", "settings")
			break
		case "set_bookmark":
			$("body").attr("state", "set_bookmark")
			break;
	}
	
	window.scrollTo(0, 0)
}

//Will create the dv if it is undefined
function setDV(name, value){
	var dv = decisionVars.find("> variable[name='" + name + "']")
	
	if(dv.length == 0){
		dv = $("<variable name='" + name + "' " + " value='" + value + "'/>")
		$(decisionVars).append(dv);
	}else{
		dv.attr("value", value)	
	}
}

function playPauseBtnClicked(){
  if(document.getElementById('narrationAudioPlayer').paused){
      $("#playPauseBtn").text("||")
      unpauseAudio()
  }else{
      $("#playPauseBtn").text(">")
      pauseAudio()
  }  
}

function loadErrorReport(){
	//Reset game
	clearLocalStorage()
	
	var rootXml = "<root>"
	
	$.each($("#errorTextArea").attr("value").split(","), function(i,v){
		var arr = v.split("=")
		rootXml += "<decisionvar name='" + arr[0] + "' value='" + arr[1] + "' />" 			
	})
	
	rootXml += "</root>"
	jRootXml = $(rootXml)
	loadDecisionVars(jRootXml)
	
	setDV("currentBookmark", "")
	
	writeDecisionVarsToLocalStorage()
	loadGame()	
}

