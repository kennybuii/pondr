import { TabInfo } from "../tabinfo.js";
import { v4 as uuidv4 } from "../node_modules/uuid/dist/esm-browser/v4.js";

document.addEventListener("DOMContentLoaded", function () {
  console.log("welcome to popup.js");
  /*SETTING UP BUTTON LISTENERS ON POPUP PAGE */
  /*Home/Library/Options pages */
  document.getElementById("home").addEventListener("click", function () {
    console.log("redirecting to home");
    chrome.tabs.create({ url: "../options/home.html" });
  });

  document.getElementById("library").addEventListener("click", function () {
    console.log("redirecting to library");
    chrome.tabs.create({ url: "../options/library.html" });
  });

  document.getElementById("options").addEventListener("click", function () {
    console.log("redirecting to options");
    chrome.tabs.create({ url: "./options.html" });
  });

  document.getElementById("in-a-minute").addEventListener("click", function () {
    var timeSelection = "minute";
    var units = 1;
    var isGcal = false;
    pondrAway(timeSelection, units, isGcal);
    alert();
  });
  /*Presets */
  document.getElementById("preset-1").addEventListener("click", function () {
    var timeSelection = "hour";
    var units = 3;
    var isGcal = false;

    pondrAway(timeSelection, units, isGcal);
    alert();
  });

  // document.getElementById("preset-2").addEventListener("click", function () {
  //   var timeSelection = "day";
  //   pondrAway(timeSelection);
  //   alert();
  // });

  document.getElementById("gcal").addEventListener("click", async function () {
    //chain();

    //send taburl, tabtitle, and tabid then close
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      //Grab current tab info

      var tabUrl = tabs[0].url;
      var tabTitle = tabs[0].title;
      var tabId = tabs[0].id;

      let tabObject = {
        tabUrl: tabUrl,
        tabTitle: tabTitle,
        tabId: tabId,
      };
      ping(JSON.stringify(tabObject));
      chrome.tabs.remove(tabId, function () {});
    });
  });
});
function ping(tabObject) {
  chrome.runtime.sendMessage(tabObject, (response) => {
    if (chrome.runtime.lastError) {
      setTimeout(ping, 1000);
    } else {
      console.log("received");
      console.log(response);
    }
  });
}
async function chain() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    //Grab current tab info

    var tabUrl = tabs[0].url;
    var tabTitle = tabs[0].title;
    var tabId = tabs[0].id;
    //gcal(tabUrl, tabTitle, tabId);
    //chrome.tabs.remove(tabId, function () {});
  });
}

/*SlEEPS THE TAB */
function pondrAway(timeSelection, units, isGcal) {
  //Grabs the current tab
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    //Grab current tab info
    var tabArray = [];
    var activeTab = tabs[0];
    var activeTabId = activeTab.id;
    var activeTabTitle = activeTab.title;

    //Grab array of all tabs from storage
    chrome.storage.local.get("allTabsArray", function (result) {
      //If the array is empty, will be undefined, so assign it to be empty instead
      if (result.allTabsArray === undefined) {
        result.allTabsArray = [];
      }

      Date.now().toString();
      //Save and reformat date
      const currentDate = new Date();
      var savedDate = dateAdd(currentDate, timeSelection, units).toUTCString();
      console.log(savedDate);
      //Store url, date, and the time they wanted to be reminded again
      var tabInformation = [activeTab.url, savedDate, timeSelection];

      //var uuid;

      var uuid = uuidv4();

      var tabInfo = new TabInfo(
        uuid,
        activeTab.url,
        savedDate,
        timeSelection,
        false,
        isGcal,
        activeTabTitle
      );
      console.log("SDFSFASD");
      console.log(tabInfo);

      //Assign array of all tabs from memory into temp tabArray and store again
      // tabArray = result.allTabsArray;
      // tabArray.push(tabInformation);
      // chrome.storage.local.set({ allTabsArray: tabArray });

      /*NEW */
      tabArray = result.allTabsArray;
      tabArray.push(tabInfo);
      chrome.storage.local.set({ allTabsArray: tabArray });
      //Close the tab
      chrome.tabs.remove(activeTabId, function () {});
    });
  });
}

function pondrAwaySetTime(gcalDate, tabUrl, tabId) {
  //Grabs the current tab
  var isGcal = true;
  var timeSelection = "custom";

  var tabArray = [];

  //Grab array of all tabs from storage
  chrome.storage.local.get("allTabsArray", function (result) {
    //If the array is empty, will be undefined, so assign it to be empty instead
    if (result.allTabsArray === undefined) {
      result.allTabsArray = [];
    }

    Date.now().toString();
    //Save and reformat date
    var savedDate = gcalDate;

    console.log("WEE WOOO");

    console.log(savedDate);
    //Store url, date, and the time they wanted to be reminded again
    var uuid = uuidv4();

    var tabInfo = new TabInfo(
      uuid,
      tabUrl,
      savedDate,
      timeSelection,
      false,
      isGcal
    );

    tabArray = result.allTabsArray;
    tabArray.push(tabInfo);
    chrome.storage.local.set({ allTabsArray: tabArray });
    //Close the tab
    //chrome.tabs.remove(tabId, function () {});
  });
}

