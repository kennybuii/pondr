// chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
//   console.log(
//     sender.tab
//       ? "from a content script:" + sender.tab.url
//       : "from the extension"
//   );
//   if (request.greeting === "hey") {
//     sendResponse({ farewell: "hey from bg" });
//     var index = request.indexToPop;
//     alert("YO, WANNA CHECK OUT SOME ARTICLES?");
//   }
// });
document.addEventListener("DOMContentLoaded", function () {
  console.log("welcome to popup.js");

  document.getElementById("home").addEventListener("click", function () {
    console.log("redirecting to home");
    //window.location.href = "../options/home.html";
    chrome.tabs.create({ url: "../options/home.html" });
  });

  document.getElementById("library").addEventListener("click", function () {
    console.log("redirecting to library");
    chrome.tabs.create({ url: "../options/library.html" });
  });
  
  document.getElementById("options").addEventListener("click", function () {
    console.log("redirecting to options");
    chrome.tabs.create({ url: "../options/options.html" });
  });

  document.getElementById("in-a-minute").addEventListener("click", function () {
    var timeSelection = "minute";
    var units = 1;
    pondrAway(timeSelection, units);
    alert();
  });

  document.getElementById("preset-1").addEventListener("click", function () {
    var timeSelection = "hour";
    var units = 3;
    pondrAway(timeSelection, units);
  });

  document.getElementById("preset-2").addEventListener("click", function () {
    var timeSelection = "day";
    pondrAway(timeSelection);
  });

  document.getElementById("preset-3").addEventListener("click", function () {
    var timeSelection = "minute";
    pondrAway(timeSelection);
    alert();
  });
});

function pondrAway(timeSelection, units) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    // since only one tab should be active and in the current window at once
    // the return variable should only have one entry
    var tabArray = [];
    var activeTab = tabs[0];
    var activeTabId = activeTab.id;

    chrome.storage.sync.get("allTabsArray", function (result) {
      if (result.allTabsArray === undefined) {
        //Getting and adding to current date by 1 minute
        const currentDate = new Date();
        var savedDate = dateAdd(
          currentDate,
          timeSelection,
          units
        ).toUTCString();
        var tabInformation = [activeTab.url, savedDate, activeTabId];

        tabArray[0] = tabInformation;

        chrome.storage.sync.set({ allTabsArray: tabArray });
        //close the tab

        chrome.tabs.remove(activeTabId, function () {});
      } else {
        const currentDate = new Date();
        var savedDate = dateAdd(
          currentDate,
          timeSelection,
          units
        ).toUTCString();
        var tabInformation = [activeTab.url, savedDate, timeSelection];

        tabArray = result.allTabsArray;
        tabArray.push(tabInformation);
        chrome.storage.sync.set({ allTabsArray: tabArray });
        //close the tab

        chrome.tabs.remove(activeTabId, function () {});
      }

      console.log("array: ", result.allTabsArray);

      //console.log("this is an array: ", array);
    });
  });
}

function alert() {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "../assets/icons/pondr_128.png",
    title: "Tab closed",
    message: "We'll remind you at a later time.",
    priority: 0,
  });
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
