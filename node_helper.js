/*********************************

  Magic Mirror Module: 
  MMM-MyTTC
  https://github.com/jclarke0000/MMM-MyTTC

  By Jeff Clarke
  MIT Licensed
 
*********************************/

var NodeHelper = require("node_helper");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var convert = require('xml-js');

module.exports = NodeHelper.create({

  webServiceURL: "http://webservices.nextbus.com/service/publicXMLFeed",
  agency: "ttc",
  dataRetriver: null,

  start: function() {
    console.log("Starting node_helper for module: " + this.name);
    this.started = false;
  },

  socketNotificationReceived: function(notification, payload){
    if (notification === 'MMM-MYTTC-GET') {

      this.url = '';
      this.config = payload;

      var builtURL = this.webServiceURL + "?&command=predictionsForMultiStops&a=" + this.agency;

      var routes = this.config.routeList;
      for (var i = 0; i < routes.length; i++) {
        builtURL += "&stops=" + routes[i].routeNo + "|" + routes[i].stop;
      }

      this.url = builtURL;

      //first data pull
      this.getTTCTimes();

      if (!this.started) {
        this.started = true;
        

        //recurring data pull
        var self = this;
        this.dataRetriver = setInterval(function() {
          self.getTTCTimes();
        }, this.config.updateInterval);
      }
    }
  },

  getTTCTimes: function() {
    
    var self = this;

    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
      if (xmlHttp.readyState == 4 && xmlHttp.status == 200) { //good
        self.processXML(xmlHttp.responseText);
      } else if (xmlHttp.readyState == 4) { //bad...
        self.sendSocketNotification('MMM-MYTTC-RESPONSE', {data:null});
      }
    }
    xmlHttp.open("GET", self.url, true); // true for asynchronous 
    xmlHttp.send(null);

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
    for (var i = 0; i < this.config.routeList.length; i++) {
      var matchingElement = resultList.find(function(el) {
        if (el.routeNo == self.config.routeList[i].routeNo && el.stopTag == self.config.routeList[i].stop) {
          if (self.config.routeList[i].label) {
            el.routeTitle = self.config.routeList[i].label;
          }
          if (self.config.routeList[i].color) {
            el.color = self.config.routeList[i].color;
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