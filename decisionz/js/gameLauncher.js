//var params;
var configXmlFilename = "../configs/sandbox.xml";
var xml;
var decisionVars;
var DVS = []

var jCurrentScene
var jCurrentPage

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
	currentCharacter:"currentCharacter", //todo - need to expand on this for multiplayer support
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

var x2js = new X2JS()

var configAlreadyLoaded = false

//todo
//var writeToLocalStorageOnlyOnPageLoad = false

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
	$(document).mousemove(clickMatte_mouseMove)

	//Todo make this a hiearchy of loading css's based on json
	if(params["css"] != undefined){
		var cssArr = unescape(params["css"]).split(",")

		for(var i=0; i< cssArr.length; i++){
			loadjscssfile(cssArr[i], "css")
		}
	}else{
		loadjscssfile("../css/gameLauncher.css", "css")
	}


	if(params["debug"] != undefined){
		$("body").attr("debug", "true")
	}

	//todo - make sure this works with overridden localStorageName param
	if(params["configXmlFilename"] != null){
		if(params["databaseConfig"] != null){
			configXmlFilename = "config.php?config=" + params["configXmlFilename"];	
		}else{
			configXmlFilename = params["configXmlFilename"];		
		} 
	}

	if(params['localStorageName'] != undefined){
		localStorageName = params['localStorageName']
	}else{
		localStorageName = configXmlFilename
	}
	

	//todo
	/*
	if(!uob(params['writeToLocalStorageOnlyOnPageLoad'])){
		writeToLocalStorageOnlyOnPageLoad = 
							params['writeToLocalStorageOnlyOnPageLoad']
	}*/

	$( "#devTabs" ).tabs();
	$( "#setTabs" ).tabs();
	$( "#uiTabs" ).tabs();
	
	loadGame();
});

var localStorageName

