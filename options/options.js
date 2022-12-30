document.addEventListener("DOMContentLoaded", function () {
  var select = document.getElementById("tab_history");
  chrome.storage.local.get("allTabsArray", function (result) {
    console.log("here we have", result.allTabsArray);

    for (var i = 0; i < result.allTabsArray.length; i++) {
      //grabbing website name
      var urlName = result.allTabsArray[i].tabUrl;
      var urlTitle = result.allTabsArray[i].tabTitle;

      var div = document.createElement("span");
      var urlElement = document.createElement("p");
      var urlElementLink = document.createElement("a");

      urlElement.textContent = urlTitle;
      urlElement.value = urlName;

      urlElementLink.href = urlName;
      urlElementLink.innerHTML = urlName;

      //grabbing date associated with it + 1
      var date = result.allTabsArray[i].tabDate;
      var newDate = new Date(date);
      console.log(newDate.toLocaleString("en-US", { hour12: true }));
      //console.log(date);

      urlElement.textContent +=
        " " +
        newDate.toLocaleString("en-US", {
          hour12: true,
        });

      div.appendChild(urlElementLink);
      div.appendChild(urlElement);

      select.appendChild(div);
    }
  });

  function refreshPage() {
    window.location.reload();
  }
  function clear_history() {
    chrome.storage.local.get("allTabsArray", function (result) {
      chrome.storage.local.set({ allTabsArray: [] }, function () {
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