/*ALERT NOTIFICATION  */
function alert() {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "../assets/icons/pondr_128.png",
    title: "Tab queued",
    message: "We'll remind you at a later time.",
    priority: 0,
  });
}
//3 main functions: getCalendarId(), checkCalendar(), createEvent()

/*CRUD calls are made via HTTP requests, using Fetch API. fetch() takes two parameters
the settings for the type of CRUD call you want to make and the URL for the request*/

/*Since fetch() calls are asynchronous, they won't return a value right away
Instead they return promises, therefore we have to make sure to return the resolution
to the promises and not just the actual value */

/*Personal note: before we were searching for next 10 minute interval and slotting 15 minute event, times will not line up and create 5 minute 
gap b/w events, solved by changing to searching next 15 minute intervals.
also have to test what is an optimal buffer period b/w hitting button and booking event, is 15 minutes too short? too long? will have to change 
the checkCalendar() function and request call*/
function gcal(tabUrl, tabTitle, tabId) {
  var calendarId;
  var reminderDate;

  //Chrome's Identity API let's us make an OAuth request
  chrome.identity.getAuthToken({ interactive: true }, async function (token) {
    //Settings for GET request
    let init = {
      method: "GET",
      async: true,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      contentType: "json",
    };

    //GET PRIMARY CALENDAR
    async function getCalendarId() {
      return new Promise((resolve) => {
        fetch("https://www.googleapis.com/calendar/v3/calendars/primary", init)
          .then((response) => response.json()) // Transform the data into json
          .then(function (data) {
            console.log(data["id"]);
            var id = data["id"];
            resolve(id);
          })
          .catch((err) => console.log(err));
      });
    }
    //Wait until the function is done
    calendarId = await getCalendarId();

    //Computed variable to get the ceiling time of a date
    let getRoundedDate = (minutes, d = new Date()) => {
      let ms = 1000 * 60 * minutes; // convert minutes to ms
      let roundedDate = new Date(Math.ceil(d.getTime() / ms) * ms);

      return roundedDate;
    };
    //Round the date to the nearest next 10 minutes
    var x = 10;
    var roundedDate = getRoundedDate(x);

    //Get current date
    var dateObj = new Date();
    var month = dateObj.getMonth() + 1; //months from 1-12
    var day = dateObj.getDate();
    console.log(day);
    var year = dateObj.getFullYear();
    var currentDate = year + "-" + month + "-" + day;

    /*We use Google's checkBusy API to check a current timeslot, therefore we need the start and end of that time block */
    var start = roundedDate.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "numeric",
      minute: "numeric",
    });
    var end = new Date(
      roundedDate.setMinutes(roundedDate.getMinutes() + 30)
    ).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "numeric",
      minute: "numeric",
    });
    //Get current timezone
    let timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    //Get GMT difference
    var DateTime = luxon.DateTime;
    const dt = new Date();
    let d = DateTime.fromISO(dt.toISOString(), { zone: timezone });
    let GMTOffset = d.toFormat("ZZ");

    var changeDate;
    var date;
    var startTime;
    var endTime;
    var timeWindowObj;

    var eventObj;
    var eventRequest;

    var busyOrNah;

    //CREATE EVENT
    async function createEvent() {
      return new Promise((resolve) => {
        fetch(
          "https://www.googleapis.com/calendar/v3/calendars/" +
            calendarId +
            "/events",
          eventRequest
        )
          .then((response) => response.json()) // Transform the data into json
          .then(function (data) {
            console.log(data);
            resolve(data);
          })
          .catch((err) => console.log(err));
      });
    }

    //CHECK CALENDAR

    async function checkCalendar() {
      return new Promise((resolve) => {
        fetch(
          "https://www.googleapis.com/calendar/v3/freeBusy",
          checkBusyRequest
        )
          .then((response) => response.json()) // Transform the data into json
          .then(function (data) {
            console.log(data);
            var busy = data["calendars"][calendarId]["busy"].length;
            resolve(busy);
          })
          .catch((err) => console.log(err));
      });
    }

    /*This will scan through calendar and find soonest available time 10 minutes from now (rounded up) */
    function createCheckBusyRequest(date) {
      roundedDate = getRoundedDate(15, date);

      //This is the 30 minute window, startT and endT
      startT = roundedDate.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "numeric",
        minute: "numeric",
      });
      var endT = new Date(
        roundedDate.setMinutes(roundedDate.getMinutes() + 30)
      ).toLocaleTimeString("en-US", {
        hour12: false,
        hour: "numeric",
        minute: "numeric",
      });

      date = {
        value: currentDate,
      };
      startTime = {
        value: startT,
      };
      endTime = {
        value: endT,
      };
      //Create the time window object for the checkBusy request
      timeWindowObj = {
        timeMin: date.value + "T" + startTime.value + ":00" + GMTOffset,
        timeMax: date.value + "T" + endTime.value + ":00" + GMTOffset,
        items: [
          {
            id: calendarId,
          },
        ],
        timeZone: timezone,
      };
      console.log("scanning");
      console.log(timeWindowObj);
      var checkBusyRequest = {
        method: "POST",
        async: true,
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(timeWindowObj),
      };

      return [checkBusyRequest, startT];
    }
    //This will take the start time (10 minutes from now rounded up) and create a 15 minute event
    //Not sure why events aren't stacked anymore

    function createEventRequest(date, startT) {
      //Set up some date data

      roundedDate = getRoundedDate(15, date);
      //This is the 15 minute event, startT and endT
      var startX = startT;
      var endT = new Date(
        roundedDate.setMinutes(roundedDate.getMinutes() + 15)
      ).toLocaleTimeString("en-US", {
        hour12: false,
        hour: "numeric",
        minute: "numeric",
      });

      date = {
        value: currentDate,
      };
      startTime = {
        value: startX,
      };
      endTime = {
        value: endT,
      };

      //Create an event object for the event request
      eventObj = {
        //So the reason why it's not filling in that gap is because of here
        end: {
          dateTime: date.value + "T" + endTime.value + ":00" + GMTOffset,
          timeZone: timezone,
        },
        start: {
          dateTime: date.value + "T" + startTime.value + ":00" + GMTOffset,
          timeZone: timezone,
        },
        summary: tabTitle,
        description: tabUrl,
      };

      reminderDate = new Date(eventObj.start.dateTime);

      var eventRequestX = {
        method: "POST",
        async: true,
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventObj),
      };
      return [eventRequestX, reminderDate];
    }

    while (busyOrNah != 0) {
      var i = 0;
      console.log(i);
      i++;
      changeDate = new Date();
      changeDate.setMinutes(changeDate.getMinutes() + x);
      x = x + 10;

      var [checkBusyRequest, startT] = createCheckBusyRequest(changeDate);

      busyOrNah = await checkCalendar();
      if (busyOrNah == 0) {
        console.log(timeWindowObj);
        [eventRequest, reminderDate] = createEventRequest(changeDate, startT);
        //console.log(reminderDate);
        var create = await createEvent();
        console.log("breaking");
        break;
      }
      console.log("busy or nah: %d", busyOrNah);
    }
    console.log("escaped the matrics");
    //console.log(reminderDate);

    //pondrAwaySetTime(reminderDate.toUTCString(), tabUrl, tabId);
  });
}

