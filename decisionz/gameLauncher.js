var params;
var configXml = "configs/sandbox.xml";
var xml;
var decisionVars;
var jCurrentScene;
var jCurrentPage;
var remotePageContentURL = "";
var currentCharacterName;
var jCurrentCharacter;
var jCurrentCharacterVar;
var SoundMediaPath = ""
var DVS = []
var pass = "new XMLSerializer().serializeToString($(xml).clone())"
var sceneReturnObj
var jCurrentScene;

 
var disableMutationObserver = true;
//Todo- get rid of this function
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
			var name = $(mutation.target).attr("name")
			
			switch(name){
				case "bookmarks":
				case "currentBookmark":
				case "log":
				case "narrationLog":
					return
			}
					
			if($(mutation.target).prop("tagName") == "bookmark"){
				return;	
			}

			if(lastMutatedDecisionVar != undefined 
					&& name != undefined					
					&& name == lastMutatedDecisionVar.attr("name")
					&& $(mutation.target).attr("value") == lastMutatedDecisionVar.attr("value")){
				//I think this means nothing changed
				return;
			}

			/*switch(mutation.type){
				case "childList": 
					break;
				case "attributes": 
					break;
			}*/

			lastMutatedDecisionVar = $(mutation.target).clone()

			//Handle for decisionVar added
			if(mutation.target == $(xml).find("decisionvars")[0]){
				if(mutation.addedNodes.length > 0){
					$(xml).find("decisionvars > variable[name='log']").append($(mutation.addedNodes[0]).clone())
				}
			}else{
				$(xml).find("decisionvars > variable[name='log']").append($(mutation.target).clone())
			}
		});    
	});
	 
	// configuration of the observer:
	var config = { attributes: true, subtree: true, childList: true };
	 
	// pass in the target node, as well as the observer options
	observer.observe(target, config);
}

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
		loadjscssfile("css/gameLauncher.css", "css")
	}

	if(params["debug"] != undefined){
		$("body").attr("debug", "true")
	}

	if(params["configXml"] != null){
		if(params["databaseConfig"] != null){
			configXml = "config.php?config=" + params["configXml"];	
		}else{
			configXml = params["configXml"];		
		} 
	}
	
	$( "#devTabs" ).tabs();
	$( "#setTabs" ).tabs();
	
	loadGame();
});

function loadGame(){
	if(params["forceLocalStorageReset"] != undefined || 
			localStorage.decisionz == undefined){
		localStorage.decisionz = "";
	}
	
	//If decisionz localStorage isn't empty then load from it
	//Othewise attempt to load from config file
	if(localStorage.decisionz != undefined 
			&& localStorage.decisionz.length > 0){
		parseXml(localStorage.decisionz)
	}else{
		//Load config
		$.ajax({
		    type: "GET",
		    url: unescape(configXml),
		    dataType: "text",
		    success: parseXml,
		    error: ajaxErrorFunc
		});
	}
}

var xml_lastWrite

