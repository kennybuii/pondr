//3 main functions: getCalendarId(), checkCalendar(), createEvent()

/*CRUD calls are made via HTTP requests, using Fetch API. fetch() takes two parameters
the settings for the type of CRUD call you want to make and the URL for the request*/

/*Since fetch() calls are asynchronous, they won't return a value right away
Instead they return promises, therefore we have to make sure to return the resolution
to the promises and not just the actual value */

window.onload = function () {
  document.querySelector("button").addEventListener("click", async function () {
    var calendarId;

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

      //Get user's primary calendar
      async function getCalendarId() {
        return new Promise((resolve) => {
          fetch(
            "https://www.googleapis.com/calendar/v3/calendars/primary",
            init
          )
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

      var date = {
        value: currentDate,
      };
      var startTime = {
        value: start,
      };
      var endTime = {
        value: end,
      };

      var timeWindowObj = {
        timeMin: date.value + "T" + startTime.value + ":00" + GMTOffset,
        timeMax: date.value + "T" + endTime.value + ":00" + GMTOffset,
        items: [
          {
            id: calendarId,
          },
        ],
        timeZone: timezone,
      };

      //console.log(timeWindowObj);
      var test = {
        method: "POST",
        async: true,
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(timeWindowObj),
      };

      var eventObj = {
        end: {
          dateTime: date.value + "T" + endTime.value + ":00" + GMTOffset,
          timeZone: timezone,
        },
        start: {
          dateTime: date.value + "T" + startTime.value + ":00" + GMTOffset,
          timeZone: timezone,
        },
        summary: "sample event",
        description: "sample event description",
      };

      var options = {
        method: "POST",
        async: true,
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventObj),
      };

      //CREATE EVENT
      async function createEvent() {
        return new Promise((resolve) => {
          fetch(
            "https://www.googleapis.com/calendar/v3/calendars/" +
              calendarId +
              "/events",
            options
          )
            .then((response) => response.json()) // Transform the data into json
            .then(function (data) {
              console.log(data);
              resolve(data);
            })
            .catch((err) => console.log(err));
        });
      }
      //console.log(eventObj);

      //CHECK CALENDAR
      async function checkCalendar() {
        return new Promise((resolve) => {
          fetch("https://www.googleapis.com/calendar/v3/freeBusy", test)
            .then((response) => response.json()) // Transform the data into json
            .then(function (data) {
              console.log(data);
              var busy = data["calendars"][calendarId]["busy"].length;
              resolve(busy);
            })
            .catch((err) => console.log(err));
        });
      }
      var busyOrNah = await checkCalendar();
      var changeDate;

      while (busyOrNah != 0) {
        x = x + 10;
        changeDate = new Date();
        changeDate.setMinutes(changeDate.getMinutes() + x);
        roundedDate = getRoundedDate(10, changeDate);
        startT = roundedDate.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "numeric",
          minute: "numeric",
        });

        endT = new Date(
          roundedDate.setMinutes(roundedDate.getMinutes() + 30)
        ).toLocaleTimeString("en-US", {
          hour12: false,
          hour: "numeric",
          minute: "numeric",
        });

        var date = {
          value: currentDate,
        };

        var startTime = {
          value: startT,
        };
        var endTime = {
          value: endT,
        };

        var timeWindowObj = {
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
        var test = {
          method: "POST",
          async: true,
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(timeWindowObj),
        };

        busyOrNah = await checkCalendar();
        if (busyOrNah == 0) {
          var eventObj = {
            end: {
              dateTime: date.value + "T" + endTime.value + ":00" + GMTOffset,
              timeZone: timezone,
            },
            start: {
              dateTime: date.value + "T" + startTime.value + ":00" + GMTOffset,
              timeZone: timezone,
            },
            summary: "SDFADFASD",
            description: "sample event description",
          };
          console.log(eventObj);
          var options = {
            method: "POST",
            async: true,
            headers: {
              Authorization: "Bearer " + token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(eventObj),
          };
          var create = await createEvent();
          console.log("breaking");
          break;
        }

        // console.log("start %s", start);
        // console.log("end %s", end);

        console.log("busy or nah: %d", busyOrNah);
      }
      console.log("escaped the matrics");

      //READ FROM CALENDAR
      //   await fetch(
      //     "https://www.googleapis.com/calendar/v3/calendars/" +
      //       calendarId +
      //       "/events",
      //     init
      //   )
      //     .then((response) => response.json()) // Transform the data into json
      //     .then(async function (data) {
      //       //get today to next week's events
      //       for (var i = 0; i < data["items"].length; i++) {
      //         //console.log(data["items"][i]);
      //         if (data["items"][i]["end"] == undefined) {
      //           console.log("found undefined");
      //         } else {
      //           //found a valid event
      //         }
      //       }
      //     });

      //WRITE TO CALENDAR
      //   await fetch(
      //     "https://www.googleapis.com/calendar/v3/calendars/" +
      //       calendarId +
      //       "/events",
      //     options
      //   )
      //     .then((response) => response.json()) // Transform the data into json
      //     .then((data) => console.log(data))
      //     .catch((err) => console.log(err));
    });
  });
};
