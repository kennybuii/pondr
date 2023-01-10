import { TabInfo } from "./tabinfo.js";
import { luxon } from "./scripts/luxon.min.js";
import { v4 as uuidv4 } from "./node_modules/uuid/dist/esm-browser/v4.js";

//To keep service worker awake
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  console.log("wake me up");
});

//Create periodic alarm
chrome.runtime.onInstalled.addListener(() => {
  console.log("welcome to background.js");

  chrome.alarms.get("alarm", (a) => {
    if (!a) {
      chrome.alarms.create("alarm", { periodInMinutes: 1 });
    }
  });
});

//Check for any expired tabs
chrome.alarms.onAlarm.addListener(() => {
  const currentDate = new Date();
  console.log(
    "Checking if there's anything to pop..." + currentDate.toLocaleString()
  );

  chrome.storage.local.get("allTabsArray", function (result) {
    if (result.allTabsArray === undefined) {
      console.log("No current tabs to pop");
    } else {
      var expiredTabIndices = [];

      for (var i = 0; i < result.allTabsArray.length; i++) {
        var storageDate = Date.parse(result.allTabsArray[i].tabDate);
        const currentDate = Date.parse(new Date().toUTCString());
        //Storage date is expired
        if (currentDate > storageDate) {
          console.log("Found an expired tab!");
          expiredTabIndices.push(i);
        }
      }
      //No expired tabs
      if (expiredTabIndices.length === 0) {
        console.log("Found nothing to pop.");
      }
      //Store expired tabs array
      else {
        console.log("Found %d index(es) to pop.", expiredTabIndices.length);
        chrome.storage.local.set({ expiredTabArray: expiredTabIndices });
        alert();
      }
    }
  });
});

//Create and display alert notification
async function alert() {
  console.log("Alert getting created");

  chrome.notifications.clear("potato", function () {});
  chrome.notifications.create("potato", {
    type: "basic",
    iconUrl: "assets/icons/pondr_128.png",
    title: "Pondr",
    message: "Ta daa! Your tab(s) are ready.",
    priority: 1,
    requireInteraction: true,
    buttons: [
      {
        title: "Open",
      },
      {
        title: "Later",
      },
    ],
  });
}

//Notifications popup options
chrome.notifications.onButtonClicked.addListener(async function (
  notificationId,
  btnIdx
) {
  var result1 = await getExpiredIndices();
  var result2 = await getAllTabsArray();
  var expiredTabArray = await result1.expiredTabArray;
  var allTabsArray = await result2.allTabsArray;

  //If user hit open
  if (btnIdx === 0) {
    console.log("OPEN");
    console.log("Before popping allTabsArray: ", allTabsArray);
    console.log("Before popping expiredTabsArray: ", expiredTabArray);
    openTabsNow(expiredTabArray, allTabsArray);
  }
  //If user hit later
  else if (btnIdx === 1) {
    console.log("LATER");
    console.log("Before popping allTabsArray: ", allTabsArray);
    console.log("Before popping expiredTabsArray: ", expiredTabArray);
    openTabsLater(expiredTabArray, allTabsArray);
    //if no reapply reminder-setting
    //FOR TIME BEING: will be hardcoded to push all items 3 hrs forward
  }
});

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
        chrome.storage.local.set({ allTabsArray: allTabsArray });
      }
    }

    expiredTabArray.splice(i, 1);
  }
  chrome.storage.local.set({ expiredTabArray: expiredTabArray });

  var result = await getAllTabsArray();
  var result1 = await getExpiredIndices();
  console.log("After popping, allTabsArray: ", result.allTabsArray);
  console.log("After popping, expiresTabArray: ", result1.expiredTabArray);
}

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

          chrome.storage.local.set({ allTabsArray: allTabsArray });
        } else if (allTabsArray[j].isGcal == true) {
          console.log("xDXDXDXD");
          console.log(allTabsArray[j]);
          var id = allTabsArray[j].timeSelection;
          var tabTitle, tabUrl;
          allTabsArray.splice(j, 1);
          chrome.storage.local.set({ allTabsArray: allTabsArray });

          chrome.identity.getAuthToken(
            { interactive: true },
            async function (token) {
              //deleting event first? then retrieving? that doesnt make sense
              await getEvent(id, token, (result) => {
                console.log(result);
              });
              // console.log(tabTitle + " " + tabUrl);
              // //PROBLEM IS HAPPENING HERE
              // await gcal(tabUrl, tabTitle, token);
              // await delEvent(id, token);
              // //console.log(allTabsArray[j]);
              // chrome.storage.local.set({ allTabsArray: allTabsArray });
            }
          );
        }
      }
    }
    expiredTabArray.splice(i, 1);
  }
  chrome.storage.local.set({ expiredTabArray: expiredTabArray });

  var result = await getAllTabsArray();
  var result1 = await getExpiredIndices();
  console.log("After popping, allTabsArray: ", result.allTabsArray);
  console.log("After popping, expiresTabArray: ", result1.expiredTabArray);
}

