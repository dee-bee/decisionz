var params;
var configXml = "sandbox.xml";

$(document).ready(function () {	
	$("#bookmarks").dialog({
		modal: true,
		buttons: {
			Ok: function() {
				$( this ).dialog( "close" );
			}
		}
	});
	
	
	$("#bookmarks").dialog( "close" );
	loadGame();
});

function loadGame(){
	params = getParams(window.location.href);
	
	if(params["configXml"] != null){
		configXml = "config.php?config=" + params["configXml"];
	}	
	
	if(params["forceLocalStorageReset"] != undefined){
		localStorage.decisionz = "";
	}
	
	//Load config
	$.ajax({
	    type: "GET",
	    url: configXml,
	    dataType: "xml",
	    success: parseXml,
	    error: ajaxErrorFunc
	});
	
	updateBookmarksList();	
}

var xml;
var decisionVars;
var currentTimeVar;
var currentSceneVar;
var jCurrentScene;
var currentPageVar;
var jCurrentPage;
var remotePageContentURL = "";

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

function parseXml(t_xml){
	xml = t_xml;
	
	if(localStorage.decisionz != undefined &&
		 localStorage.decisionz.length > 0 &&
		 params["disableLocalStorage"] == undefined){
		$(xml).find("decisionVars").empty().html($($(localStorage.decisionz).html()));
	}
	
	decisionVars = $(xml).find("decisionVars");
	
	start();
}

function start(){
	currentTimeVar = $(decisionVars).find('variable:[name="currentTime"]');
	$("#currentTime").text("Time: " + $(currentTimeVar).attr("value"));
	
	currentSceneVar = $(xml).find("decisionVars variable:[name='currentSceneName']");

	currentPageVar = $(xml).find("decisionVars variable:[name='currentPageName']");
	
	var jRemoteUrl = $(decisionVars).find('variable:[name="remotePageContentURL"]')
	if(jRemoteUrl != undefined){
		remotePageContentURL = jRemoteUrl.attr("value");
	}
	
	
	loadScene(currentSceneVar.attr("value"), currentPageVar.attr("value"))
}

function ajaxErrorFunc(jqXHR, textStatus, errorThrown){
	alert("Error- Can't load config xml.");
}


