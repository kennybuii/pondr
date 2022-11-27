import { TabInfo } from "./tabinfo.js";
import { luxon } from "./scripts/luxon.min.js";
import { v4 as uuidv4 } from "./node_modules/uuid/dist/esm-browser/v4.js";
/**temp */
//to keep service worker awake
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  console.log("wake me up");
});

var notificationArray = [];
chrome.action.onClicked.addListener(function () {
  chrome.tabs.create({ url: "index.html" });
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("welcome to background.js");

  chrome.alarms.get("alarm", (a) => {
    if (!a) {
      chrome.alarms.create("alarm", { delayInMinutes: 1, periodInMinutes: 1 });
    }
  });
});

chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener((msg) => {
    console.log("got a msg");
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  sendResponse("pong");
  var tabId = JSON.parse(request).tabId;
  var tabUrl = JSON.parse(request).tabUrl;
  var tabTitle = JSON.parse(request).tabTitle;
  console.log(JSON.parse(request));
  gcal(tabUrl, tabTitle, tabId);
  //console.log(tabId + " " + tabUrl + " " + tabTitle);
});

chrome.alarms.onAlarm.addListener((a) => {
  const currentDate = new Date();
  console.log(
    "Checking if there's anything to pop..." + currentDate.toUTCString()
  );

  //need a flag to check if we've reminded once or not
  chrome.storage.sync.get("allTabsArray", function (result) {
    if (result.allTabsArray === undefined) {
      console.log("No current tabs to pop");
    } else {
      //save all the indexes of expired tabs
      var expiredTabIndices = [];

      for (var i = 0; i < result.allTabsArray.length; i++) {
        //grabbing website name
        var urlName = result.allTabsArray[i].tabUrl;
        //console.log("TAB URL: %s", urlName);

        //grabbing date associated with it + 1
        var storageDate = result.allTabsArray[i].tabDate;

        //get current time
        const currentDate = new Date().toUTCString();

        var x = Date.parse(currentDate);
        var y = Date.parse(storageDate);
        // console.log(currentDate);
        // console.log(storageDate);
        if (x > y) {
          console.log("Found an expired tab!");
          expiredTabIndices.push(i);
          //check if there are any things to pop
        }
      }
      //check isCreated from storage

      //if undefined then create one and assign it to false
      if (expiredTabIndices.length === 0) {
        //do nothing since empty
        console.log("Found nothing to pop.");
      } else {
        //else if isCreated == false, alert and set it to true
        //store in storage
        console.log("Found %d index(es) to pop.", expiredTabIndices.length);
        chrome.storage.sync.set({ expiredTabArray: expiredTabIndices });

        //After we found all indices (if any) associated to expired tabs, call alert()
        alert();
      }
    }
  });
});

async function alert() {
  console.log("Alert getting created");
  var result = await getExpiredIndices();
  var numberOfExpiredTabs = result.expiredTabArray.length;
  //new idea, when tabs are created, push notificationid into an array. before creating next noitification, go thru array and clear all notifications.
  notificationArray = await getNotificationArray();
  var id = uuidv4();
  //console.log(notificationArray);
  if (notificationArray === undefined) {
    notificationArray = [];
  }
  for (var i = 0; i < notificationArray.length; i++) {
    chrome.notifications.clear(notificationArray[i]);
  }

  var msg = `Ta daa! Your tab(s) are ready.`;
  chrome.notifications.create(
    id,
    {
      type: "basic",
      iconUrl: "assets/icons/pondr_128.png",
      title: "Pondr",
      message: msg,
      priority: 1,
      requireInteraction: true,
      buttons: [
        {
          //get indexes from storage pop them when user re-opens tabs
          title: "Open",
        },
        {
          title: "Later",
          //get indexes, shift all times, pop them since they are no longer in the outdated subarray
        },
      ],
    },
    function () {
      //console.log("CREATED!");
      notificationArray.push(id);
      chrome.storage.sync.set({ notificationArray: notificationArray });
    }
  );
}
async function getNotificationArray() {
  //check
  var expiredIndices;
  async function getLocalStorageValue(key) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.sync.get(key, function (value) {
          resolve(value);
        });
      } catch (ex) {
        reject(ex);
      }
    });
  }
  const result = await getLocalStorageValue("notificationArray");

  return result.notificationArray;
}

async function getExpiredIndices() {
  //check
  var expiredIndices;
  async function getLocalStorageValue(key) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.sync.get(key, function (value) {
          resolve(value);
        });
      } catch (ex) {
        reject(ex);
      }
    });
  }
  const result = await getLocalStorageValue("expiredTabArray");

  return result;
}

async function getAllTabsArray() {
  async function getLocalStorageValue(key) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.sync.get(key, function (value) {
          resolve(value);
        });
      } catch (ex) {
        reject(ex);
      }
    });
  }
  const result = await getLocalStorageValue("allTabsArray");
  return result;
}
chrome.notifications.onButtonClicked.addListener(async function (
  notifId,
  btnIdx
) {
  var result1 = await getExpiredIndices();
  var result2 = await getAllTabsArray();
  var expiredTabArray = await result1.expiredTabArray;
  var allTabsArray = await result2.allTabsArray;

  if (btnIdx === 0) {
    //if yes open tabs
    console.log("hit yes");
    console.log("Before popping allTabsArray: ", allTabsArray);
    console.log("Before popping expiredTabsArray: ", expiredTabArray);
    openTabsNow(expiredTabArray, allTabsArray);
  } else if (btnIdx === 1) {
    console.log("hit later");

    console.log("Before popping allTabsArray: ", allTabsArray);
    console.log("Before popping expiredTabsArray: ", expiredTabArray);
    openTabsLater(expiredTabArray, allTabsArray);
    //if no reapply reminder-setting
    //FOR TIME BEING: will be hardcoded to push all items 3 hrs forward
  }
});