function parseXml(text_xml){
	//If the line starts with [[ then remove it
	while(text_xml.match(".*\n")[0].match("^[ ]*[\[][\[]") != undefined){
		text_xml = text_xml.substr(text_xml.match(".*\n")[0].length, text_xml.length)
	}
	
	xml = ( new window.DOMParser() ).
				parseFromString(text_xml, "text/xml")
	
	xml_lastWrite = $(xml).clone()[0]

	convertXMLtoNewFormat()

	if(localStorage.decisionz != undefined &&
		 localStorage.decisionz.length > 0 &&
		 params["disableLocalStorage"] == undefined){
		$(xml).find("config > decisionvars").empty().html($($(localStorage.decisionz).find("> decisionvars").html()));
	}
	
	decisionVars = $(xml).find("config > decisionvars");
	
	updateDVS()
	
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
	
	if(checkDecisionVarI("music", "true")){
		$("body").attr("music", "true")
		$("#checkbox_musicOn").attr("checked", "checked")
	}else{
		$("#checkbox_musicOn").removeAttr("checked")
	}
	
	if(checkDecisionVarI("narrationAudio", "true")){
		$("body").attr("narration_audio", "true")
		$("#checkbox_narrationAudioOn").attr("checked", "checked")
	}else{
		$("#checkbox_narrationAudioOn").removeAttr("checked")
	}
	
	setDV("configXml", configXml)
		
	$("#linkToConfigFile").attr("href", unescape(configXml))

	
	if(jDV("SoundMediaPath").length > 0){
		SoundMediaPath = jDV("SoundMediaPath").text()
	}
	
	if(params["SoundMediaPath"] != null){
		SoundMediaPath = params["SoundMediaPath"]
	}
	
	if(checkDecisionVarI("disableDialog", "true")){
		$("body").attr("disableDialog", "true")
		$("#checkbox_disableDialog").attr("checked", "checked")
	}else{
		$("#checkbox_disableDialog").removeAttr("checked")
	}
	
	if(jCurrentCharacter.attr("start")!= null &&
			DVS["currentSceneName"] == undefined){
		setDV("currentSceneName",jCurrentCharacter.attr("start"))
		setDV("currentPageName","pageStart")
	}
	
	
	loadBookmarksList()
	
	//loadMutationObserver()
	
	if(!checkDecisionVarI(
			"writeToLocalStorageOnlyOnSceneLoad","true")){
		writeDecisionVarsToLocalStorage()
	}
	
	updateDVS()
	
	start();
	
	/*todo
	 else{
		multiplayerWaiting()
	}*/
}

function start(){ 
	setState("main")
	
	updateTimeDiv();
	
	var jRemoteUrl = DVS["remotePageContentURL"]
	if(jRemoteUrl != undefined){
		remotePageContentURL = jRemoteUrl
	}
	
	loadScene(DVS["currentSceneName"], DVS["currentPageName"])
}

function loadLocation(name){
	//loop through all scene condtions until you find a match or use the default
	matchFound = false;
	
    var locationTag = $(xml).find("config > locations > location:[name='" + name + "']");
    
	setDV("previousLocationName", DVS["currentLocationName"])
    setDV("currentLocationName", name)

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
	setDV("previousSceneName", DVS["currentSceneName"])
	setDV("currentSceneName", name)
		
	jCurrentScene = $(xml).find("config > scenes > scene:[name='" + name + "']");
	
	//Don't load any music, page content, or templates in routeMode
	if(!routeMode){
		$("#pageContainer").html($("#pageContent_snippet").html())
		
		loadMusic(jCurrentScene.attr("music"));
		unpauseAudio()
	
		if(jCurrentScene.attr("loadClassimation")){
			loadClassimation(jCurrentScene.attr("loadClassimation"), true)
		}
	
		if(jCurrentScene.attr("loadIFrameTemplate")){
			loadIFrame(jCurrentScene.attr("loadIFrameTemplate"))
		}
	}
	
	writeDecisionVarsToLocalStorage()
	
	if(pageName != undefined){
		//Loading a bookmark
		loadPage(pageName);		
	}else{
		loadDecisionVars(jCurrentScene);
		loadPage("pageStart");
	}
}