function loadLocation(name){
	//loop through all scene condtions until you find a match or use the default
	matchFound = false;
	
    var locationTag = $(xml).find("location:[name='" + name + "']");
    
    if(locationTag.length == 0){
    	loadScene(name);
    }else{
	    $(locationTag).find("sceneCondition").each(function(){
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
		}else{
			alert("No location default set, and no sceneCondtions pass");
		}
	}

}

function loadScene(name, pageName){	
	currentSceneVar.attr("value",name);
	
	jCurrentScene = $(xml).find("scene:[name='" + name + "']");
	
	if(pageName != undefined){
		//Loading a bookmark
		loadPage(pageName);		
	}else{
		loadDecisionVars(jCurrentScene);
		loadPage("pageStart");
	}
}

function loadDecisionVars(container){	
	$(container).find("> decisionVar").each(function(){
		var dv = $(decisionVars).find('variable:[name="' + $(this).attr("name") +  '"]');
		if(dv.length > 0){
			dv.attr("value", $(this).attr("value"));
		}else{
			//Need to add a new dv
			$(decisionVars).append($("<variable name='" + $(this).attr("name") + "' " + 
						" value='" + $(this).attr("value") + "'/>"));
		}
	});
}

function writeDecisionVarsToLocalStorage(){
	if(params["disableLocalStorage"] == undefined){
		localStorage.decisionz = new XMLSerializer().serializeToString(
	        $(xml).find("decisionVars")[0]
	    )
	}
}

function nextPageAvailable(){
	if(jCurrentPage.attr("nextPage") != undefined ||
			jCurrentPage.attr("location") != undefined){
		return true;
	}
	
	return false;
}

function decisionClicked(index){
	var decision = jCurrentPage.find("decisions decision")[index];
	if($(decision).attr("nextPage") != undefined){
		loadPage($(decision).attr("nextPage"));
	}else if($(decision).attr("location")){
 		loadLocation($(decision).attr("location"));	
	}	
}

function remotePageContent(text){
	//jCurrentPage.find("content").html($(html).find("#mw-content-text").html());
	
	//alert(html);
	jCurrentPage.find("content").empty().append($(text.replace(/[\[][\[].*[\]][\]]/g,"")));
	constructPage();
}

function constructPage(){
	//Load local content
	var output = "";
	jCurrentPage.find("content *").each(function(){
	    if(!$(this).hasClass("todo")){
	    	output += new XMLSerializer().serializeToString(this);
	    }
	});

	//Load decisions
	var tally = 0;
	jCurrentPage.find("decisions decision").each(function(){
        //Check if this decision should be displayed
        if(checkConditions(this)){
        	output = output + "<button onclick='decisionClicked(" + tally + 
        								")' >" + $(this).attr("label") + "</button><br />";
		}
		tally++;
	});
	
	//If there's some code here then it may be in a CDATA
	output = output.replace("<![CDATA[", "").replace("]]>", "");
	
	//output page
	$("body #pageContent").html(output);

	//Launch a load function if present
	var fn = window[jCurrentScene.attr("name") +  "_" + 
			    	jCurrentPage.attr("id") + "_loaded"];
	if(fn == undefined){
		//second try
		fn = window[capitaliseFirstLetter(
							jCurrentScene.attr("name") +  "_" + 
				    		jCurrentPage.attr("id") + "_loaded"
			    		)
			    	];
	}
	
	if(typeof fn === 'function') {
	    fn();
	}

	writeDecisionVarsToLocalStorage();

	//if audio is present and the narrative is on load the audio
	if(checkDecisionVarI("narration", "true")){
		$("#htmlAudioPlayerDiv").empty().append($('<audio id="audioPlayer" width="0" height="0">' + 
													'<source src="assets/narration/wav/' +
	            											jCurrentScene.attr("name") + '-' + 
	            											jCurrentPage.attr("id") + '.wav"' +
	            											'type="audio/wav"></source>' + 
	            									'</audio>'));
	            
	    document.getElementById('audioPlayer').play();	
   	}
}

//Case insensitive
function checkDecisionVarI(name, value){
	var dv = $(decisionVars).find('variable:[name="' + name + '"]');
	
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
		loadGame();
	}
}

function loadNextPage(){
	if(jCurrentPage.attr("nextPage") != undefined){
		loadPage(jCurrentPage.attr("nextPage"));
	}else if(jCurrentPage.attr("location") != undefined){
		loadLocation(jCurrentPage.attr("location"));	
	}
}

var jCurrentScene;

