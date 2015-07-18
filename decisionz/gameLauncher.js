//todo 
//- change function first letter to indicate self contained functions
//- Figure out the intricacies of currentSceneName, currentLocationName, etc
//- Figure out what to do with currentLocationName
//- Add item support
//- Add image support
//- Add video support
//- Add multi-character support
//- What to do with gameStartScene
//- Add multi-player support
//- Add currentFrame support - Which will allow for multiple pages to run at the same time.
//done - Add code to give default values to undefined but neccessary dvs
//- Classify the DV functions (not neccessarly, just figure out the best way)
//done - localStorage should support multiple configs simultaniously

//var params;
var configXmlFilename = "configs/sandbox.xml";
var xml;
var decisionVars;
var DVS = []

var jCurrentScene
var jCurrentPage
var jCurrentCharacter

var sceneReturnObj
var matchFound = false
var routeMode = false

//Click matte vars
var mouseX
var mouseY
var jContentContainer
var matteCanvas
var canvasContext
var jBody
var lastDate = Date.now()

var classimation1 = new Classimation()

var currentStage = {
	pageContent:"#main #pageContent",
	currentCharacter:"currentCharacter",
	currentSceneName:"currentSceneName",
	previousSceneName:"previousSceneName",
	currentPageName:"currentPageName",
	previousPageName:"previousPageName",
	currentLocationName:"currentLocationName",
	previousLocationName:"previousLocationName",
	currentTime:"currentTime"	
}

var origAlert = alert
alert = function(mesg) {
	console.trace(mesg)
	origAlert(mesg)
}



$(document).ready(function () {	
	//Todo need to fix this
	//audioInit();
		
	window.onfocus = function() {
	    //unpauseAudio()
	};

	window.onblur = function() {
	    pauseAudio()
	};

	jContentContainer = $("#contentContainer")
	matteCanvas = document.getElementById("backgroundClickMatteCanvas")
	canvasContext = matteCanvas.getContext('2d');
	jBody = $("body")
	$(document).mousemove(
				function(e) {
					var now = Date.now()
					if(lastDate + 100 > now){
						//console.log("date filtered")
						return
					}else{
						lastDate = now
						//console.log("date passed")
					}

					mouseX = e.pageX - jContentContainer.offset()['left'];
					mouseY = e.pageY - jContentContainer.offset()['top'];

					var p = canvasContext.getImageData(mouseX, mouseY, 1, 1).data;
					
					if(p[3] != 0){
						jBody.css("cursor", "pointer")
						//console.log(mouseX + ":" + mouseY)
					}else{
						jBody.css("cursor", "")

					}
				})

	if(params["css"] != undefined){
		loadjscssfile(params["css"], "css")
	}else{
		loadjscssfile("css/gameLauncher.css", "css")
	}

	if(params["debug"] != undefined){
		$("body").attr("debug", "true")
	}

	if(params["configXmlFilename"] != null){
		if(params["databaseConfig"] != null){
			configXmlFilename = "config.php?config=" + params["configXmlFilename"];	
		}else{
			configXmlFilename = params["configXmlFilename"];		
		} 
	}
	
	$( "#devTabs" ).tabs();
	$( "#setTabs" ).tabs();
	
	loadGame();
});

function loadGame(){
	if(localStorage.decisionz == undefined){
		localStorage.decisionz = "{}";
	}
	
	var jsonDecisionz = JSON.parse(localStorage.decisionz);

	//If decisionz localStorage isn't empty then load from it
	//Othewise attempt to load from config file
	if(jsonDecisionz[configXmlFilename] != undefined){
		parseXml(jsonDecisionz[configXmlFilename])
	}else{
		//Load config
		$.ajax({
		    type: "GET",
		    url: unescape(configXmlFilename),
		    dataType: "text",
		    success: parseXml,
		    error: ajaxErrorFunc
		});
	}
}