//**GOING TO HAVE TO MAKE CHANGES FOR  THIS FUNCTION AT SOME POINT */
/*Right now it only ADDS time, we need to set time */
/**
 * Adds time to a date. Modelled after MySQL DATE_ADD function.
 * Example: dateAdd(new Date(), 'minute', 30)  //returns 30 minutes from now.
 * https://stackoverflow.com/a/1214753/18511
 *
 * @param date  Date to start with
 * @param interval  One of: year, quarter, month, week, day, hour, minute, second
 * @param units  Number of units of the given interval to add.
 */
function dateAdd(date, interval, units) {
  if (!(date instanceof Date)) return undefined;
  var ret = new Date(date); //don't change original date
  var checkRollover = function () {
    if (ret.getDate() != date.getDate()) ret.setDate(0);
  };
  switch (String(interval).toLowerCase()) {
    case "year":
      ret.setFullYear(ret.getFullYear() + units);
      checkRollover();
      break;
    case "quarter":
      ret.setMonth(ret.getMonth() + 3 * units);
      checkRollover();
      break;
    case "month":
      ret.setMonth(ret.getMonth() + units);
      checkRollover();
      break;
    case "week":
      ret.setDate(ret.getDate() + 7 * units);
      break;
    case "day":
      ret.setDate(ret.getDate() + units);
      break;
    case "hour":
      ret.setTime(ret.getTime() + units * 3600000);
      break;
    case "minute":
      ret.setTime(ret.getTime() + units * 60000);
      break;
    case "second":
      ret.setTime(ret.getTime() + units * 1000);
      break;
    default:
      ret = undefined;
      break;
  }
  return ret;
}
