function generateESpeakScript(){
	$(xml).find("scene").each( function(){
	    var sceneName = $(this).attr("name");
	    
	    $(this).find("page").each( function(){
	        var pageName = $(this).attr("id");
	        
	        var content = new XMLSerializer().serializeToString(
	                                        $(this).find("content")[0]
	                                    );
	
		content = content.replace(/"/g, ' quote ').
							replace(/(\n)+/g, ' ').
							replace(/[ ]+/g, " ").
							replace(/(\t)+/g, " ");        
	
	        console.log("espeak -m -v en \"" + 
	                    content + 
	                    "\" -w " + 
	                    sceneName + "-" + pageName + 
	                    ".wav -p 10 \n");
	    });
	});
}