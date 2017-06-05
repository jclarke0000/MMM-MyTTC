/*********************************

  Magic Mirror Module: 
  MMM-MyTTC
  https://github.com/jclarke0000/MMM-MyTTC

  By Jeff Clarke
  MIT Licensed
 
*********************************/

var NodeHelper = require("node_helper");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

module.exports = NodeHelper.create({

  webServiceURL: "http://webservices.nextbus.com/service/publicJSONFeed",
  agency: "ttc",

  start: function() {
    console.log("Starting node_helper for module: " + this.name);
  },

  socketNotificationReceived: function(notification, payload){
    if (notification === 'MMM-MYTTC-GET') {

      var self = this;

      var builtURL = this.webServiceURL + "?&command=predictionsForMultiStops&a=" + this.agency;

      var routes = payload.config.routeList;
      for (var i = 0; i < routes.length; i++) {
        builtURL += "&stops=" + routes[i].routeNo + "|" + routes[i].stop;
      }

      // console.log("=============>" + builtURL);


      var xmlHttp = new XMLHttpRequest();
      xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200) { //good

          var processedData = self.processJSON(xmlHttp.responseText, payload.config);
          self.sendSocketNotification('MMM-MYTTC-RESPONSE' + payload.unique, processedData);

        } else if (xmlHttp.readyState == 4) { //bad...
          self.sendSocketNotification('MMM-MYTTC-RESPONSE' + payload.unique, {data:null});
        }
      }
      xmlHttp.open("GET", builtURL, true); // true for asynchronous 
      xmlHttp.send(null);


    }
  },


  formatTitle: function(s) {
    var titlePieces = s.split(" - ");
    var branchNo = titlePieces[1].split(" ")[0].toUpperCase();
    var assembledTitle = branchNo + " " + titlePieces[0];
    if (titlePieces[1].indexOf(" towards ") != -1) {
      assembledTitle += " to " + titlePieces[1].split(" towards ")[1];
    }

    return assembledTitle;
  },

  processJSON: function(JSONText, config) {

    var resultList = new Array;
    var rawJSON = JSON.parse(JSONText);

    //for some reason, the JSON feed does not place single child
    //predictions in an array.  So we need to fake it in order for
    //iteration to work.  Also repeated below for directions and
    //predictionswithin directions.
    var predictionsArray = new Array();
    if (rawJSON.predictions.length) {
      predictionsArray = rawJSON.predictions
    } else {
      predictionsArray.push(rawJSON.predictions);
    }
    for (var i = 0; i < predictionsArray.length; i++) {

      var p = predictionsArray[i];
      var routeTitlePieces = p.routeTitle.split("-");
      routeTitlePieces.shift(); //remove the route number from the title
      var route = new Object({
        routeNo : Number(p.routeTag),
        stopTag : Number(p.stopTag),
        routeTitle : routeTitlePieces.join(" "), 
        stopTitle : p.stopTitle,
      });

      route.branches = new Array();

      var assembledTitle;

      if (p.dirTitleBecauseNoPredictions) { //no data for this route
        route.noSchedule = true,
        route.branches.push({
          title: this.formatTitle(p.dirTitleBecauseNoPredictions),
          nextVehicles: []
        })
      } else {

        var directionsArray = new Array();
        if (p.direction.length) {
          directionsArray = p.direction
        } else {
          directionsArray.push(p.direction);
        }

        for (var j = 0; j < directionsArray.length; j++) {
          var d = directionsArray[j];

          var minutesArray = new Array;

          var dPredictionsArray = new Array();
          if (d.prediction.length) {
            dPredictionsArray = d.prediction
          } else {
            dPredictionsArray.push(d.prediction);
          }

          for (var k = 0; k < dPredictionsArray.length; k++) {
            if (k == 3) {
              break;
            }
            minutesArray.push(Number(dPredictionsArray[k].minutes));
          }

          route.branches.push({
            title: this.formatTitle(d.title),
            nextVehicles: minutesArray
          })

        }
      }

      resultList.push(route);

    }

    //reorder resultList to match config order
    var self = this;
    var routeList = new Array();
    for (var i = 0; i < config.routeList.length; i++) {
      var matchingElement = resultList.find(function(el) {
        if (el.routeNo == config.routeList[i].routeNo && el.stopTag == config.routeList[i].stop) {
          if (config.routeList[i].label) {
            el.routeTitle = config.routeList[i].label;
          }
          if (config.routeList[i].color) {
            el.color = config.routeList[i].color;
          } 
          routeList.push(el);
          return el;
        }
      });
    }

    //return the JSON object
    return routeList

  }

});