async function openTabsLater(expiredTabArray, allTabsArray) {
  var expiredTabLength = expiredTabArray.length;
  var allTabsArrayLength = allTabsArray.length;
  for (var i = expiredTabLength; i >= 0; i--) {
    //open the tabs
    for (var j = allTabsArrayLength; j >= 0; j--) {
      if (j === expiredTabArray[i]) {
        if (allTabsArray[j].isGcal != true) {
          console.log("Storing at %d", j);
          //open tab
          var currentDate = new Date();

          var savedDate = dateAdd(currentDate, "hour", 3);

          allTabsArray[j].tabDate = savedDate.toUTCString();

          chrome.storage.sync.set({ allTabsArray: allTabsArray });
        } else if (allTabsArray[j].isGcal == true) {
          //do something nefarious
          var id = allTabsArray[j].timeSelection;
          console.log("THIS IS IDDDDDDD");
          var test = base32.encode(new Buffer(id, "hex"));
          console.log(id);
          console.log(test);
          chrome.identity.getAuthToken(
            { interactive: true },
            async function (token) {
              delEvent(id);
            }
          );
          //and call gcal again
        }
      }
    }

    expiredTabArray.splice(i, 1);
  }
  chrome.storage.sync.set({ expiredTabArray: expiredTabArray });

  var result = await getAllTabsArray();
  var result1 = await getExpiredIndices();
  console.log("After popping, allTabsArray: ", result.allTabsArray);
  console.log("After popping, expiresTabArray: ", result1.expiredTabArray);
}

// chrome.identity.getAuthToken({ interactive: true }, async function (token) {
//   //Settings for GET request
//   let init = {
//     method: "GET",
//     async: true,
//     headers: {
//       Authorization: "Bearer " + token,
//       "Content-Type": "application/json",
//     },
//     contentType: "json",
//   };

//   //GET PRIMARY CALENDAR
//   async function getCalendarId() {
//     return new Promise((resolve) => {
//       fetch("https://www.googleapis.com/calendar/v3/calendars/primary", init)
//         .then((response) => response.json()) // Transform the data into json
//         .then(function (data) {
//           console.log(data["id"]);
//           var id = data["id"];
//           resolve(id);
//         })
//         .catch((err) => console.log(err));
//     });
//   }
//   //Wait until the function is done
//   calendarId = await getCalendarId();

//DELETE EVENT
//problem should arise in the request if anyhting
//also fix weird bug with night time event
function delEvent(id) {
  var eventId = id;

  chrome.identity.getAuthToken({ interactive: true }, async function (token) {
    let deleteRequest = {
      method: "DELETE",
      async: true,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      contentType: "json",
    };
    async function deleteEvent(eventId) {
      return new Promise((resolve) => {
        fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events/" +
            eventId,
          deleteRequest
        )
          .then((response) => response.json()) // Transform the data into json
          .then(function (data) {
            console.log(data);
            resolve(data);
          })
          .catch((err) => console.log(err));
      });
    }
    deleteEvent(eventId);
  });
}
async function openTabsNow(expiredTabArray, allTabsArray) {
  var expiredTabLength = expiredTabArray.length;
  var allTabsArrayLength = allTabsArray.length;
  for (var i = expiredTabLength; i >= 0; i--) {
    //open the tabs
    for (var j = allTabsArrayLength; j >= 0; j--) {
      if (j === expiredTabArray[i]) {
        console.log("Popping at %d", j);
        //open tab
        chrome.tabs.create({ url: allTabsArray[j].tabUrl });
        allTabsArray.splice(j, 1);
        chrome.storage.sync.set({ allTabsArray: allTabsArray });
      }
    }

    expiredTabArray.splice(i, 1);
  }
  chrome.storage.sync.set({ expiredTabArray: expiredTabArray });

  var result = await getAllTabsArray();
  var result1 = await getExpiredIndices();
  console.log("After popping, allTabsArray: ", result.allTabsArray);
  console.log("After popping, expiresTabArray: ", result1.expiredTabArray);
}

//**GOING TO HAVE TO MAKE CHANGES FOR  THIS FUNCTION AT SOME POINT */
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
            console.log(eventRequest);
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
            console.log(checkBusyRequest);
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

      var today = date.getHours();
      if (today < 9) {
        startT = "09:00";
        endT = "09:30";
      }
      //EXPERIMENTAL
      if (today > 21) {
        startT = "09:00";
        endT = "09:30";
        date.setDate(date.getDate() + 1);
      }

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
      var today = date.getHours();
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

      if (date.getHours() < 9) {
        endT = "09:15";
      }
      //EXPERIMENTAL
      if (today > 21) {
        endT = "09:30";
        date.set(date.getDate() + 1);
      }

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
        id: uuidv4(),
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
      console.log(eventObj);
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

    pondrAwaySetTime(reminderDate.toUTCString(), tabUrl, tabId, eventObj.id);
  });
}
function pondrAwaySetTime(gcalDate, tabUrl, tabId, id) {
  //Grabs the current tab
  var isGcal = true;
  var timeSelection = id;

  var tabArray = [];

  //Grab array of all tabs from storage
  chrome.storage.sync.get("allTabsArray", function (result) {
    //If the array is empty, will be undefined, so assign it to be empty instead
    if (result.allTabsArray === undefined) {
      result.allTabsArray = [];
    }

    Date.now().toString();
    //Save and reformat date
    var savedDate = gcalDate;

    console.log("WEE WOOO %s", id);

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
    chrome.storage.sync.set({ allTabsArray: tabArray });
    //Close the tab
    //chrome.tabs.remove(tabId, function () {});
  });
}
