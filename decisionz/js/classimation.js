//loadAnimation("../animations/falconTerraEdgarDecideToRescueLocke.xml", true)
export class Classimation {
  constructor(url, callback){
    this.animXml = undefined
    this.htmlLoaded = false
    this.finishedCallback = undefined
    this.currentAnimName = undefined
    this.animationPlaying = false
    this.stepMode = false

    if(url != undefined){
      this._load(url,callback)
    }
  }

  _load(filename, callback){
		//todo - do we need the callback?

		if(filename == undefined){
			alert("unable to load classimation. Url undefined")
			return
		}
		
		var thisVar = this;

		//Load xml
    fetch(filename, options)
		$.ajax({
				type: "GET",
				async: false,
				dataType: "xml",
				success: function( t_xml ) {
							thisVar.animXml = t_xml
							thisVar._parseAnimation()
						}
			});
	}

  _parseAnimation(){
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
	}

	_playFrame(index, selector, keyframeNode){
		//Sprite
		$(selector).removeClass()

		console.log("classimation: " + new Date().getTime() 
							+ " selector=" + selector 
							+ " : class=" + $(keyframeNode).attr('class'))

		if($(keyframeNode).attr('transition_class') != undefined){
			$(selector).addClass($(keyframeNode).attr('transition_class'))
		}

		$(selector).addClass($(keyframeNode).attr('class'))
	}

	_playAnimationGroup(groupNode){
		var time = 0
		var selector = $(groupNode).attr("selector")

		var thisVar = this
		$(groupNode).find("keyframe").each(function(i,v){
			if(parseInt($(v).attr("starttime")) == 0){
				thisVar._playFrame(i,selector,v)
			}else{
				if(!thisVar.stepMode){
					var timer = new Timer(function(){
								thisVar._playFrame(i,selector,v)
							}, parseInt($(v).attr("starttime")))
				}
			}
		})
	}

	playAnimation(id, callback, t_stepMode){
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
			thisVar._playAnimationGroup(v)
		})

		//Set callback that animation is finished
		if($(animNode).attr("endtime") == undefined){
			alert("no endtime for animation found")
		}else{
			if(!this.stepMode){
				var timer = new Timer(function(){
									thisVar._animationFinished()}, 
								$(animNode).attr("endtime"))
			}
		}
	}

	_animationFinished(){
		//numAnimations--

		var animNode = $(this.animXml).find("scene > animation[id='" 	
										+ this.currentAnimName + "']")
		this.animationPlaying = false

		if($(animNode).attr("next_anim") != undefined){
			this._playAnimation($(animNode).attr("next_anim"), this.finishedCallback)
		}else if(this.finishedCallback != undefined){
			 this.finishedCallback()
		}

		//if(numAnimations == 0){
			//this._animationsFinished()
		//}
	}

	_animationsFinished(){
		//todo
	}


}


class Timer {
  constructor(callback, delay){
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