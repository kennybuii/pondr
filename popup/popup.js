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