function loadPage(pageId, fromBookmark){
	currentPageVar.attr("value",pageId);
	
	jCurrentPage = jCurrentScene.find("page:[id='" + pageId + "']");

	if(fromBookmark == undefined){
		loadDecisionVars(jCurrentPage);
	}

	if(jCurrentPage.attr("duration") != undefined){
		var durationTicks = 
			calculateTicksFromTimeString(jCurrentPage.attr("duration")) 
		var currentTimeTicks = 
			calculateTicksFromTimeString($(currentTimeVar).attr("value"));
		
		currentTimeTicks += durationTicks;
		
		$(currentTimeVar).attr("value",
			calculateTimeStringFromTicks(currentTimeTicks));
		
		$("#currentTime").text("Time: " + $(currentTimeVar).attr("value"));
	}

	if(jCurrentPage.attr("type") != undefined &&
			jCurrentPage.attr("type") == "pageForward"){
	    handlePageForward();
	}else{
		if(remotePageContentURL != undefined &&
			remotePageContentURL.length > 0){
			var remotePageUrl = remotePageContentURL + "?title=" + 
			    				jCurrentScene.attr("name") +  ":" + 
			    				jCurrentPage.attr("id");
			    				
			$("#linkToWiki").attr("href", remotePageUrl);
			
			//Load remote content
			$.ajax({
			    type: "GET",
			    url: remotePageUrl + "&action=raw",
			    dataType: "text",
			    success: remotePageContent,
			    error: ajaxErrorFunc
			});
		}else{
			constructPage();
		}
	}
	
	if(nextPageAvailable()){
		$("#nextPageBtn").css("display", "block");
	}else{
		$("#nextPageBtn").css("display", "none");
	}
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
	
	var currentTimeString = $(decisionVars).find('variable:[name="currentTime"]').attr('value');
	var currentTimeTicks = calculateTicksFromTimeString(currentTimeString);
		
	//If this is blank than we probably have a time check
	if($(condition).attr("name") != undefined){
		if($(condition).attr("value") == undefined){
			//This is a check to see if the variable is present
			output = output + "$(decisionVars).find('variable:[name=\"" + $(condition).attr("name") + "\"]').length == 0"
		}else{
			output = output + "$(decisionVars).find('variable:[name=\"" + $(condition).attr("name") + "\"]').length != 0" + 
						" && $(decisionVars).find('variable:[name=\"" + 
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
	matchFound = false;
	
    //loop through page conditions
    jCurrentPage.find("pageCondition").each(function(){
    	if(checkConditions(this)){
    		//Condition passes. Now load appropriate page/scene
    		if($(this).attr("location") != undefined && 
    					$(this).attr("location").length > 0){
    			loadLocation($(this).attr("location"));
    		}else if($(this).attr("nextPage") != undefined && 
    					$(this).attr("nextPage").length > 0){
    			loadPage($(this).attr("nextPage"));
    		}
    		
    		matchFound = true;
    		
    		return false;
    	}
    });
    
    //None of the pageConditions pass so load the default
    if(matchFound){
    	return;
    }
    
    if(jCurrentPage.attr("location") != undefined  && 
    				jCurrentPage.attr("location").length > 0){
		loadLocation(jCurrentPage.attr("location"));
	}else if(jCurrentPage.attr("nextPage") != undefined  && 
					jCurrentPage.attr("nextPage").length > 0){
		loadPage(jCurrentPage.attr("nextPage"));
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

function saveBookmark(){
	var xmlText = new XMLSerializer().serializeToString($(xml).find("decisionVars")[0]);
	$.post('bookmarkPost.php', 
		{ name: $("#bookmarkName").attr("value"), user_id: "1", text: xmlText },
		function() {
			alert("Bookmark Saved");
			updateBookmarksList();
		}
	);
}

function deleteBookmark(id){
	$.ajax({
	    type: "GET",
	    url: "bookmarkDelete.php?id=" + id,
	    dataType: "text",
	    success: deletedBookmark,
	    error: ajaxErrorFunc
	});
}

function deletedBookmark(){
	updateBookmarksList();
}

function parseBookmarksListXml(html){
	$("#bookmarks_container").html(html);
	
	$("#bookmarks a").each(function(){
		var link = $(this).attr("href");
		$(this).attr("href","javascript:loadBookmark('" + link + "')");
	});
}

function updateBookmarksList(){
	if(params["offline"] == "true"){
		$("#saveBookmark").css("display", "none");
	}else{
		$.ajax({
		    type: "GET",
		    url: "bookmarksList.php?user_id=1",
		    dataType: "html",
		    success: parseBookmarksListXml,
		    error: ajaxErrorFunc
		});
	}
}

function parseBookmarkXml(dec_xml){
	$(xml).find("decisionVars").empty().
		append($($(dec_xml).find("decisionVars").children()));
	
	start();
	//alert(new XMLSerializer().serializeToString(dec_xml));
}

function loadBookmark(val){
	$.ajax({
	    type: "GET",
	    url: val,
	    dataType: "xml",
	    success: parseBookmarkXml,
	    error: ajaxErrorFunc
	});	
}

function manageBookmarks(){
	$("#bookmarks").dialog( "open" );
}

