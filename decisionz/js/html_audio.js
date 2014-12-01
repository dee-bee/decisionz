function audioInit(id){
	$("#" + id).html('<audio width="0" height="0" ></audio>')
	return $("#" + id + " > audio")[0]
}

function loadHTMLAudio(filenameMinusExt, mediaDir, id, loop){
	var loopText = ""
	
	if(loop == true){
		loopText = " loop "
	}
	
	$("#" + id).html('<audio autoplay width="0" height="0" ' + loopText +'></audio>')
	
	var audioPlayer = $("#" + id + " > audio")[0]
	
	var sourceList = "";	
	if(audioPlayer.canPlayType('audio/mpeg') == "true" || 
			audioPlayer.canPlayType('audio/mpeg') == "maybe" ){
		sourceList = sourceList + '<source src="' + mediaDir + 'mp3/'
					+ filenameMinusExt + '.mp3' + '" type="audio/mpeg">';
	}
	
	if(audioPlayer.canPlayType('audio/ogg') == "true" || 
			audioPlayer.canPlayType('audio/ogg') == "maybe" ){
		sourceList = sourceList + '<source src="' + mediaDir + 'ogg/'
					+ filenameMinusExt + '.ogg' + '" type="audio/ogg">';
	}
	
	$(audioPlayer).html(sourceList)
	
	return audioPlayer
}