var clickLock = false
function decisionClicked(index){
	if(clickLock){
		return
	}else{
		clickLock = true
	}
	
	var decision = jCurrentPage.find("> decisions > decision")[index];
	
	if($(decision).attr("calculate_duration") != undefined){
		//Find route duration
		addDurationToCurrentTime(
			calculateRouteDuration($(decision).attr("calculate_duration"))
		)
	}else if($(decision).attr("duration") != undefined){
		addDurationToCurrentTime($(decision).attr("duration"))
	}
	
	//todo - append doesn't seem to work on IOS with xml
	//jDV("narrationLog").append("<p> You chose: " + $(decision).attr("label") +  "</p>\n")
	
	jDV("narrationLog").html(jDV("narrationLog").html() + "\n<p class='youChose' decision_index='" + index + "'> You chose: " + $(decision).attr("label") +  "</p>\n")
	
	$("#narrationLog").empty().append($(jDV("narrationLog").html()))
	
	if($(decision).attr("onclick") != undefined){
		$("body #pageContent").html("");
		eval($(decision).attr("onclick"))
	}
	
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
	jCurrentPage.find("> decisions > decision").each(function(i,v){
        //Check if this decision should be displayed
        if(checkConditions(this)){
			var divId = ""
			if($(v).attr("id") != undefined){
				divId = "id='" + $(v).attr("id") + "'"
			}

        	output = output + "<div " + divId + " class='decisionBtn' onclick='decisionClicked(" + tally + 
        								")' >" + $(this).attr("label") + "</div>";
		}
		tally++;
	});
	
	//If there's some code here then it may be in a CDATA
	var narrationLogText = output = output.replace("<![CDATA[", "").replace("]]>", "");
	
	//Load the script tag from the page if present
	var scriptTag = jCurrentPage.find("> script")
	if(scriptTag.length > 0){
		output += "\n<script>\n" + scriptTag.html() + "\n</script>\n"
	}

	//Load the style tag from the page if present
	var styleTag = jCurrentPage.find("> style")
	if(styleTag.length > 0){
		output += "\n<style>\n" + styleTag.html() + "\n</style>\n"
	}

	//output page
	$("body #pageContent").html(output);
	
	var jNarrationLog = jDV("narrationLog")
	if(jNarrationLog.length == 0 ||
		jNarrationLog.html().length == 0){
		if(params["debug"] != undefined){
			//todo- put this as a label
			//alert("narrationLog is empty")
		}
		
		setDV("narrationLog", "")
	}
	
	
	//Doesn't seem to work on IOS
	//jDV("narrationLog").append(output)
	if(jNarrationLog.children().last().hasClass("youChose")){
		//Todo - Remove script tags automatically. And remove the script tag fix
		//output = output.replaceAll("<script*>*</script>", "");
		jNarrationLog.html(jNarrationLog.html() + narrationLogText)

	}

	jNarrationLog.find("div.decisionBtn").removeAttr("onclick")

	$("#narrationLog").empty().append($(jNarrationLog.html()))

	if(jCurrentPage.find("> script")[0] != undefined &&
			typeof(loadJSAttrSuccess) == "function"){
		loadJSAttrSuccess($(jCurrentPage.find("> script")[0]).text())
	}else if(jCurrentPage.attr('loadJS') != undefined){
		var remotePageUrl = ""
		
		if(jCurrentPage.attr('loadJS') == ""){
			//Generate the page name automatically
			remotePageUrl = remotePageContentURL + "?title=JS_" + 
			    				jCurrentScene.attr("name") +  ":" + 
			    				jCurrentPage.attr("id");

		}else{
			//Generate the page name automatically
			remotePageUrl = remotePageContentURL + "?title=" + 
								jCurrentPage.attr('loadJS')
		}
		
		$.ajax({
			type: "GET",
			async: false,
			url: remotePageUrl + "&action=raw",
			dataType: "text",
			success: generatePage_part2,
			error: ajaxPageErrorFunc
		});
	}else{
		//todo not sure if this is the right place for this
		if(!checkDecisionVarI(
					"writeToLocalStorageOnlyOnSceneLoad","true") &&
				jCurrentScene.attr(
					"disableLocalStorageWritesOnPageLoad") == undefined){
			writeDecisionVarsToLocalStorage()
		}

		if(jCurrentPage.attr("classimation") != undefined){
			
			if(jCurrentPage.attr("classimationNextPage") != undefined){
				playAnimation(jCurrentPage.attr("classimation")
					, function(){loadPage(jCurrentPage.attr("classimationNextPage"))})
			}else{
				playAnimation(jCurrentPage.attr("classimation"))
			}
		}
	}

}

function generatePage_part2(text){
	eval(text)
	
	//Launch a load function if present
	if(sceneReturnObj != undefined && 
		sceneReturnObj.initPageScript != undefined) {
	    sceneReturnObj.initPageScript()
	}

	if(!checkDecisionVarI(
				"writeToLocalStorageOnlyOnSceneLoad","true") &&
			jCurrentScene.attr(
				"disableLocalStorageWritesOnPageLoad") == undefined){
		writeDecisionVarsToLocalStorage()
	}


	if(DVS["dontLoadContent"] == undefined 
			&& jCurrentPage.attr("dontLoadContent") == undefined){ 
		//todo We need to define further what dontLoadContent is
		loadNarrationAudio(jCurrentScene.attr("name"), jCurrentPage.attr("id"))
		loadMusic(jCurrentPage.attr("music"));
		unpauseAudio()
	}
	
	
	if(jCurrentPage.attr("onload") != undefined){
		eval(jCurrentPage.attr("onload"))
	}
}

