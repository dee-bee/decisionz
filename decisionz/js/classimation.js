//loadAnimation("../animations/falconTerraEdgarDecideToRescueLocke.xml", true)

var animXml

function loadAnimation(filename, callback){	
	//Load xml
	$.ajax({
			type: "GET",
			async: false,
			url: filename,
			dataType: "xml",
			success: function( t_xml ) {
						animXml = t_xml
						
						loadHTML()
					}
		});
}

var htmlLoaded = false

function loadHTML(){
	var animScene = $(animXml).find("scene")[0]
	
	if(!htmlLoaded && $(animScene).attr("loadhtml") != undefined){
		//Load html
		htmlLoaded = true
		
		var selector = "#main"

		if($(animScene).attr("selector") != undefined){
			selector = $(animScene).attr("selector")
		}

		$.ajax({
			type: "GET",
			async: false,
			url: $(animScene).attr("loadhtml"),
			dataType: "text",
			success: function( text ) {
						$(selector).replaceWith(text)
					}
		});
	}
}

function playFrame(index, selector, keyframeNode){
	//Sprite
	$(selector).removeClass()
	
	console.log("classimation: " + new Date().getTime() 
						+ " selector=" + selector 
						+ " : class=" + $(keyframeNode).attr('class'))
						
	$(selector).addClass($(keyframeNode).attr('class'))
	
	if($(keyframeNode).attr("audio") != undefined){
		var loop = false
		
		if($(keyframeNode).attr("loop") != undefined){
			loop = true
		}
		
		loadHTMLAudio($(keyframeNode).attr("audio"), "", "htmlAudioPlayerDiv",loop)
		//$("audio")[0].play()
	}
}

function playAnimationGroup(groupNode){
	var time = 0
	var selector = $(groupNode).attr("selector")
	
	$(groupNode).find("keyframe").each(function(i,v){
		if(parseInt($(v).attr("starttime")) == 0){
			playFrame(i,selector,v)
		}else{
			var timer = new Timer(function(){playFrame(i,selector,v)}, parseInt($(v).attr("starttime")))
		}
	})
}

//var numAnimations = 0
var finishedCallback 
var currentAnimName
var animationPlaying = false

function playAnimation(id, callback){
	if(animationPlaying){
		alert("playAnimation called before prior animation is finished.")
		return
	}
	
	animationPlaying = true
	
	currentAnimName = id
	
	console.log("classimation: " + new Date().getTime() + " Play animation: " + id)
	
	if(callback != undefined){
		finishedCallback = callback
	}else{
		finishedCallback = undefined
	}
	
	//numAnimations = 0
	//todo
	var play = true
	
	var animNode = $(animXml).find("scene > animation[id='" 	
													+ id + "']")
	
	$(animNode).find("group").each(function(i,v){
		//numAnimations++
		playAnimationGroup(v)
	})
	
	//Set callback that animation is finished
	if($(animNode).attr("endtime") == undefined){
		alert("no endtime for animation found")
	}else{
		var timer = new Timer(function(){animationFinished()}, 
							$(animNode).attr("endtime"))
		
		//setTimeout(function(){animationFinished()}, 
		//				$(animNode).attr("endtime"));
	}
}


function animationFinished(){
	//numAnimations--

	var animNode = $(animXml).find("scene > animation[id='" 	
									+ currentAnimName + "']")
	animationPlaying = false

	if($(animNode).attr("next_anim") != undefined){
		playAnimation($(animNode).attr("next_anim"), finishedCallback)
	}else if(finishedCallback != undefined){
		 finishedCallback()
	}

	//if(numAnimations == 0){
		//animationsFinished()
	//}
}

function animationsFinished(){
	//todo
}

function pauseAnimations(){
	$("#animContainer").css("-webkit-animation-play-state", "paused")
	$("#animContainer").css("animation-play-state", "paused")
	
	$("#animContainer *").css("-webkit-animation-play-state", "paused")
	$("#animContainer *").css("animation-play-state", "paused")
}

function unpauseAnimations(){
	$("#animContainer").css("-webkit-animation-play-state", "")
	$("#animContainer").css("animation-play-state", "")
	
	$("#animContainer *").css("-webkit-animation-play-state", "")
	$("#animContainer *").css("animation-play-state", "")
}


function togglePaused(){
	if($("#animContainer").css("animation-play-state") == "paused" ||
		$("#animContainer").css("-webkit-animation-play-state") == "paused"){
		unpauseAnimations()
	}else{
		pauseAnimations()
	}
}