function parseXml(text_xml){
	//If the line starts with [[ then remove it
	while(text_xml.match(".*\n")[0].match("^[ ]*[\[][\[]") != undefined){
		text_xml = text_xml.substr(text_xml.match(".*\n")[0].length, text_xml.length)
	}
	
	xml = ( new window.DOMParser() ).
				parseFromString(text_xml, "text/xml")

	convertXMLtoNewFormat()
	
	//todo move this to a function so that we can specify levels of decisionvars
	decisionVars = $(xml).find("config > decisionvars");
	
	updateDVS()	

	handleDVDefaults()

	updateDVS()	
	

	/*if(params["character"] != null){
		var currentCharacterName = params["character"].toLowerCase();
		jCurrentCharacter = $(xml).find("> characters > character").filter(function() {
									    return $(this).attr("name").toLowerCase() == currentCharacterName;
									});
	}else{
		var currentCharacterName = DVS[currentStage.currentCharacter]
		jCurrentCharacter = $($(xml).find("> characters > character[name='" + currentCharacterName + "']")[0])
		
		jCurrentCharacter = $(xml).find("> characters > character").filter(function() {
									    return $(this).attr("name").toLowerCase() == currentCharacterName;
									});
	}*/
	
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
		
	$("#linkToConfigFile").attr("href", unescape(configXmlFilename))

	if(params["SoundMediaPath"] != null){
		setDV("SoundMediaPath",params["SoundMediaPath"])
	}

	if(params["multiplayerUserId"] != null){
		setDV("multiplayerUserId",params["multiplayerUserId"])
	}
	
	if(checkDecisionVarI("disableDialog", "true")){
		$("body").attr("disableDialog", "true")
		$("#checkbox_disableDialog").attr("checked", "checked")
	}else{
		$("#checkbox_disableDialog").removeAttr("checked")
	}
	
	/*if(jCurrentCharacter.attr("start")!= null &&
			DVS[currentStage.currentSceneName] == undefined){
		setDV(currentStage.currentSceneName,jCurrentCharacter.attr("start"))
		setDV(currentStage.currentPageName,"pageStart")
	}*/

	
	loadBookmarksList()
	
	if(!checkDecisionVarI(
			"writeToLocalStorageOnlyOnSceneLoad","true")){
		WriteDecisionVarsToLocalStorage()
	}
	
	updateDVS()
	
	start();
	
	if(DVS['multiplayerMode'] == "true"){
		//We're in multiplayer mode
		setInterval(function(){multiplayerQueueGet()},5000)
	}
}

function handleDVDefaults(){
	//loop through decisionVars_defaults_snippet
	$("#decisionVars_defaults_snippet").find("> variable").each(function(i,v){
		if(DVS[$(v).attr("name")] == undefined && $(v).attr("value") != undefined){
			//If dv is not present and there is a default 
			//  value then create the dv and set the value
			setDV($(v).attr("name"), $(v).attr("value"))
		}

		if($(v).attr("undefined_error") != undefined){
			//If a dv has undefined_error attr then show dialog if not found or length 0
			if(DVS[$(v).attr("name")] == undefined){
				alert("DV undefined_error: " + $(v).attr("name"))
				return
			}		
		}

		if($(v).attr("zero_length_error") != undefined){
			if(undefinedOrNoLength(DVS[$(v).attr("name")])){
				alert("DV zero_length_error: " + $(v).attr("name"))
				return
			}
		}
	})
}

function start(){ 
	setState("main")
	
	$.each(DVS['activeStages'].split(","), function(i,v){
		loadStage(v)

		updateTimeDiv();

		//Fix for issue where on reload previousSceneName is messed up
		var currentSceneName = DVS[currentStage.currentSceneName]

		if(currentSceneName == undefined){
			alert("No currentSceneName set")
		}

		setDV(currentStage.currentSceneName, DVS[currentStage.previousSceneName])

		loadScene(currentSceneName, DVS[currentStage.currentPageName])
	})
}

