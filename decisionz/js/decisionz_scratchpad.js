function loadXmlToDom(){
    $("body").append($("<div id='xml' style='display:none;'></div>"))
    $("#xml").append($(xml).find("config"))
}

function appendBlankScene(){
    $("#xml").find(">config > scenes").append("<scene name='changeMe'></scene>")
}

function getConfigXml(){
    return new XMLSerializer().serializeToString(xml)
}

var scaleTimelineFactor = 1500000

function generateTimelineTable(){
    $("#pageXMLEditorDialog").empty()
    
    
    generateTimelineRow("Days", [
                Math.floor(calculateTicksFromTimeString("0000-00-01 00:00:00")/scaleTimelineFactor),
                Math.floor((calculateTicksFromTimeString("0000-00-02 00:00:00") 
                          - calculateTicksFromTimeString("0000-00-01 00:00:00"))/scaleTimelineFactor),
                Math.floor((calculateTicksFromTimeString("0000-00-03 00:00:00") 
                          - calculateTicksFromTimeString("0000-00-02 00:00:00"))/scaleTimelineFactor),
                Math.floor((calculateTicksFromTimeString("0000-00-04 00:00:00") 
                          - calculateTicksFromTimeString("0000-00-03 00:00:00"))/scaleTimelineFactor)
            ])
    
    $(xml).find("pagecondition condition[startTime]").each(function(i,v){
        var startTimeWidth = 0
        if($(v).attr("startTime") != undefined){
            startTimeWidth = Math.floor(calculateTicksFromTimeString($(v).attr("startTime"))/scaleTimelineFactor)
        }
        
        if(isNaN(startTimeWidth)){
            startTimeWidth = 0
        }

        var endTimeWidth = 0
        if($(v).attr("endTime") != undefined){
             endTimeWidth = Math.floor((calculateTicksFromTimeString($(v).attr("endTime"))
                                    - startTimeWidth)/scaleTimelineFactor)
        }else{
            endTimeWidth = 228 - startTimeWidth
        }
    
        if(isNaN(endTimeWidth)){
            endTimeWidth = 228 - startTimeWidth
        }
        
        var jPagecondition = $(v).closest("pagecondition")
        var jScene = $(v).closest("scene")

        var pgName = jPagecondition.attr("nextpage")
        if(pgName == undefined){
            pgName = jPagecondition.attr("location")
        }

        generateTimelineRow(pgName, [startTimeWidth, endTimeWidth])
    })
}

function generateTimelineRow(caption, arrayOfElems){
    var color = ["blue", "red", "orange", "yellow", "green"]
    
    var jP = $("<p style='clear:both;'>")
    

    jP.append("<span style='width:400px;float:left;'>" + caption +  "</span>")

    $.each(arrayOfElems, function(i,v){
        jP.append("<span style='height:20px;;float:left;width:" + v + "px;background-color:" + color[i] + ";'></span>")
    })
    
    
    $("#pageXMLEditorDialog").append(jP)
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
