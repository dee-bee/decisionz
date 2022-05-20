//todo
//this.writeToLocalStorageOnlyOnPageLoad = false
import 
export class Decisionz {
  constructor(l_params){
    this._DAY_INDEX = 3;
    this._HOUR_INDEX = 4;
    this._MIN_INDEX = 5;
    this._SEC_INDEX = 6;
    this._TICKS_PER_SEC = 1000;
    this._TICKS_PER_MIN = 60 * this.TICKS_PER_SEC;
    this._TICKS_PER_HOUR = 60 * this.TICKS_PER_MIN;
    this._TICKS_PER_DAY = 24 * this.TICKS_PER_HOUR;

    this._iso = /^(\d{4})-(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{1,2}):(\d{1,2})$/;

    this._clickLock = false

    this._multiplayerPostQueue = ""
    this._ajaxRequestPending = false

    this._pageLoaded_lock = false
    this._pageLoaded_stagesArrLength
    this._pageLoaded_calledNumTimes
    this._pageLoaded_initialStageName 

    this._params = l_params
    
    this._configXmlFilename = "../configs/sandbox.xml";
    this._xml;
    this._decisionVars;
    this._DVS = []

    this._jCurrentScene
    this._jCurrentPage
    
    this._localStorageName
    
    this._sceneReturnObj
    this._matchFound = false
    this._routeMode = false

    //Click matte vars
    this._mouseX
    this._mouseY
    this._jContentContainer
    this._matteCanvas
    this._canvasContext
    this._jBody
    this._lastDate = Date.now()

    this._classimation1 = new Classimation()

    this._currentStage = {
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

    this._origAlert = alert
    alert = function(mesg) {
      console.trace(mesg)
      origAlert(mesg)
    }

    this._x2js = new X2JS()

    this._configAlreadyLoaded = false
    
    //Todo need to fix this
    //audioInit();
      
    window.onfocus = function() {
        //unpauseAudio()
    };

    window.onblur = function() {
        pauseAudio()
    };

    this._jContentContainer = $("#contentContainer")
    this._matteCanvas = document.getElementById("backgroundClickMatteCanvas")
    this._canvasContext = this._matteCanvas.getContext('2d');
    this._jBody = $("body")
    $(document).mousemove(this._clickMatte_mouseMove)

    //Todo make this a hiearchy of loading css's based on json
    if(this._params["css"] != undefined){
      var cssArr = unescape(this._params["css"]).split(",")

      for(var i=0; i< cssArr.length; i++){
        this._loadjscssfile(cssArr[i], "css")
      }
    }else{
      this._loadjscssfile("../css/gameLauncher.css", "css")
    }

    if(this._params["debug"] != undefined){
      $("body").attr("debug", "true")
    }

    //todo - make sure this works with overridden localStorageName param
    if(this._params["configXmlFilename"] != null){
      if(this._params["databaseConfig"] != null){
        this._configXmlFilename = "config.php?config=" + this._params["configXmlFilename"];	
      }else{
        this._configXmlFilename = this._params["configXmlFilename"];		
      } 
    }

    if(this._params['localStorageName'] != undefined){
      this._localStorageName = this._params['localStorageName']
    }else{
      this._localStorageName = this._configXmlFilename
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
    
    this._loadGame();
  }

  _loadGame(){
    //Create localStorage for decisionz if not already there
    if(this._uob(localStorage.decisionz)){
      localStorage.decisionz = "{}"
    }

    var decisionzLocalStorageJson = JSON.parse(localStorage.decisionz)

    //If decisionz localStorage isn't empty then load from it
    //Othewise attempt to load from config file
    if(!this._uob(decisionzLocalStorageJson[this._localStorageName])){
      this._configAlreadyLoaded = true

      //todo - handle for compression if necessary
      this._parseXml(LZString.decompress(decisionzLocalStorageJson[this._localStorageName]))
    }

    if(!this._configAlreadyLoaded){
      //Load config
      $.ajax({
          type: "GET",
          url: unescape(this._configXmlFilename),
          dataType: "text",
          success: this._parseXml,
          error: this._ajaxErrorFunc
      });
    }
  }

  _parseXml(text_xml){
    //If the line starts with [[ then remove it
    while(text_xml.match(".*\n")[0].match("^[ ]*[\[][\[]") != undefined){
      text_xml = text_xml.substr(text_xml.match(".*\n")[0].length, text_xml.length)
    }
    
    this._xml = (new window.DOMParser()).parseFromString(text_xml, "text/xml")

    if($(this._xml).find("parsererror").length > 0){
      alert("Error parsing xml in parseXml function")
      return 
    }

    this._decisionVars = $(this._xml).find("config > decisionvars")

    if(this._decisionVars.length == 0){
      //This config file has no decisionVars tag, so create it
      $(this._xml).find("config").append($("<decisionvars></decisionvars>"))
      this._decisionVars = $(this._xml).find("config > decisionvars")
    }

    this._convertXMLtoNewFormat()
    
    //todo move this to a function so that we can specify levels of decisionvars
    
    this._updateDVS()	

    this._handleDVDefaults()

    //Load dv_ url params
    //Todo - Add JSON support
    var paramsKeys = Object.keys(this._params)
    
    if(!this._configAlreadyLoaded){ //Config was not loaded from localStorage
      for(var i=0; i < paramsKeys.length; i++){
        var key = paramsKeys[i]
        if(key.substr(0,"dv_".length) == "dv_"){
          //This param is used to set a decision var
          console.log("DV url parm found:" + key)
          this._setDV(key.substr("dv_".length, key.length), this._params[key])
        }
      }
    }
    
    if(this._checkDecisionVarI("music", "true")){
      $("body").attr("music", "true")
      $("#checkbox_musicOn").attr("checked", "checked")
    }else{
      $("#checkbox_musicOn").removeAttr("checked")
    }
    
    if(this._checkDecisionVarI("narrationAudio", "true")){
      $("body").attr("narration_audio", "true")
      $("#checkbox_narrationAudioOn").attr("checked", "checked")
    }else{
      $("#checkbox_narrationAudioOn").removeAttr("checked")
    }
      
    $("#linkToConfigFile").attr("href", unescape(this._configXmlFilename))

    if(this._params["SoundMediaPath"] != null){
      this._setDV("SoundMediaPath",this._params["SoundMediaPath"])
    }else{
      //Nothing set on url so set a default value if the dv is blank
      if(this._uob(this._DVS["SoundMediaPath"])){
        this._setDV("SoundMediaPath","../")
      }
    }

    if(this._params["multiplayerUserId"] != null){
      this._setDV("multiplayerUserId",this._params["multiplayerUserId"])
    }

    if(this._params["multiplayerSessionId"] != null){
      this._setDV("multiplayerSessionId",this._params["multiplayerSessionId"])
    }
    
    if(this._params['currentCharacter'] != undefined){
      this._setDV("currentCharacter",this._params["currentCharacter"])
    }	

    if(this._checkDecisionVarI("disableDialog", "true")){
      $("body").attr("disableDialog", "true")
      $("#checkbox_disableDialog").attr("checked", "checked")
    }else{
      $("#checkbox_disableDialog").removeAttr("checked")
    }

    this._loadBookmarksList()
    
    //todo
    /*if(writeToLocalStorageOnlyOnSceneLoad == "true"){
      WriteDecisionVarsToLocalStorage()
    }*/
    
    this._updateDVS()
    
    this._start();
    
    if(this._DVS['multiplayerMode'] == "true"){
      //We're in multiplayer mode
      this._multiplayerQueueClear()
      setInterval(() => {this._multiplayerLoop()},5000)
    }
  }

  _start(){ 
    this._setState("main")
    
    //Note/Todo - Just loading the first stage will trigger the other stages to load
    var stageOneName = this._DVS['activeStages'].split(",")[0]
    this._loadStage(stageOneName)

    this._updateTimeDiv();

    //Fix for issue where on reload previousSceneName is messed up
    var currentSceneName = this._DVS[this._currentStage.currentSceneName]

    if(currentSceneName == undefined){
      alert("No currentSceneName set")
    }

    this._setDV(this._currentStage.currentSceneName, this._DVS[this._currentStage.previousSceneName])

    this._loadScene(this._currentSceneName, this._DVS[this._currentStage.currentPageName])
  }

  ////////////////////////////////////////////////
  // Page Loading
  ////////////////////////////////////////////////
  _loadLocation(name){
    //loop through all scene condtions until you find a match or use the default
    this._matchFound = false;
    
    //Todo do we need the ":" after "location:"?
    var locationTag = $(this._xml).find("config > locations > location:[name='" + name + "']");
      
    this._setDV(this._currentStage.previousLocationName, this._DVS[this._currentStage.currentLocationName])
    this._setDV(this._currentStage.currentLocationName, name)

    if(locationTag.length == 0){
      this._loadScene(name);
    }else{
      $(locationTag).find("> scenecondition").each(function(){
        if(_checkConditions(this)){ //todo needs to be fixed
          //Condition passes. Now load appropriate page/scene
          if($(this).attr("setScene") != undefined && 
                $(this).attr("setScene").length > 0){
            loadScene($(this).attr("setScene"));
          }
          
          this._matchFound = true;
          
          return false;
        }
      });
      
      if(this._matchFound){
        return;
      }
      
      //None of the sceneConditions pass so load the default
      if($(locationTag).attr("location") != undefined  && 
              $(locationTag).attr("location").length > 0){
        this._loadScene($(locationTag).attr("location"));
      }else if($(this._xml).find("config > scenes > scene:[name='" + 
              $(locationTag).attr("name") + 
              "']") != undefined ){
        this._loadScene($(locationTag).attr("name"));
      }else{
        alert("No location default set, and no sceneCondtions pass");
      }
    }
  }

  _loadScene(name, pageName){
    this._setDV(this._currentStage.previousSceneName, this._DVS[this._currentStage.currentSceneName])
    this._setDV(this._currentStage.currentSceneName, name)

    $("#backgroundImage").attr("src","")
    $("#backgroundClickMatte").attr("src","")
      
    this._jCurrentScene = $(this._xml).find("config > scenes > scene:[name='" + name + "']");
    
    //Don't load any music, page content, or templates in routeMode
    if(!this._routeMode){
      //Todo - update for multiple stages
      //Todo - Can we remove this line?
      //$("#pageContainer").html($("#pageContent_snippet").html())
      
      this._loadMusic(this._jCurrentScene.attr("music"));
      this._unpauseAudio()
    
      if(this._jCurrentScene.attr("loadClassimation")){
        this._classimation1.load(this._jCurrentScene.attr("loadClassimation"))
      }
    
      if(this._jCurrentScene.attr("loadIFrameTemplate")){
        this._loadIFrame(this._jCurrentScene.attr("loadIFrameTemplate"))
      }

      if(!this._uob(this._jCurrentScene.attr("click_matte"))){
        $("#backgroundImage").removeClass("hidden")
        $("#backgroundClickMatte").removeClass("hidden")
        this._loadClickMatte(this._jCurrentScene.attr("click_matte"))
      }else if(!this._uob(this._jCurrentScene.attr("scenetype"))
            && this._jCurrentScene.attr("scenetype") == "SimpleClickMatte"){
        $("#backgroundImage").removeClass("hidden")
        $("#backgroundClickMatte").removeClass("hidden")
        this._loadClickMatte(this._jCurrentScene.attr("name"))
      }else if(!this._uob(this._jCurrentScene.attr("background"))){
        //Todo - Use a variable to set the path to the scenes dir not "../"
        $("#backgroundImage").attr("src","../scenes/" 
                        + this._jCurrentScene.attr("background") 
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
      this._loadPage(pageName);		
    }else{
      this._loadDecisionVars(this._jCurrentScene);
      this._loadPage("pageStart");
    }
  }

  _remotePageContent(text){
    //alert(html);
    this._jCurrentPage.find("> content").empty().append($(text.replace(/[\[][\[].*[\]][\]]/g,"")));
    this._generatePage();
  }

  _recursiveGenerateDynamicContent(jContentTag, jDecisionsTag){
    //loop through dynamics
    jContentTag.find("> dynamic").each((i,v) => { 
      if(this._checkConditions($(v))){
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
        this._recursiveGenerateDynamicContent(jContent, jDecisionsTag)
      }else{
        //no match so remove the node
        $(v).remove()
      }
    })
  }

  _handleDynamicContent(jPage){
    var jContentTag = jPage.find("> content")
    var jDecisionsTag = jPage.find("> decisions")

    this._recursiveGenerateDynamicContent(jContentTag, jDecisionsTag)
  }

  _handlePrintTags(jCurrentTag){
    //Loop through print tags
    jCurrentTag.find("print").each((i,v) => {
      var jV = $(v)

      if(jV.attr("dvname") != undefined){
        jV.replaceWith(this._DVS[jV.attr("dvname")])
      }
    })

    return jCurrentTag
  }

  _generatePage(){
    //Load local content
    var output = "";
    
    //Assign id's to all decisions in page
    this._jCurrentPage.find("decisions > decision").each(function(i,v){
      if($(v).attr("id") == undefined){
        var rand = Math.random().toString()
        rand = rand.substr(2,rand.length)
        $(v).attr("id", rand)
      }		
    })

    //Todo - rethink how you're doing the "undefined" tests.
    //   Instead move to a smarter function to check
    var jResultPage = this._jCurrentPage.clone()
    if(jResultPage.attr("dontLoadContent") == undefined){
      //Remove the todo sections
      jResultPage.find(".todo").remove()

      this._handleDynamicContent(jResultPage)
      this._handlePrintTags(jResultPage)
      output = new XMLSerializer().serializeToString(jResultPage.find("> content")[0])
    }

    //Todo1 - Think through "dontLoadContent" for conditional content

    //Load decisions
    //Todo - Handle for decisions in output
    jResultPage.find("> decisions > decision").each(function(i,v){
          //Check if this decision should be displayed
          if(checkConditions(this)){ //Todo - Fix the this reference
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

    $(this._currentStage.pageContent).html(output);

    //Actually creates a script tag. Just testing out this feature
    if(scriptTag.length > 0){	
      var script   = document.createElement("script");
      script.type  = "text/javascript";
      script.text  = scriptTag.text()              // use this for inline script
      $(this._currentStage.pageContent)[0].appendChild(script);
    }

    //Todo - remove this
    var jNarrationLog = this._jDV("narrationLog")
    if(jNarrationLog.length == 0 ||
      jNarrationLog.html().length == 0){
      if(this._params["debug"] != undefined){
        //todo- put this as a label
        //alert("narrationLog is empty")
      }
      
      this._setDV("narrationLog", "")
    }

    //Doesn't seem to work on IOS
    //jDV("narrationLog").append(output)
    if(this._currentStage["disableNarrationLog"] == undefined){
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

      this._pageLoaded()
    }else if(jResultPage.attr('loadJS') != undefined){
      var remotePageUrl = ""
      
      //Todo - Does this handle for writing to decision vars or pageLoaded?
      //Todo - Handle for loading locally. 
      if(jResultPage.attr('loadJS') == ""){
        //Generate the page name automatically
        remotePageUrl = this._DVS["remotePageContentURL"] + "?title=JS_" + 
                    this._jCurrentScene.attr("name") +  ":" + 
                    jResultPage.attr("id");

      }else{
        //Generate the page name automatically
        remotePageUrl = this._DVS["remotePageContentURL"] + "?title=" + 
                  jResultPage.attr('loadJS')
      }
      
      $.ajax({
        type: "GET",
        async: false,
        url: remotePageUrl + "&action=raw",
        dataType: "text",
        success: this._generatePage_part2,
        error: this._ajaxPageErrorFunc
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
          this._classimation1.playAnimation(jResultPage.attr("classimation")
            , () => {
              this._loadPage(jResultPage.attr("classimationNextPage"))
            })
        }else{
          this._classimation1.playAnimation(jResultPage.attr("classimation"))
        }
      }

      this._loadMusic(jResultPage.attr("music"));
      this._loadNarrationAudio(this._jCurrentScene.attr("name"), jResultPage.attr("id"))
      this._unpauseAudio()

      this._pageLoaded()
    }

  }

  _pageLoaded(){
    if(this._pageLoaded_lock == true){
      this._pageLoaded_calledNumTimes++
      if(this._pageLoaded_calledNumTimes == this._pageLoaded_stagesArrLength - 1){
                        //Minus 1 because the first stage
                        //was already loaded when pageLoaded
                        //was originally called
        //We just finished the last stage load so write the vars
        this._WriteDecisionVarsToLocalStorage()
        this._pageLoaded_lock = false
      }
    }else{
      this._pageLoaded_initialStageName = this._currentStage.name

      this._pageLoaded_stagesArrLength = this._DVS['activeStages'].split(",").length

      //Are there more stages
      if(this._pageLoaded_stagesArrLength > 1){
        //Prevents recursion
        this._pageLoaded_lock = true
        this._pageLoaded_calledNumTimes = 0

        //Refresh the other stages (Note - don't get caught in infinite loop!)
        $.each(this._DVS['activeStages'].split(","), (i,v) => {
          if(this._pageLoaded_initialStageName == v){
            //No need to reload this stage so just exit
            return
          }

          this._loadStage(v)

          this._updateTimeDiv();

          //Fix for issue where on reload previousSceneName is messed up
          var currentSceneName = this._DVS[this._currentStage.currentSceneName]

          if(currentSceneName == undefined){
            alert("No currentSceneName set")
          }

          this._setDV(this._currentStage.currentSceneName, this._DVS[this._currentStage.previousSceneName])

          this._loadScene(currentSceneName, this._DVS[this._currentStage.currentPageName])
        })
      }
    }		
  }

  _generatePage_part2(text){
    //Todo- do we need this
    eval(text)
    
    //Launch a load function if present
    if(this._sceneReturnObj != undefined && 
      this._sceneReturnObj.initPageScript != undefined) {
        this._sceneReturnObj.initPageScript()
    }

    //todo
    /*if(writeToLocalStorageOnlyOnSceneLoad != "true" &&
        jCurrentScene.attr(
          "disableLocalStorageWritesOnPageLoad") == undefined){
      WriteDecisionVarsToLocalStorage()
    }*/


    if(this._DVS["dontLoadContent"] == undefined 
        && this._jCurrentPage.attr("dontLoadContent") == undefined){ 
      //todo We need to define further what dontLoadContent is
      this._loadNarrationAudio(this._jCurrentScene.attr("name"), this._jCurrentPage.attr("id"))
      this._loadMusic(this._jCurrentPage.attr("music"));
      this._unpauseAudio()
    }
    
    if(this._jCurrentPage.attr("onload") != undefined){
      eval(this._jCurrentPage.attr("onload"))
    }

    //todo - right now it writes twice on page load. Maybe we need
    // something smarter here.
    this._WriteDecisionVarsToLocalStorage()
  }

  _loadPage(pageId){
    if(pageId == undefined)
      return

    setDV(this._currentStage.previousPageName, this._DVS[this._currentStage.currentPageName])
      
    //Clear it out in case the page doesn't exist (click_matte/etc)
    //Todo - Need to fix this because it may be another stage
    this._setDV(this._currentStage.currentPageName, "")

    //todo wipes out animation if playing
    //Todo - also update for multiple stages
    ///$("#pageContainer").html($("#pageContent_snippet").html())
    
    this._sceneReturnObj = undefined
    
    //Todo - this currently doesn't work with multiple stages
    var pageQuery = "> page:[id='" + pageId + "']"
    console.log(pageQuery)
    this._jCurrentPage = this._jCurrentScene.find(pageQuery);
    
    if(this._jCurrentPage.length == 0){
      //Try to find the page in the location
      var locationPageQuery = "config > locations "  
              + "> location[name='" + this._jCurrentScene.attr("name") + "']"
              + "> page[id='" + pageId + "']"
      console.log(locationPageQuery)
      this._jCurrentPage = $(this._xml).find(locationPageQuery)
      
      if(this._jCurrentPage.length == 0){
        //Try to find as a shared resource
        var sharedPageQuery = "config > shared "  
                + "> page[id='" + pageId + "']"
        console.log(sharedPageQuery)
        this._jCurrentPage = $(this._xml).find(sharedPageQuery)

        if(this._jCurrentPage.length == 0){
          //alert("CurrentPage: " +  pageId + " could not be found.")
          return;
        }
      }
    }

    //We have a real page so set the dv
    this._setDV(this._currentStage.currentPageName, pageId)

    this._loadDecisionVars(this._jCurrentPage);

    if(!this._routeMode){ //No checkpoints or durations set in routeMode
      //If we have a checkpoint make sure it hasn't already been set in this individual path
      if(this._jCurrentPage.attr("checkpoint") != undefined &&
        this._getBookmark(this._jDV("currentBookmark").attr("value")).attr("label") != this._jCurrentPage.attr("checkpoint") &&
        this._getBookmark(this._jDV("currentBookmark").attr("value")).
            find("> bookmark[label='" + this._jCurrentPage.attr("checkpoint") + "']").length == 0){
        this._setBookmark(this._jCurrentPage.attr("checkpoint"))
      }

      if(this._jCurrentPage.attr("duration") != undefined){
        this._addDurationToCurrentTime(this._jCurrentPage.attr("duration"))
      }

      //A decisionVar might have set this, or a duration might have incrimented this
      this._updateTimeDiv()
    }
    
    if(this._handlePageForward()){
      //A pageCondition of pageForward has been loaded so do nothing
    }else{
      if(!this._routeMode){ 
            //Do not construct the page in routeMode
            //This means there is no narrationLog, no 
            // external load of js, no writeDecisionVarsToLocalStorage
            // etc.
        
        if(this._DVS["remotePageContentURL"] != undefined &&
            this._DVS["remotePageContentURL"].length > 0 &&
            this._jCurrentPage.attr("dontLoadContent") == undefined){
          var remotePageUrl = this._DVS["remotePageContentURL"] + "?title=" + 
                    this._jCurrentScene.attr("name") +  ":" + 
                    this._jCurrentPage.attr("id");

          $("#linkToWiki").attr("href", remotePageUrl);

          //Load remote content
          $.ajax({
            type: "GET",
            async: false,
            url: remotePageUrl + "&action=raw",
            dataType: "text",
            success: this._remotePageContent,
            error: this._ajaxPageErrorFunc
          });
        }else{
          this._generatePage();
        }
      }
    }
    
    window.scrollTo(0, 0)
  }

  _handlePageForward(){
    //loop through page conditions
    var forceReturn = false
    this._jCurrentPage.find("> pagecondition").each(function(){
      if(checkConditions(this)){ //Todo - fix the this reference
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
      if(this._jCurrentPage.attr("type") == "pageForward"){
        if(this._jCurrentPage.attr("location") != undefined  && 
                this._jCurrentPage.attr("location").length > 0){
          this._loadLocation(this._jCurrentPage.attr("location"));
        }else if(this._jCurrentPage.attr("nextpage") != undefined  && 
                this._jCurrentPage.attr("nextpage").length > 0){
          this._loadPage(this._jCurrentPage.attr("nextpage"));
        }
        
        return true
      }
      
      return false
  }

  ////////////////////////////////////////////////
  // Route
  ////////////////////////////////////////////////
  _runRoute(endLocationName, endPageId){
    //Find a route with the startScene and endScene
    this._routeMode = true

    //todo - do we need a currentLocationName here
    var startLocationName = this._DVS[this._currentStage.currentLocationName]
    var startPageId = this._jCurrentPage.attr("id")

    var route = $(this._xml).find("config > routes > route[start='" 
            + startLocationName + "']"
            + "[end='" + endLocationName + "']")
    
    var routeBackwards = false
    if(route.length == 0){
      //Try backwards
      route = $(this._xml).find("config > routes > route[start='" 
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
      $.each(connectionsArr, (i,v) => {
        var jConnection = $($(this._xml)
              .find("config > connections > connection[id='" + v + "']"))
        
        if(connectionsArr.length - 1 == i){
          this._routeMode = false
        }

        if(routeBackwards){
          this._loadLocation(jConnection.attr("a"))
        }else{
          this._loadLocation(jConnection.attr("b"))
        }
        
        //add duration
        if(jConnection.attr("duration") != undefined){
          this._addDurationToCurrentTime(jConnection.attr("duration"))
          this._updateTimeDiv()
        }

        //If a scene + page isn't expected stop route .
        var currentSceneName = this._DVS[this._currentStage.currentSceneName]
        var currentPageId = this._DVS[this._currentStage.currentPageName]

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

          if(this._params["debug"]){
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

          if(this._params["debug"]){
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
          
          if(this._params["debug"]){
            alert("Route failed:currentPageId=" + currentPageId
                + ";expectedPageId=" 
                  + jConnection.attr(destination + "_expect_page")) 
          }

          return false 
        }
      })
    }
  }

  _calculateRouteDuration(locString){
    var locs = locString.trim().split(",")
      
    //Trim to make sure clean
    $.each(locs, function(i,v){
      v = v.trim
    })

    //Add up all of the routes
    var totalDuration = 0
    $.each(locs, (i,v) => {
      if(locs.length -1 == i){
        return false
      }

      var route = this._jDV("routes").find("route[startLocation='" + v 
                  + "'][endLocation='" + locs[i+1] + "']")

      if(route.length ==  0){
        alert("Error: Route not found start:" + v + " end:" + locs[i+1])
        return false
      }
      
      totalDuration += calculateTicksFromTimeString($(route).attr("duration")) 
    })	
    
    return this._calculateTimeStringFromTicks(totalDuration)
  }

  ////////////////////////////////////////////////
  // Bookmarks
  ////////////////////////////////////////////////
  _getBookmark(bk_name){
    return $(this._xml).find("config > decisionvars > variable[name='bookmarks'] " +
                        " bookmark[name='" + bk_name + "'] ")
  }

  _setBookmarkOkClicked(){
    var bkName = $("#bookmarkName").attr("value")
    
    //Validate name
    if(bkName.match(/[^a-zA-Z0-9 ]/) != undefined){
      $("#bookmarkNameInvalid").css("display", "block")
    }else{
      $("#bookmarkNameInvalid").css("display", "none")
      this._setBookmark(bkName)
    }
  }

  _setBookmark(label){
    //Generate bookmark id
    var jBookmarks = $($(this._xml).find("config > decisionvars > variable[name='bookmarks']"))
    var bookmarkList = jBookmarks.find("bookmark")
    var bookmarkName = "bkm_" + (bookmarkList.length + 1);
    var bookmarkLabel
    
    if(label == undefined || label.length == 0){
      bookmarkLabel = "Bookmark " + (bookmarkList.length + 1);
    }else{
      bookmarkLabel = label
    }
    
    //Grab all variables except the bookmarks variable 
    var varOutput = ""
    $(this._decisionVars).find("> variable:not([name='bookmarks'])").each(function(i,v){
        varOutput += new XMLSerializer().serializeToString(v)
    })
    
    // Is there a parent bookmark?
    //todo - will this work if DVS doesn't match decisionvars
    //    like if the writeToLocalStorageOnlyOnSceneLoad flag
    //    is set
    var parentBookmark = jBookmarks
    if(this._DVS["currentBookmark"] != undefined && 
        this._DVS["currentBookmark"].length > 0){
      //Parent is a bookmark so grab it
      parentBookmark = this._getBookmark(this._DVS["currentBookmark"])
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
    setTimeout(this._hideStatusText, 3000)
    
    this._loadBookmarksList()
    
    this._setState('main')
    
    //todo
    //if(writeToLocalStorageOnlyOnSceneLoad != "true"){
      this._WriteDecisionVarsToLocalStorage()
    //}
  }

  _loadBookmarksList(){
    //Loop through bookmarks
    var jBookmarks = this._jDV("bookmarks")

    //Todo - bookmarkPanel not used
    $(bookmarkPanel).empty().append(this._recursiveGenerateBookmarkItem(jBookmarks))
  }

  _bookmarkDelete(bookmarkName){
    var jBookmark = this._getBookmark(bookmarkName)
    var jCurrentBookmarkSearch = 
              this._getBookmark(this._DVS["currentBookmark"])
      
    
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
          this._setDV("currentBookmark","")
        }else{
          this._setDV("currentBookmark", jCurrentBookmarkSearch.attr("name"))
        }

        break;
      }else{
        jCurrentBookmarkSearch = $(jCurrentBookmarkSearch.parent())
      }
    }
    
    jBookmark.remove()
    
    this._loadBookmarksList()
  }

  _recursiveGenerateBookmarkItem(jBookmarkParent){
    var output = ""
    
    $(jBookmarkParent).find("> bookmark").each((i,v) => {
      //take the bookmark and write 
      var currentBookmarkStyle = ""
      
      if(this._DVS["currentBookmark"] == $(v).attr("name")){
        currentBookmarkStyle = "currentBookmark"
      }
      
      output +=   "<div class='bookmarkItem " + currentBookmarkStyle + "' id='" + $(v).attr("name") + "'>" + 
              "<div class='bookmarkLabel' onclick='bookmarkClicked(\"" + 
                    $(v).attr("name") + "\")'>" + $(v).attr("label") + "</div>" + 
              "<div class='bookmarkDelete' onclick='bookmarkDelete(\"" 
                        + $(v).attr("name") + "\")'>X</div>" + 
              this._recursiveGenerateBookmarkItem($(v))	+
            "</div>"				
    })
    
    return output;
  }

  _bookmarkClicked(bk_id){
    var bookmarks = $(this._xml).find("config > decisionvars > variable[name='bookmarks']").clone()
    var newDVs = $(bookmarks).find("bookmark[name='" + bk_id + "'] > dvdata").clone().children()
    
    if(newDVs == undefined || newDVs.length == 0){
      alert("newDVs undefined")
    }
    
    $(this._xml).find("config > decisionvars").empty().append(bookmarks).append(newDVs);
    
    this._setDV("currentBookmark", bk_id)
    
    this._start();
    
    this._loadBookmarksList()
  }

  ////////////////////////////////////////////////
  // Developer
  ////////////////////////////////////////////////
  //todo - Do we need this function?
  _loadGameState(){
    //Reset game
    this._clearLocalStorage()
    $(this._xml).find("config > decisionvars").empty()

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
    
    this._loadDecisionVars($(xmlDocStr))
    
    this._setDV("currentBookmark", "")
    
    //todo - can i remove this
    //writeDecisionVarsToLocalStorage()
    this._loadGame()	
  }

  _sendErrorReport(){
    var jsonTxt = ""
    
    /*decisionVars.find("> variable[name='log'] > variable").each(function(i,v){
      bodyJson += $(v).attr("name") + "=" + $(v).attr("value") + ","
    })*/

    var out = new XMLSerializer().serializeToString(this._decisionVars[0])
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
  //todo - check for "failure:" on url requests

  _multiplayerLoop(){
    if(!this._ajaxRequestPending){
      this._ajaxRequestPending = true
      this._multiplayerQueueGet()
      this._multiplayerQueuePost()
      this._ajaxRequestPending = false
    }
  }

  _multiplayerAddToPostQueue(value){
    this._multiplayerPostQueue += value 
  }

  _multiplayerQueuePost(){
    if(this._multiplayerPostQueue.length > 0){
      $.ajax({
        type: "POST",
        async: false,
        url: this._DVS['multiplayerQueuePostURL'] 
            + "?user_id=" + this._DVS['multiplayerSessionId'],
        dataType: "text",
        success: function(text){
          //Check for failure
          if(text.substring(0,"failure:".length) == "failure:"){
            alert("multiplayerQueuePost failed")
          }else{
            this._multiplayerPostQueue = ""
          }
        },
        error: function(){console.log("multiplayerQueuePost ajax failure.")},
        data:{value:this._multiplayerPostQueue}
      });
    }
  }

  _multiplayerQueueGet(){
    $.ajax({
      type: "GET",
      async: false,
      url: this._DVS['multiplayerQueueGetURL'] + "?user_id=" + this._DVS['multiplayerUserId'],
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
            this._setDV(keyValPair[0], keyValPair[1], false)
          })

          //Clear the queue
          this._multiplayerQueueClear()
        }
        
        //Handle waitingOn
        if(this._DVS['multiplayerWaitingOn'] != ""){
          var waitingParts = this._DVS['multiplayerWaitingOn'].split(',')
          if(this._DVS[waitingParts[0]] != undefined  
              && this._DVS[waitingParts[0]] == waitingParts[1]){
            //Todo - have to make all of this handle multiple 
            // vars, and locations/scenes/pages
            var scenePageParts = waitingParts[2].split(":")
            this._loadPage(scenePageParts[1]);

            //We found the match so clear it
            this._setDV('multiplayerWaitingOn',"")
          }
        }			
      },
      error: function(){console.log("multiplayerQueueGet ajax failure.")}
    });
  }

  _multiplayerQueueClear(){
    $.ajax({
      type: "GET",
      async: false,
      url: this._DVS['multiplayerQueueClearURL'] + "?user_id=" + this._DVS['multiplayerUserId'],
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
  _setState(state){
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

  _toggleMenuBar(){
    if($("body").hasClass('showMenu')){
      $("body").removeClass('showMenu')
    }else{
      $("body").addClass('showMenu')
    }
  }

  _decisionClicked(theThis, id){
    if(this._clickLock){
      return
    }else{
      this._clickLock = true
    }
    
    //Todo - Find Stage Name
    //First we need the currentStage of the stage that the decision resides in
    this._loadStage($(theThis).closest(".stage").attr("stage_name"))

    //Todo need to fix for multiple stages. It looks like it runs
    // with the wrong scene name for another stage
    this._jCurrentScene = $(this._xml).find("config > scenes > scene:[name='" 
              +  this._DVS[this._currentStage.currentSceneName] + "']");

    var pageQuery = "> page:[id='" + this._DVS[this._currentStage.currentPageName] + "']"
    console.log(pageQuery)
    this._jCurrentPage = this._jCurrentScene.find(pageQuery);
  
    var decision = this._jCurrentPage.find("decisions > decision#" + id)
    
    //When one stage opens a page in another stage have to take the decision from the
    // first stage, but the "currentStage" of the target stage.
    if($(theThis).attr("stage_name") != undefined){
      this._loadStage($(theThis).attr("stage_name"))
    }

    if($(decision).attr("calculate_duration") != undefined){
      //Find route duration
      this._addDurationToCurrentTime(
        this._calculateRouteDuration($(decision).attr("calculate_duration"))
      )
    }else if($(decision).attr("duration") != undefined){
      this._addDurationToCurrentTime($(decision).attr("duration"))
    }
    
    //todo - append doesn't seem to work on IOS with xml
    //todo - Is the narrationLog the same as the log DV?
    //jDV("narrationLog").append("<p> You chose: " + $(decision).attr("label") +  "</p>\n")
    //Todo fix narration log for multiple stages
    this._jDV("narrationLog").html(jDV("narrationLog").html() 
        + "\n<p class='youChose' decision_id='" + id + "'> You chose: " 
        + $(decision).attr("label") +  "</p>\n")
    
    $("#narrationLog").empty().append($(this._jDV("narrationLog").html()))
    
    if($(decision).attr("onclick") != undefined){
      $(this._currentStage.pageContent).html("");
      eval($(decision).attr("onclick"))
    }
    
    if($(decision).attr("nextpage") != undefined){
      this._loadPage($(decision).attr("nextpage"));
    }else if($(decision).attr("location")){
      this._loadLocation($(decision).attr("location"));	
    }	
    
    this._clickLock = false
  }

  _fullscreenOnChange(){
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
  _showDialogOnChange(){
    if($("#checkbox_disableDialog").attr("checked") == "checked"){
      //Disable dialog
      $("body").attr("disableDialog", "true")
      this._setDV('disableDialog', "true", true)
    }else{
      //Enabling dialog
      $("body").attr("disableDialog", "false")
      this._setDV('disableDialog', "false", true)
    }
  }

  _musicOnChange(){
    if($("#checkbox_musicOn").attr("checked") == "checked"){
      //Enabling music
      $("body").attr("music", "true")	
      this._setDV("music", "true", true)
      
      this._loadMusic(this._jCurrentScene.attr("music"));
      this._unpauseAudio()
    }else{
      //Disable sound
      $("body").attr("music", "false")		
      this._setDV("music", "false", true)
      this._pauseAudio()
      $("#musicPlayerDiv").empty()
    }
  }

  _narrationAudioOnChange(){
    if($("#checkbox_narrationAudioOn").attr("checked") == "checked"){
      //Enabling narration audio
      $("body").attr("narration_audio", "true")				
      this._setDV("narrationAudio", "true", true)
    
      this._loadNarrationAudio(this._jCurrentScene.attr("name"),this._jCurrentPage.attr("id"))
      this._unpauseAudio()
    }else{
      //Disable sound
      $("body").attr("narration_audio", "false")			
      this._setDV("narrationAudio", "false", true)
      this._pauseAudio()
      $("#narrationPlayerDiv").empty()
    }
  }

  ////////////////////////////////////////////////
  // Audio
  ////////////////////////////////////////////////
  _playPauseBtnClicked(){
    if((document.getElementById('narrationAudioPlayer') != undefined 
          || document.getElementById('musicAudioPlayer') != undefined) &&
        (document.getElementById('narrationAudioPlayer') == undefined 
          || document.getElementById('narrationAudioPlayer').paused) && 
        (document.getElementById('musicAudioPlayer') == undefined 
        || document.getElementById('musicAudioPlayer').paused)){
        $("#playPauseBtn").text("||")
        this._unpauseAudio()
    }else{
        $("#playPauseBtn").text(">")
        this._pauseAudio()
    }  
  }

  _loadNarrationAudio(name, id){
    if(name == undefined || id == undefined){
      return;	
    }
    
    if(this._checkDecisionVarI("narrationAudio", "true")){
      $("#narrationPlayerDiv").empty().append($('<audio id="narrationAudioPlayer" width="0" height="0"' +
                  '><source src="' + this._DVS['SoundMediaPath'] + "narration/wav/" +
                      name + '-' + id + '.wav"' +
                      'type="audio/wav"></source>' + 
                  '</audio>'));
      }
  }

  _loadMusic(name){
    if(name == undefined){
      return;	
    }
    
    if(this._checkDecisionVarI("music", "true")){
      parts = /(.+)([.][\w]+$)/.exec(name)
      $("#musicPlayerDiv").empty().append($('<audio id="musicAudioPlayer" width="0" height="0">' + 
                            '<source src="' + this._DVS['SoundMediaPath'] + "ogg/" +
                            parts[1] + '.ogg"' +
                            'type="audio/ogg"></source>' + //Todo - Just updated mp3 to use SoundMediaPath var. Need to test it.
                            '<source src="' + this._DVS['SoundMediaPath'] + "mp3/" +
                            parts[1] + '.mp3"' +
                            'type="audio/mp3"></source>' + 
                          '</audio>'));


      document.getElementById('musicAudioPlayer').volume = .25;
      }
  }

  _pauseAudio(){
      if(document.getElementById('musicAudioPlayer') != null &&
              document.getElementById('musicAudioPlayer').pause != null){
        document.getElementById('musicAudioPlayer').pause()
    }
    
    if(document.getElementById('narrationAudioPlayer') != null &&
            document.getElementById('narrationAudioPlayer').pause != null){
        document.getElementById('narrationAudioPlayer').pause()
    }
  }

  _unpauseAudio(){
    if(this._checkDecisionVarI("music", "true")){
      if(document.getElementById('musicAudioPlayer') != null){
        document.getElementById('musicAudioPlayer').play()	
      }
    }

    if(this._checkDecisionVarI("narrationAudio", "true")){
      if(document.getElementById('narrationAudioPlayer') != null){
        document.getElementById('narrationAudioPlayer').play()		
      }
    }
  }

  ////////////////////////////////////////////////
  // DecisionVars
  ////////////////////////////////////////////////

  //Will create the dv if it is undefined
  _setDV(name, value, postToMultiplayerQueue, type){
    if(postToMultiplayerQueue == undefined){
      postToMultiplayerQueue = true //todo - is this correct?
    }

    var dVars = $(this._xml).find("config > decisionvars")

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

      if(!this._fubze(type)){
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
    
    this._updateDVS()
    
    if(name != "currentBookmark"){
      $(dVars).find("> variable[name='log']").append(
        $("<variable name='" + name + "' " + valString + "/>"))
    }

    //todo
    /*if(writeToLocalStorageOnlyOnSceneLoad != "true"){
      WriteDecisionVarsToLocalStorage()
    }*/

    if(this._postToMultiplayerQueue == true 
        && this._DVS['multiplayerMode'] == "true" 
        && !this._isDefaultValue(name)){
      this._multiplayerAddToPostQueue(name + "," + value + ":")
    }
  }

  _loadDecisionVars(container){	
    var selector = "> variable"
    
    //Todo - For some reason I got the great idea to change the decisionvar 
    // node name to variable. This is a problem because all of the configs
    // have to be changed as well, or we can roll back the "variable" name change
    //Todo - WHAT A MESS! Doesn't handle for "decisionVar"!
    for(i=0;i<2;i++){ //The loop is to handle for both "variable" and "decisionvar"s
      $(container).find(selector).each(function(){
        if($(this).attr("name") == undefined || //Todo - Fix the "this" reference
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
  _WriteDecisionVarsToLocalStorage(){
    var t_xml = $(this._xml).clone()[0]
    
    //Doesn't seem to work on IPad
    //var xmlClone = $(xml).clone()

    //Don't save the local content if we're loading remotely
    if(!this._uob(DVS["remotePageContentURL"])){
      $(t_xml).find("config > scenes > scene > page > content").empty()
    }

    var config_xml_string = new XMLSerializer().serializeToString(t_xml)
    var lzString = LZString.compress(config_xml_string)

    //Use JSON to store more than one configuration
    var decisionzLocalStorageJson = ""
    if(localStorage.decisionz.length > 0){
      decisionzLocalStorageJson = JSON.parse(localStorage.decisionz)
    }

    decisionzLocalStorageJson[this._localStorageName] =  lzString

    var decisionzLocalStorageJson_stringified =
                      JSON.stringify(decisionzLocalStorageJson)
    localStorage.decisionz = decisionzLocalStorageJson_stringified


    if(this._params["debug"] != undefined){
      console.log("config write to " + this._localStorageName 
                            + ": " + config_xml_string.length)
      console.log("config write to " + this._localStorageName 
                            + " compressed : " + lzString.length)
    }

    //Check that it actually saved
    //Todo - this doesn't appear to work for multiple configurations
    if(decisionzLocalStorageJson_stringified.length != 
                      localStorage.decisionz.length){
      alert("LocalStorage was not completely stored")
    }

    $("#localStorageLength").text("Local Storage Length Is: " + localStorage.decisionz.length)

    this._validateDecisionVars()
  }

  _validateDecisionVars(){
    //This function just checks for error situations
    var variableNameObj = {}
    var variableNameDuplicatesObj = {}
    
    //todo -handle for variables without a value such as bookmarks
    
    this._decisionVars.find("> variable").each((i,v) => {
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
    
    if(this._decisionVars.find("> variable[name='log'] > variable[name='currentBookmark']").length > 0){
      alert("CurrentBookmark found in log")
    }
  }

  _jDV(name){
    return $($(this._decisionVars).find("> variable:[name='" + name + "']"))
  }

  _updateDVS(){
    this._DVS = []

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
    this._decisionVars.find("> variable").each((i,v) => {
      if($(v).attr("value") != undefined){
        this._DVS[$(v).attr("name")] = $(v).attr("value")

        //Only add to dvs tag if this ISN'T Json
        try{
          JSON.parse($(v).attr("value"));
        }catch(e){
          jDVsTag.attr($(v).attr("name"),$(v).attr("value"))
        }
      }else{
        jDVsTag.attr($(v).attr("name"),"")
      }
    })
  }

  //Case insensitive
  _checkDecisionVarI(name, value){
    //Todo- calls to this function must not occure
    //   before the DVS is loaded
    
    var dv = this._DVS[name]
    
    if(dv != undefined && dv.toLowerCase() == value){
      return true;
    }else{
      return false;
    }
  }

  _handleDVDefaults(){
    //loop through decisionVars_defaults_snippet
    $("#decisionVars_defaults_snippet").find("> variable").each((i,v) => {
      if(this._DVS[$(v).attr("name")] == undefined ){
        if($(v).attr("value") == undefined){
          //If dv is not present and there is no value 
          //  then create the dv and set the value to ""
          this._setDV($(v).attr("name"), "")
        }else{
          //Todo - It might be worth it to copy all other attributes as well if present
          //If dv is not present and there is a default 
          //  value then create the dv and set the value
          this._setDV($(v).attr("name"), $(v).attr("value"))
        }
      }

      if($(v).attr("undefined_error") != undefined){
        //If a dv has undefined_error attr then show dialog if not found or length 0
        if(this._DVS[$(v).attr("name")] == undefined){
          alert("DV undefined_error: " + $(v).attr("name"))
          return
        }		
      }

      if($(v).attr("zero_length_error") != undefined){
        if(this._uob(this._DVS[$(v).attr("name")])){
          alert("DV zero_length_error: " + $(v).attr("name"))
          return
        }
      }
    })
  }

  ////////////////////////////////////////////////
  // Util
  ////////////////////////////////////////////////
  _loadjscssfile(filename, filetype, callback){
    if (filetype=="js"){ //if filename is a external JavaScript file
    var fileref=document.createElement('script')
    fileref.setAttribute("type","text/javascript")
    fileref.setAttribute("src", filename)
    }
    else if (filetype=="css"){ //if filename is an external CSS file
    var fileref=document.createElement("link")
    fileref.setAttribute("rel", "stylesheet")
    fileref.setAttribute("type", "text/css")
    fileref.setAttribute("href", filename)
    }
    
    if (typeof fileref!="undefined"){
    if(callback){
      fileref.onload = callback;
    }
    
    document.getElementsByTagName("head")[0].appendChild(fileref)
    }
  }

  //Check for undefined or blank
  //Todo add object keys support
  _uob(value){
    if(value == undefined){
        return true
    }

    if(value.length == 0){
        return true
    }

    return false
  }

  //Fubze = False/Undefined/Blank/Zero/Empty And much more!
  _fubze(value){
    if(!value){
        /*
        will evaluate to true if value is :
            null
            undefined
            NaN
            empty string ("")
            0
            false

        */

        return true
    }

    if(value === "false")
        return true

    if(typeof value == "object"){
        if(value instanceof Array){ 
            //Check for zero length arrays
            if(value.length == 0)
                return true
        }else{
            //Must be object
            //Check for empty object
            if(Object.keys(value).length == 0)
                return true
        }
    }

    return false
  }

  _rgbToHex(r, g, b) {
    if (r > 255 || g > 255 || b > 255)
      throw "Invalid color component";
    return ((r << 16) | (g << 8) | b).toString(16);
  }

  _isDefaultValue(name){
    if($("#decisionVars_defaults_snippet > variable[name='" 
                      + name + "']").length > 0){
      return true										
    }else{
      return false
    }
  }

  _espeakOutput(){
    $(this._xml).find("scene > page > content").each(function(i){ //Todo - Fix the "this" refernence
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

  _ajaxErrorFunc(jqXHR, textStatus, errorThrown){
    alert("Error- Can't load config xml.");
  }

  _ajaxPageErrorFunc(jqXHR, textStatus, errorThrown){
    alert("Error- Page load failed.");
  }

  _hideStatusText(){
    $("#statusTxt").fadeOut()
  }

  _convertXMLtoNewFormat(){
    //Convert nextPage to decision.
    $(this._xml).find("config page:not([type='pageForward'])").each(function(i,v){
        if($(this).attr("nextpage") != null){ //todo - Fix the "this" reference
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
    $(this._xml).find("config > scenes > scene > page:not([type='pageForward'])").each(function(i,v){
        if($(this).attr("location") != null){ //Todo - Fix the "this" reference
            var location = $(this).attr("location")
            $(this).removeAttr("location")
            
            if($(this).find("> decisions").length == 0){
              $(this).append($("<decisions></decisions>"))
            }
            
            $(this).find("> decisions").append($("<decision label='Next Page' location='" + location + "'></decision>"))
        }
    })
  }

  _capitaliseFirstLetter(string)
  {
      return string.charAt(0).toUpperCase() + string.slice(1);
  }

  _clearLocalStorage(){
    localStorage.decisionz = "";
  }

  _loadIFrame(source){
    var jIframe = $($("#iframe_snippet").html())
    jIframe.attr("src", source)
    //Todo - update for multiple stages
    $(this._currentStage.pageContent).find("iframe").remove()
    $(this._currentStage.pageContent).append(jIframe)
  }

  _loadClickMatte(name){
    //Todo - use something like DVS['SoundMediaPath'] to set scene path. Note this is a repeated todo.
    $("#backgroundImage").attr("src","../scenes/" + name + "/background.png")
    $("#backgroundClickMatte").attr("src","../scenes/" + name + "/matte.png")
  }

  _matteLoaded(){
    this._matteCanvas = document.getElementById("backgroundClickMatteCanvas")
    var img = document.getElementById("backgroundClickMatte")
    this._matteCanvas.width = img.width;
    this._matteCanvas.height = img.height;
    
    this._canvasContext.drawImage(img, 0, 0, img.width, img.height);
  }

  ////////////////////////////////////////////////
  // Time
  ////////////////////////////////////////////////
  _calculateTicksFromTimeString(timeString){
    var timeParts = timeString.match(iso);
    var timeTicks = (timeParts[this._DAY_INDEX] * this._TICKS_PER_DAY) + 
                (timeParts[this._HOUR_INDEX] * this._TICKS_PER_HOUR)+ 
                (timeParts[this._MIN_INDEX] * this._TICKS_PER_MIN)+ 
                (timeParts[this._SEC_INDEX] * this._TICKS_PER_SEC);
    return timeTicks;
  }

  _calculateTimeStringFromTicks(timeTicks){
    //Days
    var days =  Math.floor(timeTicks/this._TICKS_PER_DAY);
    timeTicks -= (days * this._TICKS_PER_DAY);

    //Hours
    var hours =  Math.floor(timeTicks/this._TICKS_PER_HOUR);
    timeTicks -= (hours * this._TICKS_PER_HOUR);	
    
    //Mins
    var mins =  Math.floor(timeTicks/this._TICKS_PER_MIN);
    timeTicks -= (mins * this._TICKS_PER_MIN);	
    
    //Seconds
    var sec =  Math.floor(timeTicks/this._TICKS_PER_SEC);
    timeTicks -= (sec * this._TICKS_PER_SEC);	

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

  _addDurationToCurrentTime(duration){
      var durationTicks = 
        this._calculateTicksFromTimeString(duration) 
      var currentTimeTicks = 
        this._calculateTicksFromTimeString(this._DVS[this._currentStage.currentTime]);
      
      currentTimeTicks += durationTicks;
      
      this._setDV(this._currentStage.currentTime, 
        this._calculateTimeStringFromTicks(currentTimeTicks))
  }

  _updateTimeDiv(){
    var timeParts = /([0-9]{4})-([0-9]{2})-([0-9]{2}) ([0-9]{2}):([0-9]{2}):([0-9]{2})/.
                      exec(this._DVS[this._currentStage.currentTime])
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
  _generateExpressionForCondition(condition){
    var output = "(";

    var currentTimeString = this._DVS[this._currentStage.currentTime]
    var currentTimeTicks = this._calculateTicksFromTimeString(currentTimeString);

    //If this is blank than we probably have a time check
    if($(condition).attr("name") != undefined){
      if($(condition).attr("value") == undefined){
        //This is a check to see if the variable is present
        output = output + ' this._DVS["' + $(condition).attr("name") + '"] == undefined '
      }else{
        output = output + ' this._DVS["' + $(condition).attr("name") + '"] == "' 
                          + $(condition).attr("value") + '" ';
      }
    }

    if($(condition).attr("startTime") != undefined){
      var conditionStartTime = $(condition).attr("startTime");
      var startTimeTicks = this._calculateTicksFromTimeString(conditionStartTime);

      if(output.length > 1){
        output = output + " && ";
      }

      output = output + startTimeTicks + " < " + currentTimeTicks + " ";
    }

    if($(condition).attr("endTime") != undefined){
      var conditionEndTime = $(condition).attr("endTime");
      var endTimeTicks = this._calculateTicksFromTimeString(conditionEndTime);

      if(output.length > 1){
        output = output + " && ";
      }

      output = output + endTimeTicks + " >= " + currentTimeTicks + " ";
    }

    return output + ")";
  }

  _recursiveConstructConditionExpression(expression, conditionsContainer){
    var output = "";
    var firstTime = true;
    $(conditionsContainer).find("> condition").each(function(){
      var exp = this._generateExpressionForCondition(this); //Todo - Fix the "this" references

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

  _checkConditions(conditionsContainer){	
    var expression = this._recursiveConstructConditionExpression("", conditionsContainer);
    
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
  _loadStage(name){
    this._currentStage = []

    this._currentStage.name = name

    //Clearing vals with defaultStage. 
    //Note that this allows you to only create the vars you need for that
    // particular stage. All the other vals are the ones used by defaultStage.
    //Note - This may cause issues with previous[Page/Scene/Location]
    $.each(JSON.parse(DVS["defaultStage"]), (k,v) => {
      this._currentStage[k] = v
    })

    $.each(JSON.parse(DVS[name]), (k,v) => {
      this._currentStage[k] = v
    })
  }

  ////////////////////////////////////////////////
  // Clickmatte
  ////////////////////////////////////////////////
  _clickMatte_mouseMove(e){
    var now = Date.now()
    if(this._lastDate + 100 > now){
      //console.log("date filtered")
      return
    }else{
      this._lastDate = now
      //console.log("date passed")
    }

    this._mouseX = e.pageX - this._jContentContainer.offset()['left'];
    this._mouseY = e.pageY - this._jContentContainer.offset()['top'];

    var p = this._canvasContext.getImageData(this._mouseX, this._mouseY, 1, 1).data;

    if(p[3] != 0){
      this._jBody.css("cursor", "pointer")
      //console.log(mouseX + ":" + mouseY)
    }else{
      this._jBody.css("cursor", "")
    }
  }

  _matteClicked(matte){
    var p = this._canvasContext.getImageData(this._mouseX, this._mouseY, 1, 1).data;
    
    if(p[3] > 0){ //Something is here because the alpha isn't 0
      var hexColor = rgbToHex(p[0],p[1],p[2])

      //alert(Math.ceil(mouseX) + ":" + Math.ceil(mouseY) + ";" + hexColor  + "," + p[3])

      while(hexColor.length < 6){
        hexColor = "0" + hexColor
      } 

      var jLinkItem = $(this._xml).find("linktypes > linktype[color='" + hexColor + "']")
      var linkItemName = jLinkItem.attr('name')

      var jCurrentSceneLinkItem = this._jCurrentScene.find("> link[linktype='" + linkItemName + "']")
      var linkItemLocationName = this._jCurrentSceneLinkItem.attr("location")
      this._loadLocation(linkItemLocationName) 
    }
  }

  _matteHover(thisObj){
    //var context = canvas.getContext('2d');
    //var p = context.getImageData(mouseX, mouseY, 1, 1).data;
  }

  _onUnload(){
    this._WriteDecisionVarsToLocalStorage()
  }
}