document.addEventListener("DOMContentLoaded", function () {
  var select = document.getElementById("tab_history");
  chrome.storage.sync.get("allTabsArray", function (result) {
    console.log("here we have", result.allTabsArray);

    for (var i = 0; i < result.allTabsArray.length; i++) {
      //grabbing website name
      var urlName = result.allTabsArray[i].tabUrl;

      var urlElement = document.createElement("option");
      urlElement.textContent = urlName;
      urlElement.value = urlName;

      //grabbing date associated with it + 1
      var date = result.allTabsArray[i].tabDate;
      console.log(date);
      urlElement.textContent += date;

      select.appendChild(urlElement);
    }
  });

  function refreshPage() {
    window.location.reload();
  }
  function clear_history() {
    chrome.storage.sync.get("allTabsArray", function (result) {
      chrome.storage.sync.set({ allTabsArray: [] }, function () {
        console.log(
          "whats left:",
          result.allTabsArray + " " + result.allTabsArray.length
        );
      });
      refreshPage();
    });
  }

  document.getElementById("clear").addEventListener("click", clear_history);
});
