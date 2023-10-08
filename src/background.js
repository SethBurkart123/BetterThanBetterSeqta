/*global chrome*/

export const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("MyDatabase", 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      db.createObjectStore("backgrounds", { keyPath: "id" });
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = (event) => {
      reject("Error opening database: " + event.target.errorCode);
    };
  });
};

export const writeData = async (type, data) => {
  console.log("Reading Data");
  const db = await openDB();
  console.log("Opened DB");

  const tx = db.transaction("backgrounds", "readwrite");
  const store = tx.objectStore("backgrounds");
  const request = await store.put({ id: "customBackground", type, data });

  console.log("Data written successfully");

  return request.result;
};

export const readData = () => {
  return new Promise((resolve, reject) => {
    openDB()
      .then(db => {
        console.log("Database, typeof", typeof db, "Is: ", db);
        const tx = db.transaction("backgrounds", "readonly");
        const store = tx.objectStore("backgrounds");
        console.log("Current store: ", store);
        
        // Retrieve the custom background
        const getRequest = store.get("customBackground");
        
        // Attach success and error event handlers
        getRequest.onsuccess = function(event) {
          console.log("CustomBackground", event.target.result);
          resolve(event.target.result);
        };
        
        getRequest.onerror = function(event) {
          console.error("An error occurred:", event);
          reject(event);
        };
      })
      .catch(error => {
        console.error("An error occurred:", error);
        reject(error);
      });
  });
};

function ReloadSEQTAPages() {
  chrome.tabs.query({}, function (tabs) {
    for (let tab of tabs) {
      if (tab.title.includes("SEQTA Learn")) {
        chrome.tabs.reload(tab.id);
      }
    }
  });
}

// Helper function to handle setting permissions
const handleAddPermissions = () => {
  if (typeof chrome.declarativeContent !== "undefined") {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {});
  }
  
  chrome.permissions.request(
    { permissions: ["declarativeContent"], origins: ["*://*/*"] },
    (granted) => {
      if (granted) {
        const rules = [
          // Define your rules here
        ];
        
        rules.forEach(rule => {
          chrome.declarativeContent.onPageChanged.addRules([rule]);
        });
        
        alert("Permissions granted. Reload SEQTA pages to see changes. If this workaround doesn't work, please contact the developer. It will be an easy fix");
      }
    }
  );
};

// Main message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in background script", request);

  switch (request.type) {
  case "reloadTabs":
    ReloadSEQTAPages();
    break;
    
  case "IndexedDB":
    HandleIntexedDB(request, sendResponse);
    return true;
  
  case "githubTab":
    chrome.tabs.create({ url: "github.com/SethBurkart123/EvenBetterSEQTA" });
    break;
    
  case "setDefaultStorage":
    console.log("Setting default values");
    SetStorageValue(DefaultValues);
    break;
    
  case "addPermissions":
    handleAddPermissions();
    break;

  case "sendNews":
    GetNews(sendResponse);
    return true;
    // eslint-disable-next-line no-unreachable
    break;
    
  default:
    console.log("Unknown request type");
  }
});

function HandleIntexedDB(request, sendResponse) {
  switch (request.action) {
  case "write":
    writeData(request.data.type, request.data.data);
    break;

  case "read":
    readData().then((data) => {
      console.log("Sending data: ", data);
      sendResponse(data);
    });
    return true;

  }
}
function GetNews(sendResponse) {
  // Gets the current date
  const date = new Date();
  // Formats the current date used send a request for timetable and notices later
  const TodayFormatted =
    date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();

  const from =
    date.getFullYear() +
    "-" +
    (date.getMonth() + 1) +
    "-" +
    (date.getDate() - 1);
  console.log(TodayFormatted);
  console.log(from);

  let url = `https://newsapi.org/v2/everything?domains=abc.net.au&from=${from}&apiKey=17c0da766ba347c89d094449504e3080`;

  console.log("Fetching news from " + url);
  fetch(url)
    .then((result) => result.json())
    .then((response) => {
      if (response.code == "rateLimited") {
        url += "%00";
        GetNews();
      } else {
        console.log(response);
        sendResponse({ news: response });
      }
    });
}

