import { user } from "user-profile";
import { geolocation } from "geolocation";
import { HeartRateSensor } from "heart-rate";
import clock from "clock";
import document from "document";
import { preferences } from "user-settings";
import * as util from "../common/utils";

// gets user information
function getAge() {
  return user.age ? user.age : 30;
}

function getBasal() {
  return user.restingHeartRate ? user.restingHeartRate : 70;
}

// calculates the day of the year
function getDay() {
    var d = new Date();
    var month = d.getMonth();
    var day = d.getDate();
    var array = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var dayofyear = 0;
    
    if (month == 1 && day == 29) {
	dayofyear = 59;
    }
    else { 
	for (var i = 0; i < month; i++) {
	    dayofyear += array[i];
	}
	dayofyear += day;
    }
  return dayofyear;
}

// calculates hour number
function getHour() {
    var d = new Date();
    var hour = d.getHours();
    var minute = d.getMinutes();
    var time = hour + minute / 60;
    return time;
}

var watchID = geolocation.watchPosition(locationSuccess, locationError);
var lat;

function locationSuccess(position) {
    console.log("Latitude: " + position.coords.latitude,
                "Longitude: " + position.coords.longitude);
  lat = position.coords.latitude;
  geolocation.clearWatch(watchID);
}

function locationError(error) {
  console.log("Error: " + error.code,
              "Message: " + error.message);
}

// gets current HR
const hrm = new HeartRateSensor();
hrm.start();

function getCurrentHeartRate() {
  return hrm.heartRate ? hrm.heartRate : getBasal();
}

// fills the triangles
function fillTriangle(percent) {
    var numTri = Math.round(percent * 12);
    var i;
  if (numTri > 12) {
    document.getElementById("status").href="warning-solid.png";
    for (i = 0; i < 12; i++) {
	    var id = "tri" + i;
	    document.getElementById(id).href="yellow.png";
    }

    for (i = 0; i < Math.min(numTri - 12, 12); i++) {
    	var id = "tri" + i;
	    document.getElementById(id).href="orange.png";
    }
  }
 else {
   document.getElementById("status").href="drop-solid.png";
    for (i = 0; i < 12; i++) {
	    var id = "tri" + i;
	    document.getElementById(id).href="blue.png";
    }

    for (i = 0; i < numTri; i++) {
	    var id = "tri" + i;
    	document.getElementById(id).href="yellow.png";
    }
  }
} 

var cumulativeSun = 0;

function applySunscreen() {
  // resets cumulative sunscreen wear to 0
  cumulativeSun = 0;
  fillTriangle(cumulativeSun);
}

let status = document.getElementById("status");
status.onclick = function(e) {
  applySunscreen();
}

function dayShift(day) {
  // day from 1 to 365
  // center shifts from -16 to 16 on uv index maps
  return 16 * Math.cos(day * 2 * Math.PI / 365);
}

function uv(lat, day) {
  // lat [-90, 90] day [1, 365]
  // maximum uv index: 16
  return Math.max(
    16 * Math.cos(Math.PI / 126 * (lat + dayShift(day))), 
    0);
}

function timePower(hour) {
  // hour [0, 24]
  if (6 <= hour && hour < 18) {
    return Math.sin(Math.PI / 12 * (hour - 6));
  }
  else {
    return 0;
  }
}

function perspiration(reserve) {
  // reserve [0, 1], fraction from basal to max heart rate
  return Math.min(Math.exp(3.6 * reserve), 12);
}

function reapplyTime(lat, day, hour, reserve) {
  // returns time in minutes
  return 3000 / (timePower(hour) * perspiration(reserve) * 
  (8 + uv(lat, day)));
}

function onMinute() {
  var latitude = lat ? lat : 42.7;
  console.log("lat: " + latitude);
  var day = getDay();
  var basal = getBasal();
  var maxHR = 220 - getAge();
  var reserve = (getCurrentHeartRate() - basal) / (maxHR - basal);
  var hour = getHour();
  hour = 12;
  cumulativeSun += 5 / reapplyTime(latitude, day, hour, reserve);
  fillTriangle(cumulativeSun);
  console.log(cumulativeSun);
}

// Update the clock every second
clock.granularity = "seconds";

// Get a handle on the <text> element
const myLabel = document.getElementById("myLabel");

// Update the <text> element every tick with the current time
clock.ontick = (evt) => {
  let today = evt.date;
  let hours = today.getHours();
  if (preferences.clockDisplay === "12h") {
    // 12h format
    hours = hours % 12 || 12;
  } else {
    // 24h format
    hours = util.zeroPad(hours);
  }
  let mins = util.zeroPad(today.getMinutes());
  myLabel.text = `${hours}:${mins}`;
  onMinute();
}