function loadPage(pageId){
	if(pageId == undefined)
		return

	setDV("previousPageName", DVS["currentPageName"])
    setDV("currentPageName", pageId)

	//todo wipes out animation if playing
	///$("#pageContainer").html($("#pageContent_snippet").html())
	
	sceneReturnObj = undefined
	
	jCurrentPage = jCurrentScene.find("> page:[id='" + pageId + "']");

	loadDecisionVars(jCurrentPage);

	if(!routeMode){ //No checkpoints or durations set in routeMode
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
	}
	
	if(handlePageForward()){
		//A pageCondition of pageForward has been loaded so do nothing
	}else{
		if(!routeMode){ 
					//Do not construct the page in routeMode
					//This means there is no narrationLog, no 
					// external load of js, no writeDecisionVarsToLocalStorage
					// etc.
			
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
					error: ajaxPageErrorFunc
				});
			}else{
				generatePage();
			}
		}
	}
	
	window.scrollTo(0, 0)
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
			$("#bookmarkName").attr("value", "")
			$("body").attr("state", "set_bookmark")
			break;
	}
	
	window.scrollTo(0, 0)
}

function loadGameState(){
	//Reset game
	clearLocalStorage()
	
	var rootXml = "<root>"
	
	var gameStateText = $("#errorTextArea").attr("value")
	
	while(gameStateText.match("^[ ]*[\[][\[].*\n") != undefined){
		gameStateText = gameStateText.substr(gameStateText.match(".*\n")[0].length, gameStateText.length)
	}
	
	$.each(gameStateText.split(","), function(i,v){
		var arr = v.split("=")
		rootXml += "<decisionvar name='" + arr[0] + "' value='" + arr[1] + "' />" 			
	})
	
	rootXml += "</root>"
	jRootXml = $(rootXml)
	loadDecisionVars(jRootXml)
	
	setDV("currentBookmark", "")
	
	//todo - can i remove this
	//writeDecisionVarsToLocalStorage()
	loadGame()	
}

////////////////////////////////////////////////
// Route
////////////////////////////////////////////////
var routeMode = false
function runRoute(endLocationName, endPageId){
	//Find a route with the startScene and endScene
	routeMode = true

	var startLocationName = jDV("currentLocationName").attr("value")
	var startPageId = jCurrentPage.attr("id")

	var route = $(xml).find("config > routes > route[start='" 
					+ startLocationName + "']"
					+ "[end='" + endLocationName + "']")
	
	var routeBackwards = false
	if(route.length == 0){
		//Try backwards
		route = $(xml).find("config > routes > route[start='" 
					+ endLocationName + "']"
					+ "[end='" + startLocationName + "']")
		
		if(route.length != 0){
			routeBackwards = true
		}
	}

	if(route.length != 0){
		//Parse the route to determing the connections
		var connectionsArr = $(route).attr("connections").split(",")
		
		if(routeBackwards){
			connectionsArr = connectionsArr.reverse()
		}

		//Loop through connections loading the pages in the background
		$.each(connectionsArr, function(i,v){
			var jConnection = $($(xml)
						.find("config > connections > connection[id='" + v + "']"))
			
			if(connectionsArr.length - 1 == i){
				routeMode = false
			}

			if(routeBackwards){
				loadLocation(jConnection.attr("a"))
			}else{
				loadLocation(jConnection.attr("b"))
			}
			
			//add duration
			if(jConnection.attr("duration") != undefined){
				addDurationToCurrentTime(jConnection.attr("duration"))
				updateTimeDiv()
			}

			//If a scene + page isn't expected stop route .
			var currentSceneName = DVS["currentSceneName"]
			var currentPageId = DVS["currentPageName"]

			var destination = "b"
			var source = "a"
			if(routeBackwards){
				destination = "a"
				source = "b"
			}

			if(jConnection.attr(destination + "_expect_scene") != undefined
				&& jConnection.attr(destination + "_expect_scene") 
						!= currentSceneName){
				//We're not at the needed scene to continue
				//Todo- Program a qa test config for this

				if(params["debug"]){
					alert("Route failed:currentSceneName=" + currentSceneName
							+ ";expectedSceneName=" 
								+ jConnection.attr(destination + "_expect_scene")) 
				}

				return false 
			}

			if(jConnection.attr(destination + "_expect_page") == undefined
					&& currentPageId != "pageStart"){
				//We're not at the needed page to continue
				//Todo- Program a qa test config for this

				if(params["debug"]){
					alert("Route failed:currentPageId=" + currentPageId
							+ ";expectedPageName=" 
								+ jConnection.attr(destination + "_expect_page")) 
				}

				return false 
			}

			if(jConnection.attr(destination + "_expect_page") != undefined
				&& jConnection.attr(destination + "_expect_page") 
													!= currentPageId){
				//We're not at the needed page to continue
				//Todo- Program a qa test config for this
				
				if(params["debug"]){
					alert("Route failed:currentPageId=" + currentPageId
							+ ";expectedPageId=" 
								+ jConnection.attr(destination + "_expect_page")) 
				}

				return false 
			}
		})
	}
}