const DefaultValues = {
  onoff: true,
  animatedbk: true,
  lessonalert: true,
  notificationcollector: true,
  defaultmenuorder: [],
  menuitems: {},
  menuorder: [],
  subjectfilters: {},
  selectedColor: "#1a1a1a",
  DarkMode: true,
  shortcuts: [
    {
      name: "YouTube",
      enabled: false,
    },
    {
      name: "Outlook",
      enabled: true,
    },
    {
      name: "Office",
      enabled: true,
    },
    {
      name: "Spotify",
      enabled: false,
    },
    {
      name: "Google",
      enabled: true,
    },
    {
      name: "DuckDuckGo",
      enabled: false,
    },
    {
      name: "Cool Math Games",
      enabled: false,
    },
    {
      name: "SACE",
      enabled: false,
    },
    {
      name: "Google Scholar",
      enabled: false,
    },
    {
      name: "Gmail",
      enabled: false,
    },
    {
      name: "Netflix",
      enabled: false,
    },
    {
      name: "educationperfect",
      enabled: true,
    },
  ],
  customshortcuts: [],
};

function SetStorageValue(object) {
  for (var i in object) {
    chrome.storage.local.set({ [i]: object[i] });
  }
}

function UpdateCurrentValues(details) {
  console.log(details);

  chrome.storage.local.get(null, function (items) {
    var CurrentValues = items;

    const NewValue = Object.assign({}, DefaultValues, CurrentValues);

    function CheckInnerElement(element) {
      for (let i in element) {
        if (typeof element[i] === "object") {
          if (typeof DefaultValues[i].length == "undefined") {
            NewValue[i] = Object.assign({}, DefaultValues[i], CurrentValues[i]);
          } else {
            // If the object is an array, turn it back after
            let length = DefaultValues[i].length;
            NewValue[i] = Object.assign({}, DefaultValues[i], CurrentValues[i]);
            let NewArray = [];
            for (let j = 0; j < length; j++) {
              NewArray.push(NewValue[i][j]);
            }
            NewValue[i] = NewArray;
          }
        }
      }
    }
    CheckInnerElement(DefaultValues);

    if (items["customshortcuts"]) {
      NewValue["customshortcuts"] = items["customshortcuts"];
    }

    SetStorageValue(NewValue);
  });
}

function migrateOldStorage() {
  chrome.storage.local.get(null, function (items) {
    let shouldUpdate = false; // Flag to check if there is anything to update
    
    // Check for the old "Name" field and convert it to "name"
    if (items.shortcuts && items.shortcuts.length > 0 && "Name" in items.shortcuts[0]) {
      shouldUpdate = true;
      items.shortcuts = items.shortcuts.map((shortcut) => {
        return {
          name: shortcut.Name,  // Convert "Name" to "name"
          enabled: shortcut.enabled // Keep the "enabled" field as is
        };
      });
    }

    // Check for "educationperfect" and convert it to "Education Perfect"
    if (items.shortcuts && items.shortcuts.length > 0) {
      for (let shortcut of items.shortcuts) {
        if (shortcut.name === "educationperfect") {
          shouldUpdate = true;
          shortcut.name = "Education Perfect"; // Convert to "Education Perfect"
        }
      }
    }

    // If there"s something to update, set the new values in storage
    if (shouldUpdate) {
      chrome.storage.local.set({ shortcuts: items.shortcuts }, function() {
        console.log("Migration completed.");
      });
    }
  });
}

chrome.runtime.onInstalled.addListener(function (event) {
  chrome.storage.local.remove(["justupdated"]);
  UpdateCurrentValues();
  if ( event.reason == "install" ) {
    chrome.storage.local.set({ justupdated: true });
    migrateOldStorage();
  }
});