function loadLocation(name){
	//loop through all scene condtions until you find a match or use the default
	matchFound = false;
	
    var locationTag = $(xml).find("config > locations > location:[name='" + name + "']");
    
	setDV(currentStage.previousLocationName, DVS[currentStage.currentLocationName])
    setDV(currentStage.currentLocationName, name)

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
	setDV(currentStage.previousSceneName, DVS[currentStage.currentSceneName])
	setDV(currentStage.currentSceneName, name)

	$("#backgroundImage").attr("src","")
	$("#backgroundClickMatte").attr("src","")
		
	jCurrentScene = $(xml).find("config > scenes > scene:[name='" + name + "']");
	
	//Don't load any music, page content, or templates in routeMode
	if(!routeMode){
		//Todo - update for multiple stages
		//Todo - Can we remove this line?
		//$("#pageContainer").html($("#pageContent_snippet").html())
		
		loadMusic(jCurrentScene.attr("music"));
		unpauseAudio()
	
		if(jCurrentScene.attr("loadClassimation")){
			classimation1.load(jCurrentScene.attr("loadClassimation"))
		}
	
		if(jCurrentScene.attr("loadIFrameTemplate")){
			loadIFrame(jCurrentScene.attr("loadIFrameTemplate"))
		}

		if(!undefinedOrNoLength(jCurrentScene.attr("click_matte"))){
			$("#backgroundImage").removeClass("hidden")
			$("#backgroundClickMatte").removeClass("hidden")
			loadClickMatte(jCurrentScene.attr("click_matte"))
		}else if(!undefinedOrNoLength(jCurrentScene.attr("scenetype"))
					&& jCurrentScene.attr("scenetype") == "SimpleClickMatte"){
			$("#backgroundImage").removeClass("hidden")
			$("#backgroundClickMatte").removeClass("hidden")
			loadClickMatte(jCurrentScene.attr("name"))
		}else{
			$("#backgroundImage").addClass("hidden")
			$("#backgroundClickMatte").addClass("hidden")
		}
	}
	
	WriteDecisionVarsToLocalStorage()
	
	if(pageName != undefined){
		//Loading a bookmark
		loadPage(pageName);		
	}else{
		loadDecisionVars(jCurrentScene);
		loadPage("pageStart");
	}
}