function calculateRouteDuration(locString){
	var locs = locString.trim().split(",")
		
	//Trim to make sure clean
	$.each(locs, function(i,v){
		v = v.trim
	})

	//Add up all of the routes
	var totalDuration = 0
	$.each(locs, function(i,v){
		if(locs.length -1 == i){
			return false
		}

		var route = jDV("routes").find("route[startLocation='" + v 
								+ "'][endLocation='" + locs[i+1] + "']")

		if(route.length ==  0){
			alert("Error: Route not found start:" + v + " end:" + locs[i+1])
			return false
		}
		
		totalDuration += calculateTicksFromTimeString($(route).attr("duration")) 
	})	
	
	return calculateTimeStringFromTicks(totalDuration)
}

////////////////////////////////////////////////
// Bookmarks
////////////////////////////////////////////////

function getBookmark(bk_name){
	return $(xml).find("config > decisionvars > variable[name='bookmarks'] " +
											" bookmark[name='" + bk_name + "'] ")
}

function setBookmarkOkClicked(){
	var bkName = $("#bookmarkName").attr("value")
	
	//Validate name
	if(bkName.match(/[^a-zA-Z0-9 ]/) != undefined){
		$("#bookmarkNameInvalid").css("display", "block")
	}else{
		$("#bookmarkNameInvalid").css("display", "none")
		setBookmark(bkName)
	}
}

