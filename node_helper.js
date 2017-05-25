var NodeHelper = require("node_helper");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var convert = require('xml-js');

module.exports = NodeHelper.create({

  start: function() {
    console.log("Starting node_helper for module: " + this.name);
  },

  socketNotificationReceived: function(notification, payload){
    if (notification === 'MMM-MYTTC-GET') {
      this.configRouteList = payload.routeList;
      this.getTTCTimes( payload.url );
    }
  },

  configRouteList: [],

  getTTCTimes: function(url) {
    
    var self = this;

    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
      if (xmlHttp.readyState == 4 && xmlHttp.status == 200) { //good
        self.processXML(xmlHttp.responseText);
      } else if (xmlHttp.readyState == 4) { //bad...
        self.sendSocketNotification('MMM-MYTTC-RESPONSE', {data:null});
      }
    }
    xmlHttp.open("GET", url, true); // true for asynchronous 
    xmlHttp.send(null);

  },

  formatTitle: function(s) {
    var titlePieces = s.split(" - ");
    var branchNo = titlePieces[1].split(" ")[0].toUpperCase();
    var assembledTitle = branchNo + " " + titlePieces[0];
    if (titlePieces[1].indexOf(" towards ") != -1) {
      assembledTitle += " to " + titlePieces[1].split(" towards ")[1];
    }
    console.log("=========> " + assembledTitle);

    return assembledTitle;
  },

  processXML: function(xmlText) {

    var resultList = new Array;

    //convert XML to JSON object because I fucking hate working with XML
    var rawJSON = convert.xml2js(xmlText, {compact: true, alwaysArray: true});

    for (var i = 0; i < rawJSON.body[0].predictions.length; i++) {

      var p = rawJSON.body[0].predictions[i];
      var routeTitlePieces = p._attributes.routeTitle.split("-");
      routeTitlePieces.shift(); //remove the route number from the title
      var route = new Object({
        routeNo : Number(p._attributes.routeTag),
        stopTag : Number(p._attributes.stopTag),
        routeTitle : routeTitlePieces.join(" "), 
        stopTitle : p._attributes.stopTitle,
      });

      route.branches = new Array();

      var assembledTitle;

      if (p._attributes.dirTitleBecauseNoPredictions) { //no data for this route
        route.noSchedule = true,
        route.branches.push({
          title: this.formatTitle(p._attributes.dirTitleBecauseNoPredictions),
          nextVehicles: []
        })

      } else {
        for (var j = 0; j < p.direction.length; j++) {
          var d = p.direction[j];

          var minutesArray = new Array;
          for (var k = 0; k < d.prediction.length; k++) {
            if (k == 3) {
              break;
            }
            minutesArray.push(Number(d.prediction[k]._attributes.minutes));
          }

          route.branches.push({
            title: this.formatTitle(d._attributes.title),
            nextVehicles: minutesArray
          })

        }
      }

      resultList.push(route);

    }

    //reorder resultList to match config order
    var self = this;
    var routeList = new Array();
    for (var i = 0; i < this.configRouteList.length; i++) {
      var matchingElement = resultList.find(function(el) {
        if (el.routeNo == self.configRouteList[i].routeNo && el.stopTag == self.configRouteList[i].stop) {
          if (self.configRouteList[i].label) {
            el.routeTitle = self.configRouteList[i].label;
          }
          if (self.configRouteList[i].color) {
            el.color = self.configRouteList[i].color;
          } 
          return el;
        }
      });
      routeList.push(matchingElement);
    }

    //return the JSON object with index
    this.sendSocketNotification('MMM-MYTTC-RESPONSE', routeList);

  }

});