function loadGame(){
	//Create localStorage for decisionz if not already there
	if(uob(localStorage.decisionz)){
		localStorage.decisionz = "{}"
	}

	var decisionzLocalStorageJson = JSON.parse(localStorage.decisionz)

	//If decisionz localStorage isn't empty then load from it
	//Othewise attempt to load from config file
	if(!uob(decisionzLocalStorageJson[localStorageName])){
		configAlreadyLoaded = true

		//todo - handle for compression if necessary
		parseXml(LZString.decompress(decisionzLocalStorageJson[localStorageName]))
	}

	if(!configAlreadyLoaded){
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
	
	xml = (new window.DOMParser()).parseFromString(text_xml, "text/xml")

	if($(xml).find("parsererror").length > 0){
		alert("Error parsing xml in parseXml function")
		return 
	}

	decisionVars = $(xml).find("config > decisionvars")

	if(decisionVars.length == 0){
		//This config file has no decisionVars tag, so create it
		$(xml).find("config").append($("<decisionvars></decisionvars>"))
		decisionVars = $(xml).find("config > decisionvars")
	}

	convertXMLtoNewFormat()
	
	//todo move this to a function so that we can specify levels of decisionvars
	
	
	updateDVS()	

	handleDVDefaults()

	//Load dv_ url params
	//Todo - Add JSON support
	var paramsKeys = Object.keys(params)
	
	if(!configAlreadyLoaded){ //Config was not loaded from localStorage
		for(var i=0; i < paramsKeys.length; i++){
			var key = paramsKeys[i]
			if(key.substr(0,"dv_".length) == "dv_"){
				//This param is used to set a decision var
				console.log("DV url parm found:" + key)
				setDV(key.substr("dv_".length, key.length), params[key])
			}
		}
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
		
	$("#linkToConfigFile").attr("href", unescape(configXmlFilename))

	if(params["SoundMediaPath"] != null){
		setDV("SoundMediaPath",params["SoundMediaPath"])
	}else{
		//Nothing set on url so set a default value if the dv is blank
		if(uob(DVS["SoundMediaPath"])){
			setDV("SoundMediaPath","../")
		}
	}

	if(params["multiplayerUserId"] != null){
		setDV("multiplayerUserId",params["multiplayerUserId"])
	}

	if(params["multiplayerSessionId"] != null){
		setDV("multiplayerSessionId",params["multiplayerSessionId"])
	}
	
	if(params['currentCharacter'] != undefined){
		setDV("currentCharacter",params["currentCharacter"])
	}	

	if(checkDecisionVarI("disableDialog", "true")){
		$("body").attr("disableDialog", "true")
		$("#checkbox_disableDialog").attr("checked", "checked")
	}else{
		$("#checkbox_disableDialog").removeAttr("checked")
	}

	
	loadBookmarksList()
	
	//todo
	/*if(writeToLocalStorageOnlyOnSceneLoad == "true"){
		WriteDecisionVarsToLocalStorage()
	}*/
	
	updateDVS()
	
	start();
	
	if(DVS['multiplayerMode'] == "true"){
		//We're in multiplayer mode
		multiplayerQueueClear()
		setInterval(function(){multiplayerLoop()},5000)
	}
}

function start(){ 
	setState("main")
	
	//Note/Todo - Just loading the first stage will trigger the other stages to load
	var stageOneName = DVS['activeStages'].split(",")[0]
	loadStage(stageOneName)

	updateTimeDiv();

	//Fix for issue where on reload previousSceneName is messed up
	var currentSceneName = DVS[currentStage.currentSceneName]

	if(currentSceneName == undefined){
		alert("No currentSceneName set")
	}

	setDV(currentStage.currentSceneName, DVS[currentStage.previousSceneName])

	loadScene(currentSceneName, DVS[currentStage.currentPageName])
}

////////////////////////////////////////////////
// Page Loading
////////////////////////////////////////////////
function loadLocation(name){
	//loop through all scene condtions until you find a match or use the default
	matchFound = false;
	
	//Todo do we need the ":" after "location:"?
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

		if(!uob(jCurrentScene.attr("click_matte"))){
			$("#backgroundImage").removeClass("hidden")
			$("#backgroundClickMatte").removeClass("hidden")
			loadClickMatte(jCurrentScene.attr("click_matte"))
		}else if(!uob(jCurrentScene.attr("scenetype"))
					&& jCurrentScene.attr("scenetype") == "SimpleClickMatte"){
			$("#backgroundImage").removeClass("hidden")
			$("#backgroundClickMatte").removeClass("hidden")
			loadClickMatte(jCurrentScene.attr("name"))
		}else if(!uob(jCurrentScene.attr("background"))){
			//Todo - Use a variable to set the path to the scenes dir not "../"
			$("#backgroundImage").attr("src","../scenes/" 
											+ jCurrentScene.attr("background") 
											+ "/background.png")
			$("#backgroundImage").removeClass("hidden")
		}else{
			$("#backgroundImage").addClass("hidden")
			$("#backgroundClickMatte").addClass("hidden")
		}
	}
	
	//todo
	//WriteDecisionVarsToLocalStorage()
	/*var build_start_page_from_dv = jCurrentScene.attr("build_start_page_from_dv")
	if(fubze(build_start_page_from_dv)){
		
	}*/


	if(pageName != undefined){
		//Loading a bookmark -- todo Is this comment correct?
		loadPage(pageName);		
	}else{
		loadDecisionVars(jCurrentScene);
		loadPage("pageStart");
	}
}

function remotePageContent(text){
	//alert(html);
	jCurrentPage.find("> content").empty().append($(text.replace(/[\[][\[].*[\]][\]]/g,"")));
	generatePage();
}

function recursiveGenerateDynamicContent(jContentTag, jDecisionsTag){
	//loop through dynamics
	jContentTag.find("> dynamic").each(function(i,v){
		if(checkConditions($(v))){
			//conditions match
			
			var jDecisions = $(v).find("> decisions")

			if(jDecisions.length > 1){
				alert("Multiple decisions nodes found")				
			}else if(jDecisions.length == 1){
				//move the decisions to the jDecisionsTag
				jDecisionsTag.append(jDecisions.html())
				jDecisions.remove()
			}

			//replace the dynamic node with the content 
			//Todo - Can't replaceWith the node. some sort of issue'
			var jContent = $(v).find("> content").clone()
			var jParent = $(v).parent()
			//$(v).replaceWith(jContent)
			$(v).remove()
			jParent.append(jContent)

			//recurse into dyanamic > content
			recursiveGenerateDynamicContent(jContent, jDecisionsTag)
		}else{
			//no match so remove the node
			$(v).remove()
		}
	})
}

function handleDynamicContent(jPage){
	var jContentTag = jPage.find("> content")
	var jDecisionsTag = jPage.find("> decisions")

	recursiveGenerateDynamicContent(jContentTag, jDecisionsTag)
}

function handlePrintTags(jCurrentTag){
	//Loop through print tags
	jCurrentTag.find("print").each(function(i,v){
		var jV = $(v)

		if(jV.attr("dvname") != undefined){
			jV.replaceWith(DVS[jV.attr("dvname")])
		}
	})

	return jCurrentTag
}

function generatePage(){
	//Load local content
	var output = "";
	
	//Assign id's to all decisions in page
	jCurrentPage.find("decisions > decision").each(function(i,v){
		if($(v).attr("id") == undefined){
			var rand = Math.random().toString()
			rand = rand.substr(2,rand.length)
			$(v).attr("id", rand)
		}		
	})

	//Todo - rethink how you're doing the "undefined" tests.
	//   Instead move to a smarter function to check
	var jResultPage = jCurrentPage.clone()
	if(jResultPage.attr("dontLoadContent") == undefined){
		//Remove the todo sections
		jResultPage.find(".todo").remove()

		handleDynamicContent(jResultPage)
		handlePrintTags(jResultPage)
		output = new XMLSerializer().serializeToString(jResultPage.find("> content")[0])
	}

	//Todo1 - Think through "dontLoadContent" for conditional content

	//Load decisions
	//Todo - Handle for decisions in output
	jResultPage.find("> decisions > decision").each(function(i,v){
        //Check if this decision should be displayed
        if(checkConditions(this)){
			var divId = ""
			if($(v).attr("id") != undefined){
				divId = "id='" + $(v).attr("id") + "'"
			}

			var divStage = ""
			if($(v).attr("stage_name") != undefined){
				divStage = "stage_name='" + $(v).attr("stage_name") + "'"
			}
 
        	output = output + "<div " + divId + divStage +
        							" class='decisionBtn' onclick='decisionClicked(this,\"" 
        								+ $(v).attr("id") + 
        								"\")' >" + $(this).attr("label") + "</div>";
		}
	});
	
	//If there's some code here then it may be in a CDATA
	var narrationLogText = output = output.replace("<![CDATA[", "").replace("]]>", "");
	
	//Load the script tag from the page if present
	//Todo - Note: We really need a better strategy for loading javascript blocks.
	//  Also need to figure out how loadJS/et all work into the big picture.
	var scriptTag = jResultPage.find("> content > script")
	if(scriptTag.length > 0){
		//output += "\n<script>\n" + scriptTag.text() + "\n</script>\n"
	}
	
	//Todo the above just save for compatibility with older code
	var scriptTag = jResultPage.find("> content_script")
	if(scriptTag.length > 0){
		output += "\n<script>\n" + scriptTag.text() + "\n</script>\n"
	}
	
	//Load the style tag from the page if present
	var styleTag = jResultPage.find("> content > style")
	if(styleTag.length > 0){
		output += "\n<style>\n" + styleTag.text() + "\n</style>\n"
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

	//Actually creates a script tag. Just testing out this feature
	if(scriptTag.length > 0){	
		var script   = document.createElement("script");
		script.type  = "text/javascript";
		script.text  = scriptTag.text()              // use this for inline script
		$(currentStage.pageContent)[0].appendChild(script);
	}
	
	//Todo - remove this
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
	if(currentStage["disableNarrationLog"] == undefined){
		if(jNarrationLog.children().last().hasClass("youChose")){
			//Todo - Remove script tags automatically. And remove the script tag fix
			//output = output.replaceAll("<script*>*</script>", "");
			jNarrationLog.html(jNarrationLog.html() + narrationLogText)

		}
	}

	jNarrationLog.find("div.decisionBtn").removeAttr("onclick")

	$("#narrationLog").empty().append($(jNarrationLog.html()))

	//Todo - Not sure if loadJSAttrSuccess is actually connected to anything
	// Maybe a hold over attr from Flex version
	if(jResultPage.find("> content > script")[0] != undefined &&
			typeof(loadJSAttrSuccess) == "function"){
		loadJSAttrSuccess($(jResultPage.find("> script")[0]).text())

		pageLoaded()
	}else if(jResultPage.attr('loadJS') != undefined){
		var remotePageUrl = ""
		
		//Todo - Does this handle for writing to decision vars or pageLoaded?
		//Todo - Handle for loading locally. 
		if(jResultPage.attr('loadJS') == ""){
			//Generate the page name automatically
			remotePageUrl = DVS["remotePageContentURL"] + "?title=JS_" + 
			    				jCurrentScene.attr("name") +  ":" + 
			    				jResultPage.attr("id");

		}else{
			//Generate the page name automatically
			remotePageUrl = DVS["remotePageContentURL"] + "?title=" + 
								jResultPage.attr('loadJS')
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
		//todo
		/*if(writeToLocalStorageOnlyOnSceneLoad != "true" &&
				jCurrentScene.attr(
					"disableLocalStorageWritesOnPageLoad") == undefined){
			WriteDecisionVarsToLocalStorage()
		}*/

		if(jResultPage.attr("classimation") != undefined){
			if(jResultPage.attr("classimationNextPage") != undefined){
				classimation1.playAnimation(jResultPage.attr("classimation")
					, function(){loadPage(jResultPage.attr("classimationNextPage"))})
			}else{
				classimation1.playAnimation(jResultPage.attr("classimation"))
			}
		}

		loadMusic(jResultPage.attr("music"));
		loadNarrationAudio(jCurrentScene.attr("name"), jResultPage.attr("id"))
		unpauseAudio()

		pageLoaded()
	}

}

var pageLoaded_lock = false
var pageLoaded_stagesArrLength
var pageLoaded_calledNumTimes
var pageLoaded_initialStageName

function pageLoaded(){
	if(pageLoaded_lock == true){
		pageLoaded_calledNumTimes++
		if(pageLoaded_calledNumTimes == pageLoaded_stagesArrLength - 1){
											//Minus 1 because the first stage
											//was already loaded when pageLoaded
											//was originally called
			//We just finished the last stage load so write the vars
			WriteDecisionVarsToLocalStorage()
			pageLoaded_lock = false
		}
	}else{
		pageLoaded_initialStageName = currentStage.name

		pageLoaded_stagesArrLength = DVS['activeStages'].split(",").length

		//Are there more stages
		if(pageLoaded_stagesArrLength > 1){
			//Prevents recursion
			pageLoaded_lock = true
			pageLoaded_calledNumTimes = 0

			//Refresh the other stages (Note - don't get caught in infinite loop!)
			$.each(DVS['activeStages'].split(","), function(i,v){
				if(pageLoaded_initialStageName == v){
					//No need to reload this stage so just exit
					return
				}

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
	}		
}

function generatePage_part2(text){
	//Todo- do we need this
	eval(text)
	
	//Launch a load function if present
	if(sceneReturnObj != undefined && 
		sceneReturnObj.initPageScript != undefined) {
	    sceneReturnObj.initPageScript()
	}

	//todo
	/*if(writeToLocalStorageOnlyOnSceneLoad != "true" &&
			jCurrentScene.attr(
				"disableLocalStorageWritesOnPageLoad") == undefined){
		WriteDecisionVarsToLocalStorage()
	}*/


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

	//todo - right now it writes twice on page load. Maybe we need
	// something smarter here.
	WriteDecisionVarsToLocalStorage()
}

function loadPage(pageId){
	if(pageId == undefined)
		return

	setDV(currentStage.previousPageName, DVS[currentStage.currentPageName])
    
    //Clear it out in case the page doesn't exist (click_matte/etc)
    //Todo - Need to fix this because it may be another stage
    setDV(currentStage.currentPageName, "")

	//todo wipes out animation if playing
	//Todo - also update for multiple stages
	///$("#pageContainer").html($("#pageContent_snippet").html())
	
	sceneReturnObj = undefined
	
	//Todo - this currently doesn't work with multiple stages
	var pageQuery = "> page:[id='" + pageId + "']"
	console.log(pageQuery)
	jCurrentPage = jCurrentScene.find(pageQuery);
	
	if(jCurrentPage.length == 0){
		//Try to find the page in the location
		var locationPageQuery = "config > locations "  
						+ "> location[name='" + jCurrentScene.attr("name") + "']"
						+ "> page[id='" + pageId + "']"
		console.log(locationPageQuery)
		jCurrentPage = $(xml).find(locationPageQuery)
		
		if(jCurrentPage.length == 0){
			//Try to find as a shared resource
			var sharedPageQuery = "config > shared "  
							+ "> page[id='" + pageId + "']"
			console.log(sharedPageQuery)
			jCurrentPage = $(xml).find(sharedPageQuery)

			if(jCurrentPage.length == 0){
				//alert("CurrentPage: " +  pageId + " could not be found.")
				return;
			}
		}
	}

	//We have a real page so set the dv
	setDV(currentStage.currentPageName, pageId)

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
	
	//todo
	//if(writeToLocalStorageOnlyOnSceneLoad != "true"){
		WriteDecisionVarsToLocalStorage()
	//}
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
	$(xml).find("config > decisionvars").empty()

	//var rootXml = "<root>"
	
	var gameStateText = $("#errorTextArea").attr("value")
	var xmlDocStr = x2js.json2xml_str(JSON.parse(gameStateText))
	/*gameStateText = gameStateText.replace(/["]/g,"'")
	
	while(gameStateText.match("^[ ]*[\[][\[].*\n") != undefined){
		gameStateText = gameStateText.substr(gameStateText.match(".*\n")[0].length, gameStateText.length)
	}
	
	$.each(gameStateText.split(","), function(i,v){
		var arr = v.split("=")
		rootXml += "<decisionvar name='" + arr[0] + "' value='" + arr[1] + "' />" 			
	})
	
	rootXml += "</root>"
	jRootXml = $(rootXml)*/
	
	loadDecisionVars($(xmlDocStr))
	
	setDV("currentBookmark", "")
	
	//todo - can i remove this
	//writeDecisionVarsToLocalStorage()
	loadGame()	
}

function sendErrorReport(){
	var jsonTxt = ""
	
	/*decisionVars.find("> variable[name='log'] > variable").each(function(i,v){
		bodyJson += $(v).attr("name") + "=" + $(v).attr("value") + ","
	})*/

	var out = new XMLSerializer().serializeToString(decisionVars[0])
	var jsonObj = x2js.xml_str2json(out)
	jsonTxt = JSON.stringify(jsonObj)
	jsonTxt = jsonTxt.replace(/\\n/g, "")

    var link = "mailto:danielberm@yahoo.com"
             + "?subject=" + escape("Decisionz Error Report")
             + "&body=" + jsonTxt

    window.location.href = link;
}

////////////////////////////////////////////////
// Multiplayer
////////////////////////////////////////////////
var multiplayerPostQueue = ""
var ajaxRequestPending = false
//todo - check for "failure:" on url requests

function multiplayerLoop(){
	if(!ajaxRequestPending){
		ajaxRequestPending = true
		multiplayerQueueGet()
		multiplayerQueuePost()
		ajaxRequestPending = false
	}
}

function multiplayerAddToPostQueue(value){
	multiplayerPostQueue += value 
}

function multiplayerQueuePost(){
	if(multiplayerPostQueue.length > 0){
		$.ajax({
			type: "POST",
			async: false,
			url: DVS['multiplayerQueuePostURL'] 
					+ "?user_id=" + DVS['multiplayerSessionId'],
			dataType: "text",
			success: function(text){
				//Check for failure
				if(text.substring(0,"failure:".length) == "failure:"){
					alert("multiplayerQueuePost failed")
				}else{
					multiplayerPostQueue = ""
				}
			},
			error: function(){console.log("multiplayerQueuePost ajax failure.")},
			data:{value:multiplayerPostQueue}
		});
	}
}

function multiplayerQueueGet(){
	$.ajax({
		type: "GET",
		async: false,
		url: DVS['multiplayerQueueGetURL'] + "?user_id=" + DVS['multiplayerUserId'],
		dataType: "text",
		success: function(text){
			//Check for failure
			if(text.substring(0,"failure:".length) == "failure:"){
				//alert("multiplayerQueueGet failed")
			}else{
				//Cycle through DV's and set the DV's
				var dvArray = $(text).text().split(":")

				$.each(dvArray,function(i,v){
					if(v == ""){
						return
					}

					var keyValPair = v.split(",")
					setDV(keyValPair[0], keyValPair[1], false)
				})

				//Clear the queue
				multiplayerQueueClear()
			}
			
			//Handle waitingOn
			if(DVS['multiplayerWaitingOn'] != ""){
				var waitingParts = DVS['multiplayerWaitingOn'].split(',')
				if(DVS[waitingParts[0]] != undefined  
						&& DVS[waitingParts[0]] == waitingParts[1]){
					//Todo - have to make all of this handle multiple 
					// vars, and locations/scenes/pages
					var scenePageParts = waitingParts[2].split(":")
					loadPage(scenePageParts[1]);

					//We found the match so clear it
					setDV('multiplayerWaitingOn',"")
				}
			}			
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
		success: function(text){
			text = text //Just to set a breakpoint
			//alert("multiplayerQueueClear: done")
		},
		error: function(){console.log("multiplayerQueueClear ajax failure.")}
	});
}

////////////////////////////////////////////////
// UI 
////////////////////////////////////////////////
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
		case "ui":
			$("body").attr("state", "ui")
			break
		case "set_bookmark":
			$("#bookmarkName").attr("value", "")
			$("body").attr("state", "set_bookmark")
			break;
	}
	
	window.scrollTo(0, 0)
}

function toggleMenuBar(){
	if($("body").hasClass('showMenu')){
		$("body").removeClass('showMenu')
	}else{
		$("body").addClass('showMenu')
	}
}

var clickLock = false
function decisionClicked(theThis, id){
	if(clickLock){
		return
	}else{
		clickLock = true
	}
	
	//Todo - Find Stage Name
	//First we need the currentStage of the stage that the decision resides in
	loadStage($(theThis).closest(".stage").attr("stage_name"))

	//Todo need to fix for multiple stages. It looks like it runs
	// with the wrong scene name for another stage
	jCurrentScene = $(xml).find("config > scenes > scene:[name='" 
						+  DVS[currentStage.currentSceneName] + "']");

	var pageQuery = "> page:[id='" + DVS[currentStage.currentPageName] + "']"
	console.log(pageQuery)
	jCurrentPage = jCurrentScene.find(pageQuery);
 
	var decision = jCurrentPage.find("decisions > decision#" + id)
	
	//When one stage opens a page in another stage have to take the decision from the
	// first stage, but the "currentStage" of the target stage.
	if($(theThis).attr("stage_name") != undefined){
		loadStage($(theThis).attr("stage_name"))
	}

	if($(decision).attr("calculate_duration") != undefined){
		//Find route duration
		addDurationToCurrentTime(
			calculateRouteDuration($(decision).attr("calculate_duration"))
		)
	}else if($(decision).attr("duration") != undefined){
		addDurationToCurrentTime($(decision).attr("duration"))
	}
	
	//todo - append doesn't seem to work on IOS with xml
	//todo - Is the narrationLog the same as the log DV?
	//jDV("narrationLog").append("<p> You chose: " + $(decision).attr("label") +  "</p>\n")
	//Todo fix narration log for multiple stages
	jDV("narrationLog").html(jDV("narrationLog").html() 
			+ "\n<p class='youChose' decision_id='" + id + "'> You chose: " 
			+ $(decision).attr("label") +  "</p>\n")
	
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

function fullscreenOnChange(){
	if($("#checkbox_fullscreen").attr("checked") == "checked"){
		var i = document.getElementsByTagName("body")[0]
		i.webkitRequestFullScreen()
	}else{
		document.webkitExitFullscreen()
	}
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
													'type="audio/ogg"></source>' + //Todo - Just updated mp3 to use SoundMediaPath var. Need to test it.
													'<source src="' + DVS['SoundMediaPath'] + "mp3/" +
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
function setDV(name, value, postToMultiplayerQueue, type){
	if(postToMultiplayerQueue == undefined){
		postToMultiplayerQueue = true //todo - is this correct?
	}

	var dVars = $(xml).find("config > decisionvars")

	var dv = dVars.find("> variable[name='" + name + "']")

	var valString = ""

	if(value != undefined){
		valString = " value='" + value + "'"
	}
	
	var dvXml = "<variable name='" + name + "' " + valString + "/>"
	if(dv.length == 0){//Create a new var
		$(dVars).append($(dvXml));
	}else if(value != undefined){
		//Change the already existing var
		//Note - If we are in "add" mode you want to add it to the current dv

		if(!fubze(type)){
			var dvValue = parseFloat(dv.attr("value"))
			value = parseFloat(value)

			switch(type){
				case "add":
					dvValue = dvValue + value
					break;
				case "multiply":
					dvValue = dvValue * value
					break;
				case "divide":
					dvValue = dvValue / value
					break;
				case "subtract":
					dvValue = dvValue - value
					break;
			}	

			dv.attr("value", dvValue)
		}else{
			dv.attr("value", value)	
		}
	}
	
	updateDVS()
	
	if(name != "currentBookmark"){
		$(dVars).find("> variable[name='log']").append(
			$("<variable name='" + name + "' " + valString + "/>"))
	}

	//todo
	/*if(writeToLocalStorageOnlyOnSceneLoad != "true"){
		WriteDecisionVarsToLocalStorage()
	}*/

	if(postToMultiplayerQueue == true 
			&& DVS['multiplayerMode'] == "true" 
			&& !isDefaultValue(name)){
		multiplayerAddToPostQueue(name + "," + value + ":")
	}
}

function loadDecisionVars(container){	
	var selector = "> variable"
	
	//Todo - For some reason I got the great idea to change the decisionvar 
	// node name to variable. This is a problem because all of the configs
	// have to be changed as well, or we can roll back the "variable" name change
	//Todo - WHAT A MESS! Doesn't handle for "decisionVar"!
	for(i=0;i<2;i++){ //The loop is to handle for both "variable" and "decisionvar"s
		$(container).find(selector).each(function(){
			if($(this).attr("name") == undefined ||
						$(this).attr("name").trim() == ""){
				console.log("blank dv name found")
				return;
			}

			//Will create the DV if not already created
			setDV($(this).attr("name"), $(this).attr("value"), 
					undefined, $(this).attr("type"))
		});

		selector = "> decisionvar"
	}
}

//Todo - Optimize
function WriteDecisionVarsToLocalStorage(){
	var t_xml = $(xml).clone()[0]
	
	//Doesn't seem to work on IPad
	//var xmlClone = $(xml).clone()

	//Don't save the local content if we're loading remotely
	if(!uob(DVS["remotePageContentURL"])){
		$(t_xml).find("config > scenes > scene > page > content").empty()
	}

	var config_xml_string = new XMLSerializer().serializeToString(t_xml)
	var lzString = LZString.compress(config_xml_string)

	//Use JSON to store more than one configuration
	var decisionzLocalStorageJson = ""
	if(localStorage.decisionz.length > 0){
		decisionzLocalStorageJson = JSON.parse(localStorage.decisionz)
	}

	decisionzLocalStorageJson[localStorageName] =  lzString

	var decisionzLocalStorageJson_stringified =
										 JSON.stringify(decisionzLocalStorageJson)
	localStorage.decisionz = decisionzLocalStorageJson_stringified


	if(params["debug"] != undefined){
		console.log("config write to " + localStorageName 
													+ ": " + config_xml_string.length)
		console.log("config write to " + localStorageName 
													+ " compressed : " + lzString.length)
	}

	//Check that it actually saved
	//Todo - this doesn't appear to work for multiple configurations
	if(decisionzLocalStorageJson_stringified.length != 
										localStorage.decisionz.length){
		alert("LocalStorage was not completely stored")
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

	//Added so that you can style based on decision vars
	// (Good for maps, etc)
	//Todo- Move this to ready function
	var jDVsTag = $("#dvs")
	
	//Clean out attributes on dvs tag
	while(jDVsTag[0].attributes.length > 0){
		jDVsTag[0].removeAttribute(jDVsTag[0].attributes[0].name);
	}

	//Create the id attribute
	//Todo - Note that this may momentarily screw up the page builds (css)
	//  should be fixed
	jDVsTag.attr("id", 'dvs'); 

	//Copy all attrs to #dvs 
	decisionVars.find("> variable").each(function(i,v){
		if($(v).attr("value") != undefined){
			DVS[$(v).attr("name")] = $(v).attr("value")

			//Only add to dvs tag if this ISN'T Json
			try{
				a=JSON.parse($(v).attr("value"));
			}catch(e){
				jDVsTag.attr($(v).attr("name"),$(v).attr("value"))
			}
		}else{
			jDVsTag.attr($(v).attr("name"),"")
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

function handleDVDefaults(){
	//loop through decisionVars_defaults_snippet
	$("#decisionVars_defaults_snippet").find("> variable").each(function(i,v){
		if(DVS[$(v).attr("name")] == undefined ){
			if($(v).attr("value") == undefined){
				//If dv is not present and there is no value 
				//  then create the dv and set the value to ""
				setDV($(v).attr("name"), "")
			}else{
	//Todo - It might be worth it to copy all other attributes as well if present
				//If dv is not present and there is a default 
				//  value then create the dv and set the value
				setDV($(v).attr("name"), $(v).attr("value"))
				
			}
		}

		if($(v).attr("undefined_error") != undefined){
			//If a dv has undefined_error attr then show dialog if not found or length 0
			if(DVS[$(v).attr("name")] == undefined){
				alert("DV undefined_error: " + $(v).attr("name"))
				return
			}		
		}

		if($(v).attr("zero_length_error") != undefined){
			if(uob(DVS[$(v).attr("name")])){
				alert("DV zero_length_error: " + $(v).attr("name"))
				return
			}
		}
	})
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
	$(xml).find("config page:not([type='pageForward'])").each(function(i,v){
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
	localStorage.decisionz = "";
}

function loadIFrame(source){
	var jIframe = $($("#iframe_snippet").html())
	jIframe.attr("src", source)
	//Todo - update for multiple stages
	$(currentStage.pageContent).find("iframe").remove()
	$(currentStage.pageContent).append(jIframe)
}


function loadClickMatte(name){
	//Todo - use something like DVS['SoundMediaPath'] to set scene path. Note this is a repeated todo.
	$("#backgroundImage").attr("src","../scenes/" + name + "/background.png")
	$("#backgroundClickMatte").attr("src","../scenes/" + name + "/matte.png")
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
	currentStage = []

	currentStage.name = name

	//Clearing vals with defaultStage. 
	//Note that this allows you to only create the vars you need for that
	// particular stage. All the other vals are the ones used by defaultStage.
	//Note - This may cause issues with previous[Page/Scene/Location]
	$.each(JSON.parse(DVS["defaultStage"]), function(k,v){
		currentStage[k] = v
	})

	$.each(JSON.parse(DVS[name]), function(k,v){
		currentStage[k] = v
	})
}

////////////////////////////////////////////////
// Clickmatte
////////////////////////////////////////////////
function clickMatte_mouseMove(e){
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

function onUnload(){
	WriteDecisionVarsToLocalStorage()
}