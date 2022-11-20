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

//next goal: refactor this into first preset button in popup, when they hit that preset should create event and create notif
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

      //GET PRIMARY CALENDAR
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
        console.log("ahead date %s", roundedDate);
        //This is the 30 minute window, startT and endT
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
        startX = startT;
        endT = new Date(
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
          summary: "Sample event",
          description: "sample event description",
        };
        console.log(eventObj);
        var eventRequestX = {
          method: "POST",
          async: true,
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventObj),
        };
        return eventRequestX;
      }

      while (busyOrNah != 0) {
        var i = 0;
        console.log(i);
        i++;
        changeDate = new Date();
        changeDate.setMinutes(changeDate.getMinutes() + x);
        x = x + 10;
        console.log("current date %s", changeDate);

        var [checkBusyRequest, startT] = createCheckBusyRequest(changeDate);

        busyOrNah = await checkCalendar();
        if (busyOrNah == 0) {
          console.log("TEST");
          console.log(timeWindowObj);
          eventRequest = createEventRequest(changeDate, startT);
          var create = await createEvent();
          console.log("breaking");
          break;
        }
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
