//loadAnimation("../animations/falconTerraEdgarDecideToRescueLocke.xml", true)

function Classimation(url, callback){
	if(url != undefined){
		this.load(url,callback)
	}
}

Classimation.prototype = {
	animXml:undefined,
	htmlLoaded: false,
	finishedCallback: undefined,
	currentAnimName: undefined,
	animationPlaying: false,
	stepMode: false,

	load: function(filename, callback){	
		//todo - do we need the callback?

		if(filename == undefined){
			alert("unable to load classimation. Url undefined")
			return
		}
		
		var thisVar = this;

		//Load xml
		$.ajax({
				type: "GET",
				async: false,
				url: filename,
				dataType: "xml",
				success: function( t_xml ) {
							thisVar.animXml = t_xml
							thisVar.parseAnimation()
						}
			});
	},

	parseAnimation: function(){
		var animScene = $(this.animXml).find("scene")[0]

		if(!this.htmlLoaded && $(animScene).attr("loadhtml") != undefined){
			//Load html
			this.htmlLoaded = true

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
	},

	playFrame: function(index, selector, keyframeNode){
		//Sprite
		$(selector).removeClass()

		console.log("classimation: " + new Date().getTime() 
							+ " selector=" + selector 
							+ " : class=" + $(keyframeNode).attr('class'))

		if($(keyframeNode).attr('transition_class') != undefined){
			$(selector).addClass($(keyframeNode).attr('transition_class'))
		}

		$(selector).addClass($(keyframeNode).attr('class'))
	},

	playAnimationGroup: function(groupNode){
		var time = 0
		var selector = $(groupNode).attr("selector")

		var thisVar = this
		$(groupNode).find("keyframe").each(function(i,v){
			if(parseInt($(v).attr("starttime")) == 0){
				thisVar.playFrame(i,selector,v)
			}else{
				if(!thisVar.stepMode){
					var timer = new Timer(function(){
								thisVar.playFrame(i,selector,v)
							}, parseInt($(v).attr("starttime")))
				}
			}
		})
	},

	playAnimation: function(id, callback, t_stepMode){
		if(t_stepMode != undefined){
			this.stepMode = t_stepMode
		}

		if(this.animationPlaying){
			alert("playAnimation called before prior animation is finished.")
			return
		}

		this.animationPlaying = true

		this.currentAnimName = id

		console.log("classimation: " + new Date().getTime() + " Play animation: " + id)

		if(callback != undefined){
			this.finishedCallback = callback
		}else{
			this.finishedCallback = undefined
		}

		//numAnimations = 0
		//todo
		var play = true

		var animNode = $(this.animXml).find("scene > animation[id='" 	
														+ id + "']")

		var thisVar = this;
		$(animNode).find("group").each(function(i,v){
			//numAnimations++
			thisVar.playAnimationGroup(v)
		})

		//Set callback that animation is finished
		if($(animNode).attr("endtime") == undefined){
			alert("no endtime for animation found")
		}else{
			if(!this.stepMode){
				var timer = new Timer(function(){
									thisVar.animationFinished()}, 
								$(animNode).attr("endtime"))
			}
		}
	},

	animationFinished: function(){
		//numAnimations--

		var animNode = $(this.animXml).find("scene > animation[id='" 	
										+ this.currentAnimName + "']")
		this.animationPlaying = false

		if($(animNode).attr("next_anim") != undefined){
			this.playAnimation($(animNode).attr("next_anim"), this.finishedCallback)
		}else if(this.finishedCallback != undefined){
			 this.finishedCallback()
		}

		//if(numAnimations == 0){
			//animationsFinished()
		//}
	},

	animationsFinished: function(){
		//todo
	}
}

/*function pauseAnimations(){
	//Todo - Pause the animation group (not just the individual animation)
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
}*/