function setBookmark(label){
	//Generate bookmark id
	var jBookmarks = $($(xml).find("config > decisionvars > variable[name='bookmarks']"))
	var bookmarkList = jBookmarks.find("bookmark")
	var bookmarkName = "bkm_" + (bookmarkList.length + 1);
		
	if(label == undefined || label.length == 0){
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
	//todo - will this work if DVS doesn't match decisionvars
	//    like if the writeToLocalStorageOnlyOnSceneLoad flag
	//    is set
	var parentBookmark = jBookmarks
	if(DVS["currentBookmark"] != undefined && 
			DVS["currentBookmark"].length > 0){
		//Parent is a bookmark so grab it
		parentBookmark = getBookmark(DVS["currentBookmark"])
		
	}

	//Set bookmark
	parentBookmark.append($("<bookmark name='" + bookmarkName + "' label='" + bookmarkLabel +
																		"' ><dvdata>" + 
																			varOutput + 
																		"</dvdata></bookmark>"))
	
	//Set currentBookmark dv
	setDV("currentBookmark",bookmarkName)
	
	//Show status text
	$("#statusTxt").fadeIn()
	$("#statusTxt").text("Bookmark Set: " + bookmarkLabel)
	setTimeout(hideStatusText, 3000)
	
	loadBookmarksList()
	
	setState('main')
	
	if(!checkDecisionVarI(
			"writeToLocalStorageOnlyOnSceneLoad","true")){
		writeDecisionVarsToLocalStorage()
	}
}


function loadBookmarksList(){
	//Loop through bookmarks
	var jBookmarks = jDV("bookmarks")
	$(bookmarkPanel).empty().append(recursiveGenerateBookmarkItem(jBookmarks))
}

function bookmarkDelete(bookmarkName){
	var jBookmark = getBookmark(bookmarkName)
	var jCurrentBookmarkSearch = 
						getBookmark(DVS["currentBookmark"])
		
	
	//Is the bookmark you're deleting a parent of the currentBookmark 
	// or the currentBookmark itself? 

	//Test to see if the bookmark being deleted is a parent
	// of the current bookmark
		
	while(jCurrentBookmarkSearch.attr("name") != "bookmarks"){
		if(jCurrentBookmarkSearch.attr("name") == bookmarkName){
			//The bookmark being deleted is a parent of the currentBookmark
			// so find it's parent and set it as the currentBookmark

			jCurrentBookmarkSearch = $(jCurrentBookmarkSearch.parent())

			if(jCurrentBookmarkSearch.attr("name") == "bookmarks"){
				//No parent bookmark so just set it to blank
				setDV("currentBookmark","")
			}else{
				setDV("currentBookmark", jCurrentBookmarkSearch.attr("name"))
			}

			break;
		}else{
			jCurrentBookmarkSearch = $(jCurrentBookmarkSearch.parent())
		}
	}
	
	jBookmark.remove()
	
	loadBookmarksList()
}

function recursiveGenerateBookmarkItem(jBookmarkParent){
	var output = ""
	
	$(jBookmarkParent).find("> bookmark").each(function(i,v){
		//take the bookmark and write 
		var currentBookmarkStyle = ""
		
		if(DVS["currentBookmark"] == $(v).attr("name")){
			currentBookmarkStyle = "currentBookmark"
		}
		
		output +=   "<div class='bookmarkItem " + currentBookmarkStyle + "' id='" + $(v).attr("name") + "'>" + 
						"<div class='bookmarkLabel' onclick='bookmarkClicked(\"" + 
									$(v).attr("name") + "\")'>" + $(v).attr("label") + "</div>" + 
						"<div class='bookmarkDelete' onclick='bookmarkDelete(\"" 
											+ $(v).attr("name") + "\")'>X</div>" + 
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
	
	setDV("currentBookmark", bk_id)
	
	start();
	
	loadBookmarksList()
}

////////////////////////////////////////////////
// Developer
////////////////////////////////////////////////

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

////////////////////////////////////////////////
// Multiplayer
////////////////////////////////////////////////

function multiplayerDispatch(){
	window.parent()
}

function multiplayerEvent(scene, page){
	/*currentTimeVar = $(decisionVars).find('> variable:[name="currentTime"]');	
	
	updateTimeDiv();
	
	currentSceneVar = $(xml).find("config > decisionvars > variable:[name='currentSceneName']");

	currentPageVar = $(xml).find("config  > decisionvars > variable:[name='currentPageName']");
	
	currentSceneVar.attr("value", scene);
	currentPageVar.attr("value", page);
	
	loadScene(currentSceneVar.attr("value"), currentPageVar.attr("value"))	
	*/
}

function multiplayerWaiting(){
	$("#pageContent").html("<h1>Waiting</h1>")
	//todo $("#nextPageBtn").css("display", "none");
	//todo $("body").attr("sound", "false")
	$("#linkToWiki").css("display", "none");
}

////////////////////////////////////////////////
// UI Config
////////////////////////////////////////////////
function showDialogOnChange(){
	if($("#checkbox_disableDialog").attr("checked") == "checked"){
		//Disable dialog
		$("body").attr("disableDialog", "true")
		setDV('disableDialog', "true", true)
	}else{
		//Enabling dialog
		$("body").attr("disableDialog", "false")
		setDV('disableDialog', "false", true)
	}
}

function musicOnChange(){
	if($("#checkbox_musicOn").attr("checked") == "checked"){
		//Enabling music
		$("body").attr("music", "true")	
		setDV("music", "true", true)
		
		loadMusic(jCurrentScene.attr("music"));
		unpauseAudio()
	}else{
		//Disable sound
		$("body").attr("music", "false")		
		setDV("music", "false", true)
		pauseAudio()
		$("#musicPlayerDiv").empty()
	}
}

function narrationAudioOnChange(){
	if($("#checkbox_narrationAudioOn").attr("checked") == "checked"){
		//Enabling narration audio
		$("body").attr("narration_audio", "true")				
		setDV("narrationAudio", "true", true)
	
		loadNarrationAudio(jCurrentScene.attr("name"), jCurrentPage.attr("id"))
		unpauseAudio()
	}else{
		//Disable sound
		$("body").attr("narration_audio", "false")			
		setDV("narrationAudio", "false", true)
		pauseAudio()
		$("#narrationPlayerDiv").empty()
	}
}

////////////////////////////////////////////////
// Audio
////////////////////////////////////////////////

function playPauseBtnClicked(){
  if((document.getElementById('narrationAudioPlayer') != undefined 
  			|| document.getElementById('musicAudioPlayer') != undefined) &&
  		(document.getElementById('narrationAudioPlayer') == undefined 
  			|| document.getElementById('narrationAudioPlayer').paused) && 
  		(document.getElementById('musicAudioPlayer') == undefined 
			|| document.getElementById('musicAudioPlayer').paused)){
      $("#playPauseBtn").text("||")
      unpauseAudio()
  }else{
      $("#playPauseBtn").text(">")
      pauseAudio()
  }  
}

function loadNarrationAudio(name, id){
	if(name == undefined || id == undefined){
		return;	
	}
	
	if(checkDecisionVarI("narrationAudio", "true")){
		$("#narrationPlayerDiv").empty().append($('<audio id="narrationAudioPlayer" width="0" height="0"' +
								'><source src="' + SoundMediaPath + "narration/wav/" +
										name + '-' + id + '.wav"' +
										'type="audio/wav"></source>' + 
								'</audio>'));
   	}
}


function loadMusic(name){
	if(name == undefined){
		return;	
	}
	
	if(checkDecisionVarI("music", "true")){
		parts = /(.+)([.][\w]+$)/.exec(name)
		$("#musicPlayerDiv").empty().append($('<audio id="musicAudioPlayer" width="0" height="0">' + 
													'<source src="' + SoundMediaPath + "ogg/" +
													parts[1] + '.ogg"' +
													'type="audio/ogg"></source>' + 
													'<source src="mp3/' +
													parts[1] + '.mp3"' +
													'type="audio/mp3"></source>' + 
												'</audio>'));


		document.getElementById('musicAudioPlayer').volume = .25;
   	}
}

function updatePlayBtn(){
	if((document.getElementById('narrationAudioPlayer') == null || 
			document.getElementById('narrationAudioPlayer').paused) &&
		(document.getElementById('musicAudioPlayer') == null || 
			document.getElementById('musicAudioPlayer').paused)){
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
	if(checkDecisionVarI("music", "true")){
		if(document.getElementById('musicAudioPlayer') != null){
			document.getElementById('musicAudioPlayer').play()	
		}
	}

	if(checkDecisionVarI("narrationAudio", "true")){
		if(document.getElementById('narrationAudioPlayer') != null){
			document.getElementById('narrationAudioPlayer').play()		
		}
	}
}

////////////////////////////////////////////////
// DecisionVars
////////////////////////////////////////////////

//Will create the dv if it is undefined
function setDV(name, value, writeNow, useXml){
	if(writeNow && useXml){
		alert("error: setDV - writeNow & useXml are both set")
		return 
	}

	if(writeNow == undefined){
		writeNow = false
	}

	var dVars = decisionVars

	if(useXml){
		dVars = $(useXml).find("config > decisionvars")
	}

	var dv = dVars.find("> variable[name='" + name + "']")
	
	if(dv.length == 0){
		$(dVars).append(
				$("<variable name='" + name + "' " + " value='" + value + "'/>"));
	}else{
		dv.attr("value", value)	
	}
	
	if(useXml == undefined){
		updateDVS()
	}

	if(name != "currentBookmark"){
		$(dVars).find("> variable[name='log']").append(
			$("<variable name='" + name + "' " + " value='" + value + "'/>"))
	}

	if(writeNow){
		writeDVToLocalStorage(name, value)
	}
}

function loadDecisionVars(container){	
	$(container).find("> decisionvar").each(function(){
		if($(this).attr("name") == undefined ||
					$(this).attr("name").trim() == ""){
			console.log("blank dv name found")
			return;
		}
		
		//Will create the DV if not already created
		setDV($(this).attr("name"), $(this).attr("value"))
	});
}

var config_xml_string = ""

function writeDVToLocalStorage(name, value){
	setDV(name, value, undefined, xml_lastWrite)
	writeDecisionVarsToLocalStorage(xml_lastWrite)
}

function writeDecisionVarsToLocalStorage(useXml){
	var t_xml = $(xml).clone()[0]

	if(useXml != undefined){
		t_xml = useXml
	}

	//alert("writeDecisionVarsToLocalStorage start")
	if(params["disableLocalStorage"] == undefined){
		//alert("writeDecisionVarsToLocalStorage clone")
		
		//Doesn't seem to work on IPad
		//var xmlClone = $(xml).clone()
		
		//Don't save the local content if we're loading remotely
		if(remotePageContentURL.length > 0){
			//$(xmlClone).find("config > scenes > scene > page > content").empty()
			$(t_xml).find("config > scenes > scene > page > content").empty()
		}
		
		//var config_xml_string = new XMLSerializer().serializeToString(xmlClone)
		config_xml_string = new XMLSerializer().serializeToString(t_xml)
		
		
		//alert("writeDecisionVarsToLocalStorage string = " + config_xml_string)
		
		localStorage.decisionz = config_xml_string
		
		if(config_xml_string.length != localStorage.decisionz.length){
			alert("LocalStorage was not completeley stored")
		}
	    
	    $("#localStorageLength").text("Local Storage Length Is: " + localStorage.decisionz.length)
	}
	
	validateDecisionVars()

	xml_lastWrite = $(t_xml).clone()[0]

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

function jDV(name){
	return $($(decisionVars).find("> variable:[name='" + name + "']"))
}

function updateDVS(){
	DVS = []
	
	decisionVars.find("> variable").each(function(i,v){
		if($(v).attr("value") != undefined){
			DVS[$(v).attr("name")] = $(v).attr("value")
		}
	})
}

//Case insensitive
function checkDecisionVarI(name, value){
	//Todo- calls to this function must not occure
	//   before the DVS is loaded
	
	var dv = DVS[name]
	
	if(dv != undefined && dv.toLowerCase() == value){
		return true;
	}else{
		return false;
	}
}


////////////////////////////////////////////////
// Util
////////////////////////////////////////////////
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

function ajaxErrorFunc(jqXHR, textStatus, errorThrown){
	alert("Error- Can't load config xml.");
}

function ajaxPageErrorFunc(jqXHR, textStatus, errorThrown){
	alert("Error- Page load failed.");
}

function hideStatusText(){
	$("#statusTxt").fadeOut()
}

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

function loadIFrame(source){
	var jIframe = $($("#iframe_snippet").html())
	jIframe.attr("src", source)
	$("#pageContainer").append(jIframe)
}

////////////////////////////////////////////////
// Time
////////////////////////////////////////////////

function addDurationToCurrentTime(duration){
		var durationTicks = 
			calculateTicksFromTimeString(duration) 
		var currentTimeTicks = 
			calculateTicksFromTimeString(DVS["currentTime"]);
		
		currentTimeTicks += durationTicks;
		
		setDV("currentTime", 
			calculateTimeStringFromTicks(currentTimeTicks))
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

function updateTimeDiv(){
	var timeParts = /([0-9]{4})-([0-9]{2})-([0-9]{2}) ([0-9]{2}):([0-9]{2}):([0-9]{2})/.
										exec(DVS["currentTime"])
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

////////////////////////////////////////////////
// Conditions
////////////////////////////////////////////////
function generateExpressionForCondition(condition){
	var output = "(";
	
	var currentTimeString = DVS["currentTime"]
	var currentTimeTicks = calculateTicksFromTimeString(currentTimeString);
		
	//If this is blank than we probably have a time check
	if($(condition).attr("name") != undefined){
		if($(condition).attr("value") == undefined){
			//This is a check to see if the variable is present
			output = output + ' DVS["' + $(condition).attr("name") + '"] == undefined '
		}else{
			output = output + ' DVS["' + $(condition).attr("name") + '"] == "' 
												+ $(condition).attr("value") + '" ';
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
	
	//console.log(expression);
	
	if(expression == ""){
		return true;
	}
	
	var output = eval(expression);
	//console.log(output);
	
	return output;
}
