

Module.register('MMM-MyTTC', {

  defaults: {
    routeList: [
      {
        routeNo : '501',
        stop : '8813'
      },
      {
        routeNo : '301',
        stop : '8813'
      },
      {
        routeNo : '143',
        stop: '8813'
      },
      {
        routeNo : '64',
        stop : '9055'
      }
    ],
    updateInterval: 60000, //update every minute
  },

  webServiceURL: "http://webservices.nextbus.com/service/publicXMLFeed",
  agency: "ttc",

  // Define required styles.
  getStyles: function () {
    return ["MMM-MyTTC.css"];
  },

  svgIconFactory: function(glyph) {

    var svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttributeNS(null, "class", "transit-mode-icon");
    var use = document.createElementNS('http://www.w3.org/2000/svg', "use");
    use.setAttributeNS("http://www.w3.org/1999/xlink", "href", "modules/MMM-MyCommute/icon_sprite.svg#" + glyph);
    svg.appendChild(use);
    
    return(svg);
  },  

  start: function() {

    Log.info('Starting module: ' + this.name);

    //set up config
    this.payload = new Object();
    this.ttcData = null;
    var builtURL = this.webServiceURL + "?&command=predictionsForMultiStops&a=" + this.agency;

    var routes = this.config.routeList;
    for (var i = 0; i < routes.length; i++) {
      builtURL += "&stops=" + routes[i].routeNo + "|" + routes[i].stop;
    }
    console.log(builtURL);

    this.payload = {url : builtURL, routeList: this.config.routeList};

    this.loaded = false;


    //first data request
    this.getTimes();

    //recurring data request
    var self = this;
    setInterval(function(){
      self.getTimes();
    }, this.config.updateInterval);

      
  },

  getTimes: function() {
    this.sendSocketNotification("MMM-MYTTC-GET", this.payload);    
  },

  socketNotificationReceived: function(notification, payload) {
    //only update if a data set is returned.  Otherwise leave stale data on the screen.
    if ( notification === 'MMM-MYTTC-RESPONSE' && payload != null) {
      this.loaded = true;
      console.log(payload);
      this.ttcData = payload;
      this.updateDom();
    }

  },

  getDom: function() {

    var wrapper = document.createElement("div");
    wrapper.classList.add("wrapper");

    if (!this.loaded) {
      wrapper.innerHTML = "Loading...";
      wrapper.className = "dimmed light small";
      return wrapper;
    } else if (this.ttcData == null) { //should never get here, but just in case.
      wrapper.innerHTML = "No Data";
      wrapper.className = "dimmed light small";
      return wrapper;
    }

    for (var i = 0; i < this.ttcData.length; i++) {

      //skip entries with no scheduled times
      if (this.ttcData[i].noSchedule) {
        console.log("====================> No Schedule");
        continue;
      }

      var routeContainer = document.createElement("div");
      routeContainer.classList.add("route-container");
      this.getAdditonalRouteClasses(routeContainer, this.ttcData[i].routeNo);

      var icon = this.svgIconFactory( routeContainer.classList.contains('streetcar') ? 'streetcar' : 'bus' );
      icon.classList.add("transit-icon", "bright");
      if (this.ttcData[i].color) {
        icon.style.color = this.ttcData[i].color;
      }
      routeContainer.appendChild(icon);

      var routeTitle = document.createElement("div");
      routeTitle.classList.add("route-title", "bright");
      routeTitle.innerHTML = "<span class='route-no'>" + this.ttcData[i].routeNo + "</span> " + this.ttcData[i].routeTitle;

      routeContainer.appendChild(routeTitle);

      var stopTitle = document.createElement("div");
      stopTitle.classList.add("stop-title", "bright");
      stopTitle.innerHTML = "@ " + this.ttcData[i].stopTitle;
      routeContainer.appendChild(stopTitle);

      for (j = 0; j < this.ttcData[i].branches.length; j++) {

        var branchContainer = document.createElement("div");
        branchContainer.classList.add("branch-container");
        
        var branchTitle = document.createElement("span");
        branchTitle.classList.add("branch-title");
        branchTitle.innerHTML = this.ttcData[i].branches[j].title;
        branchContainer.appendChild(branchTitle);

        var nextVehicles = document.createElement("span");
        nextVehicles.classList.add("next-vehicles");
        if (this.ttcData[i].branches[j].nextVehicles.length > 0) {
          nextVehicles.classList.add("bright");
          for (var k = 0; k < this.ttcData[i].branches[j].nextVehicles.length; k++) {
            var minutes = document.createElement("span");
            minutes.innerHTML = this.ttcData[i].branches[j].nextVehicles[k];
            nextVehicles.appendChild(minutes);
            if (k < this.ttcData[i].branches[j].nextVehicles.length - 1) {
              var comma = document.createElement("span");
              comma.innerHTML=", "
              nextVehicles.appendChild(comma);
            } 
          }
          var suffix = document.createElement("span");
          suffix.innerHTML=" min";
          nextVehicles.appendChild(suffix);
        } else {
          nextVehicles.innerHTML = "No schedule";                    
        }
        branchContainer.appendChild(nextVehicles);

        routeContainer.appendChild(branchContainer)
      }


      wrapper.appendChild(routeContainer);

    }

    return wrapper;

  },

  getAdditonalRouteClasses: function(container, route) {

    var streetcarRoutes = [301,304,306,317,501,502,503,504,505,506,509,510,511,512,514];
    var expressRoutes = [185,186,188,190,191,193,195,196,198,199];
    var downtownExpressRoutes = [141,142,143,144,145];
    var communityRoutes = [400,402,403,404,405,407];
    
    if ( streetcarRoutes.indexOf(route) != -1 ) {
      container.classList.add("streetcar");
    }
    if ( route >= 300 && route <= 399 ) {
      container.classList.add("all-night");
    }
    if ( expressRoutes.indexOf(route) != -1 ) {
      container.classList.add("express");
    }
    if ( downtownExpressRoutes.indexOf(route) != -1 ) {
      container.classList.add("downtown-express");
    }
    if ( communityRoutes.indexOf(route) != -1 ) {
      container.classList.add("communityRoutes");
    }
  }



});