var clickLock = false
function decisionClicked(theThis, index){
	if(clickLock){
		return
	}else{
		clickLock = true
	}
	
	//Todo - Find Stage Name
	loadStage($(theThis).closest(".stage").attr("stage_name"))

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
		$(currentStage.pageContent).html("");
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

        	output = output + "<div " + divId + " class='decisionBtn' onclick='decisionClicked(this," + tally + 
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
	//Todo - Need to fix this because it breaks animation
	//Todo - Also update it for multiple stages
	/*if(output.length == 0){
		$("#pageContainer").addClass("hidden")
	}else{
		$("#pageContainer").removeClass("hidden")
	}*/
	
	$(currentStage.pageContent).html(output);
	
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
			remotePageUrl = DVS["remotePageContentURL"] + "?title=JS_" + 
			    				jCurrentScene.attr("name") +  ":" + 
			    				jCurrentPage.attr("id");

		}else{
			//Generate the page name automatically
			remotePageUrl = DVS["remotePageContentURL"] + "?title=" + 
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
			WriteDecisionVarsToLocalStorage()
		}

		if(jCurrentPage.attr("classimation") != undefined){
			if(jCurrentPage.attr("classimationNextPage") != undefined){
				classimation1.playAnimation(jCurrentPage.attr("classimation")
					, function(){loadPage(jCurrentPage.attr("classimationNextPage"))})
			}else{
				classimation1.playAnimation(jCurrentPage.attr("classimation"))
			}
		}

		loadMusic(jCurrentPage.attr("music"));
		loadNarrationAudio(jCurrentScene.attr("name"), jCurrentPage.attr("id"))
		unpauseAudio()
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
		WriteDecisionVarsToLocalStorage()
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

	setDV(currentStage.previousPageName, DVS[currentStage.currentPageName])
    setDV(currentStage.currentPageName, pageId)

	//todo wipes out animation if playing
	//Todo - also update for multiple stages
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
			
			if(DVS["remotePageContentURL"] != undefined &&
					DVS["remotePageContentURL"].length > 0 &&
					jCurrentPage.attr("dontLoadContent") == undefined){
				var remotePageUrl = DVS["remotePageContentURL"] + "?title=" + 
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

////////////////////////////////////////////////
// Route
////////////////////////////////////////////////
function runRoute(endLocationName, endPageId){
	//Find a route with the startScene and endScene
	routeMode = true

	//todo - do we need a currentLocationName here
	var startLocationName = DVS[currentStage.currentLocationName]
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
			var currentSceneName = DVS[currentStage.currentSceneName]
			var currentPageId = DVS[currentStage.currentPageName]

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
		WriteDecisionVarsToLocalStorage()
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
//todo - Do we need this function?
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
var multiplayerPostQueue = ""
var ajaxRequestPending = false
//todo - check for "failure:" on url requests

function multiplayerQueuePost(theValue){
	$.ajax({
		type: "POST",
		async: false,
		url: DVS['multiplayerQueuePostURL'] 
				+ "?user_id=" + DVS['multiplayerUserId'],
		dataType: "text",
		success: function(){},
		error: function(){console.log("multiplayerQueuePost ajax failure.")},
		data:{value:theValue}
	});
}

function multiplayerQueueGet(){
	$.ajax({
		type: "GET",
		async: false,
		url: DVS['multiplayerQueueGetURL'] + "?user_id=" + DVS['multiplayerUserId'],
		dataType: "text",
		success: function(text){
			console.log(text)
		},
		error: function(){console.log("multiplayerQueueGet ajax failure.")}
	});
}

function multiplayerQueueClear(){
	$.ajax({
		type: "GET",
		async: false,
		url: DVS['multiplayerQueueClearURL'] + "?user_id=" + DVS['multiplayerUserId'],
		dataType: "text",
		success: function(){},
		error: function(){console.log("multiplayerQueueClear ajax failure.")}
	});
}

////////////////////////////////////////////////
// UI 
////////////////////////////////////////////////

function toggleMenuBar(){
	if($("#menuBar").hasClass('displayNone')){
		$("#menuBar").removeClass('displayNone')
	}else{
		$("#menuBar").addClass('displayNone')
	}
}

function matteClicked(matte){
	var p = canvasContext.getImageData(mouseX, mouseY, 1, 1).data;
	
	if(p[3] > 0){ //Something is here because the alpha isn't 0
		var hexColor = rgbToHex(p[0],p[1],p[2])

		//alert(Math.ceil(mouseX) + ":" + Math.ceil(mouseY) + ";" + hexColor  + "," + p[3])

		while(hexColor.length < 6){
			hexColor = "0" + hexColor
		} 

		var jLinkItem = $(xml).find("linktypes > linktype[color='" + hexColor + "']")
		var linkItemName = jLinkItem.attr('name')

		var jCurrentSceneLinkItem = jCurrentScene.find("> link[linktype='" + linkItemName + "']")
		var linkItemLocationName = jCurrentSceneLinkItem.attr("location")
		loadLocation(linkItemLocationName) 
	}
}

function matteHover(thisObj){
	//var context = canvas.getContext('2d');
	//var p = context.getImageData(mouseX, mouseY, 1, 1).data;
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
								'><source src="' + DVS['SoundMediaPath'] + "narration/wav/" +
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
													'<source src="' + DVS['SoundMediaPath'] + "ogg/" +
													parts[1] + '.ogg"' +
													'type="audio/ogg"></source>' + 
													'<source src="mp3/' +
													parts[1] + '.mp3"' +
													'type="audio/mp3"></source>' + 
												'</audio>'));


		document.getElementById('musicAudioPlayer').volume = .25;
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
function setDV(name, value){
	var dVars = $(xml).find("config > decisionvars")

	var dv = dVars.find("> variable[name='" + name + "']")

	var valString = ""

	if(value != undefined){
		valString = " value='" + value + "'"
	}
	
	var dvXml = "<variable name='" + name + "' " + valString + "/>"
	if(dv.length == 0){
		$(dVars).append($(dvXml));
	}else if(value != undefined){
		dv.attr("value", value)	
	}
	
	updateDVS()
	
	if(name != "currentBookmark"){
		$(dVars).find("> variable[name='log']").append(
			$("<variable name='" + name + "' " + valString + "/>"))
	}

	WriteDecisionVarsToLocalStorage()


	if(DVS['multiplayerMode'] == "true" && !isDefaultValue(name)){
		multiplayerQueuePost(dvXml)
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

function WriteDecisionVarsToLocalStorage(){
	var t_xml = $(xml).clone()[0]
	
	//Doesn't seem to work on IPad
	//var xmlClone = $(xml).clone()

	//Don't save the local content if we're loading remotely
	if(!undefinedOrNoLength(DVS["remotePageContentURL"])){
		$(t_xml).find("config > scenes > scene > page > content").empty()
	}

	var config_xml_string = new XMLSerializer().serializeToString(t_xml)

	//Use JSON to store more than one configuration
	var jsonDecisionz = JSON.parse(localStorage.decisionz);
	jsonDecisionz[configXmlFilename] = config_xml_string
	var newJson =  JSON.stringify(jsonDecisionz)
	localStorage.decisionz = newJson

	//Check that it actually saved
	if(newJson.length != localStorage.decisionz.length){
		alert("LocalStorage was not completeley stored")
	}

	$("#localStorageLength").text("Local Storage Length Is: " + localStorage.decisionz.length)

	validateDecisionVars()
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
function isDefaultValue(name){
	if($("#decisionVars_defaults_snippet > variable[name='" 
										+ name + "']").length > 0){
		return true										
	}else{
		return false
	}
}

function rgbToHex(r, g, b) {
	if (r > 255 || g > 255 || b > 255)
		throw "Invalid color component";
	return ((r << 16) | (g << 8) | b).toString(16);
}

function undefinedOrNoLength(value){
	if(value == undefined || value.length == 0){
		return true
	}else{
		return false
	}
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
	localStorage.decisionz = "{}";
}

function loadIFrame(source){
	var jIframe = $($("#iframe_snippet").html())
	jIframe.attr("src", source)
	//Todo - update for multiple stages
	$("#pageContainer").append(jIframe)
}


function loadClickMatte(name){
	$("#backgroundImage").attr("src","scenes/" + name + "/background.png")
	$("#backgroundClickMatte").attr("src","scenes/" + name + "/matte.png")
}

function matteLoaded(){
	matteCanvas = document.getElementById("backgroundClickMatteCanvas")
	var img = document.getElementById("backgroundClickMatte")
	matteCanvas.width = img.width;
	matteCanvas.height = img.height;
	
	canvasContext.drawImage(img, 0, 0, img.width, img.height);
}

////////////////////////////////////////////////
// Time
////////////////////////////////////////////////

function addDurationToCurrentTime(duration){
		var durationTicks = 
			calculateTicksFromTimeString(duration) 
		var currentTimeTicks = 
			calculateTicksFromTimeString(DVS[currentStage.currentTime]);
		
		currentTimeTicks += durationTicks;
		
		setDV(currentStage.currentTime, 
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
										exec(DVS[currentStage.currentTime])
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
	
	var currentTimeString = DVS[currentStage.currentTime]
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

////////////////////////////////////////////////
// Stages
////////////////////////////////////////////////
function loadStage(name){
	$.each(JSON.parse(DVS[name]), function(k,v){
		currentStage[k] = v
	})

	//Todo - Should I put these type of function here, or somewhere else
	//updateTimeDiv()
}