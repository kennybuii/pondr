/**temp */
chrome.action.onClicked.addListener(function () {
  chrome.tabs.create({ url: "index.html" });
});

// chrome.identity.getAuthToken({ interactive: true }, function (token) {
//   // Use the token.
//   console.log(token);
// });
chrome.runtime.onInstalled.addListener(() => {
  console.log("welcome to background.js");

  chrome.alarms.get("alarm", (a) => {
    if (!a) {
      chrome.alarms.create("alarm", { delayInMinutes: 1, periodInMinutes: 1 });
    }
  });
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
          // chrome.runtime.sendMessage({ greeting: "hey", indexToPop }, function (response) {
          //   //var x = response.farewell;
          //   //console.log(x);
          // });
        }
      }

      if (expiredTabIndices.length === 0) {
        //do nothing since empty
        console.log("Found nothing to pop.");
      } else {
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

  var msg = `You have ${numberOfExpiredTabs} tabs overdue. Open them now?`;
  chrome.notifications.create(
    {
      type: "basic",
      iconUrl: "assets/icons/pondr_128.png",
      title: "Reminder tabs",
      message: msg,
      priority: 2,
      requireInteraction: true,
      buttons: [
        {
          //get indexes from storage pop them when user re-opens tabs
          title: "Yes",
        },
        {
          title: "Later",
          //get indexes, shift all times, pop them since they are no longer in the outdated subarray
        },
      ],
    },
    function (id) {
      myNotificationID = id;
    }
  );
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

  if (notifId === myNotificationID) {
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
        } else {
          //do something nefarious
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