//Helper function: returns array of expired tab indices
async function getExpiredIndices() {
  async function getLocalStorageValue(key) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.get(key, function (value) {
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
//Helper function: returns array of all tabs
async function getAllTabsArray() {
  async function getLocalStorageValue(key) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.get(key, function (value) {
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

/*GOOGLE CALENDAR FUNCTIONALITY BELOW */
/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  sendResponse("pong");
  var tabId = JSON.parse(request).tabId;
  var tabUrl = JSON.parse(request).tabUrl;
  var tabTitle = JSON.parse(request).tabTitle;
  console.log(JSON.parse(request));

  //Chrome's Identity API let's us make an OAuth request
  chrome.identity.getAuthToken({ interactive: true }, async function (token) {
    var ken = await gcal(tabUrl, tabTitle, token);
    console.log(ken);
  });
});

async function getEvent(id, token, callback) {
  var eventId = id;

  let getRequest = {
    method: "GET",
    async: true,
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    contentType: "json",
  };

  async function retrieve(eventId) {
    return new Promise((resolve) => {
      fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events/" +
          eventId,
        getRequest
      )
        .then((response) => response.json()) // Transform the data into json
        .then(function (data) {
          var summary = data["summary"];
          var description = data["description"];
          resolve([summary, description]);
        })
        .catch((err) => console.log(err));
    });
  }
  var result = await retrieve(eventId);
  callback(result);
}

//DELETE EVENT
//problem should arise in the request if anyhting
//also fix weird bug with night time event
async function delEvent(id, token) {
  var eventId = id;

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
          console.log("DELETED!!!!!!!!!!!!!!!!!!");
          resolve(data);
        })
        .catch((err) => console.log(err));
    });
  }
  await deleteEvent(eventId);
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
async function gcal(tabUrl, tabTitle, token) {
  await delay(3000);
  var calendarId;
  var reminderDate;

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

  var year = dateObj.getFullYear();
  var currentDate = year + "-0" + month + "-" + day;

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
      fetch("https://www.googleapis.com/calendar/v3/freeBusy", checkBusyRequest)
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
    console.log(today);
    //EXPERIMENTAL
    if (today > 21) {
      startT = "09:00";
      endT = "09:30";
      dateObj = new Date();
      month = dateObj.getMonth() + 1; //months from 1-12
      day = dateObj.getDate() + 1;

      year = dateObj.getFullYear();
      currentDate = year + "-0" + month + "-" + day;
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
      dateObj = new Date();
    }
    //EXPERIMENTAL
    if (today > 21) {
      endT = "09:15";
      dateObj = new Date();
      month = dateObj.getMonth() + 1; //months from 1-12
      day = dateObj.getDate() + 1;

      year = dateObj.getFullYear();
      currentDate = year + "-0" + month + "-" + day;
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
      id: rnd(55),
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

    console.log(eventObj.start.dateTime);
    console.log(Date.parse(eventObj.start.dateTime));
    console.log(Date.parse("2023-01-2T21:15:00-08:00"));

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
  console.log(reminderDate);

  pondrAwaySetTime(reminderDate.toUTCString(), tabUrl, eventObj.id, tabTitle);
  console.log(reminderDate.toUTCString());
  return reminderDate.toUTCString();
}
function pondrAwaySetTime(gcalDate, tabUrl, id, tabTitle) {
  //Grabs the current tab
  var isGcal = true;
  var timeSelection = id;

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
    console.log("reeeeeeeeeeeeeeeeeeeeeeeeeeee");
    console.log(savedDate);
    //Store url, date, and the time they wanted to be reminded again
    var uuid = uuidv4();

    var tabInfo = new TabInfo(
      uuid,
      tabUrl,
      savedDate,
      timeSelection,
      false,
      isGcal,
      tabTitle
    );
    console.log("heeeeeeeeeeeeeeeeeeeee");
    console.log(tabInfo);
    tabArray = result.allTabsArray;
    tabArray.push(tabInfo);
    chrome.storage.local.set({ allTabsArray: tabArray });
    //Close the tab
    //chrome.tabs.remove(id, function () {});
  });
}

const rnd = (() => {
  const gen = (min, max) =>
    max++ && [...Array(max - min)].map((s, i) => String.fromCharCode(min + i));

  const sets = {
    num: gen(48, 57),
    alphaLower: gen(97, 118),
  };

  function* iter(len, set) {
    if (set.length < 1) set = Object.values(sets).flat();
    for (let i = 0; i < len; i++) yield set[(Math.random() * set.length) | 0];
  }

  return Object.assign(
    (len, ...set) => [...iter(len, set.flat())].join(""),
    sets
  );
})();

const delay = (ms) => new Promise((res) => setTimeout(res, ms));
