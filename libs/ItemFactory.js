"use strict";
var exports = module.exports = {};
exports.AbstractItem = require('../items/AbstractItem.js');
//Important: name the exports identical to Loxone type to have an automatic match
//If not possible, define in checkCustomAttrs which will override in certain cases
exports.LightControllerV2MoodSwitch = require('../items/LightControllerV2MoodSwitchItem.js');
exports.TemperatureSensor = require('../items/TemperatureSensorItem.js');
exports.HumiditySensor = require('../items/HumiditySensorItem.js');
exports.Switch = require('../items/SwitchItem.js');
exports.TimedSwitch = require('../items/TimedSwitchItem.js');
exports.Lightbulb = require('../items/LightbulbItem.js');
exports.Dimmer = require('../items/DimmerItem.js');
exports.Jalousie = require('../items/BlindsItem.js');
// Pieter: KNX Blinds
exports.EIBBlinds = require('../items/EIBBlindsItem.js');

exports.Pushbutton = require('../items/PushbuttonItem.js');
exports.Colorpicker = require('../items/ColorpickerItem.js');
exports.Gate = require('../items/GateItem.js');
exports.DoorBell = require('../items/DoorBellItem.js');
exports.MotionSensor = require('../items/MotionSensorItem.js');
//Phil: adds leaksensor
exports.LeakSensor = require('../items/LeakSensorItem.js');
//Phil: adds WaterLevelSensor
exports.WaterLevelSensor = require('../items/WaterLevelSensorItem.js');
exports.ContactSensor = require('../items/ContactSensorItem.js');
exports.LightSensor = require('../items/LightSensorItem.js');

class KNXScreen { // Pieter adding Screen as object to represent KNX Screens
  constructor() {
    this.updown = null;
    this.position = null;
  }
}

exports.Factory = function(LoxPlatform, homebridge, knxScreens_Shared) {
  this.platform = LoxPlatform;
  this.log = this.platform.log;
  this.homebridge = homebridge;
  this.itemList = {};
  this.catList = {};
  this.roomList = {};

  this.knxScreens_Shared = knxScreens_Shared; // Pieter: Will keep the KNX screens as a list
  this.accessoryList = [];
  this.list_child_pos_UUID = {};
  // Loxone items should be named "Screen [ROOM] [function]"
  // [function] == Op_Neer => Main EIBBlindsItem which will have actions, status and be used in HomeKit
  // [function] == Positie FeedBack => "Dummy item (EIBBlindsPositionItem) receiving the value and updating Op_Neer EIBBlindsItem"
  //this.uniqueIds = [];
};

//TODO: we could also get this information from the websocket, avoiding the need of an extra request.

exports.Factory.prototype.sitemapUrl = function() {
  var serverString = this.platform.host;
  var serverPort = this.platform.port;
  if (this.platform.username && this.platform.password) {
    serverString = encodeURIComponent(this.platform.username) + ":" + encodeURIComponent(this.platform.password) + "@" + serverString + ":" + serverPort;
  }

  return this.platform.protocol + "://" + serverString + "/data/LoxApp3.json";
};

exports.Factory.prototype.parseSitemap = function(jsonSitemap) {

  //this is the function that gets called by index.js
  //first, parse the Loxone JSON that holds all controls
  exports.Factory.prototype.traverseSitemap(jsonSitemap, this);
  //now convert these controls in accessories

  for (var key in this.itemList) {
    if (this.itemList.hasOwnProperty(key)) {
      //process additional attributes
      this.itemList[key] = exports.Factory.prototype.checkCustomAttrs(this, key, this.platform, this.catList);
    }
  }

  for (var key in this.itemList) {
    if (this.itemList.hasOwnProperty(key)) {
      if (!(this.itemList[key].type in exports)) {
        this.log("Platform - The widget '" + this.itemList[key].name + "' of type " + this.itemList[key].type + " is an item not handled.");
        continue;
      }
      if (this.itemList[key].skip) {
        this.log("Platform - The widget '" + this.itemList[key].name + "' of type " + this.itemList[key].type + " was skipped.");
        continue;
      }
      if (this.itemList[key].name.indexOf("Screen Slaapkamer") !== -1) { // KNX Screen special treatment
        var access_name = this.itemList[key].name.split(" ");
        if (access_name[2] == "Op_Neer") {
          // assign "Positie" callback UUID to "Op_Neer" main Blinds item
          var accessory = new exports[this.itemList[key].type](this.itemList[key], this.platform, this.homebridge,
            this, this.list_child_pos_UUID[access_name[1]], this.list_child_pos_UUID[access_name[1] + "EIBDimmer"]);
          this.log("Platform - Accessory Found: " + this.itemList[key].name + " Type " + this.itemList[key].type);
        } else {
          continue; // If this continue; is not here, we can add an empty item to the accesory list
        }
      } else {
        var accessory = new exports[this.itemList[key].type](this.itemList[key], this.platform, this.homebridge, this);
        this.log("Platform - Accessory Found: " + this.itemList[key].name + " Type " + this.itemList[key].type);
      }

      if (this.accessoryList.length > 99) {
        // https://github.com/nfarina/homebridge/issues/509
        this.log("Platform - Accessory count limit (100) exceeded so skipping: '" + this.itemList[key].name + "' of type " + this.itemList[key].type + " was skipped.");
      } else {

        var keyToLookup = key;
        if (keyToLookup.indexOf('/') > -1) {
          keyToLookup = keyToLookup.split('/')[0];
        }

        var control = this.itemList[keyToLookup];

        var controlRoom = null;

        if (this.platform.rooms.length == 0) {
          //Show all rooms
          this.accessoryList.push(accessory);

        } else {
          //Filter rooms
          if (control.room) {
            // The controls room is not defined if the room "Not used" is assigned via the Config
            controlRoom = this.roomList[control.room].name;

            //this.log(this.platform.rooms);
            //this.log(controlRoom);

            if (this.platform.rooms.indexOf(controlRoom) >= 0) {

              if ((this.platform.moodSwitches == 'only') && (this.itemList[key].type !== 'LightControllerV2MoodSwitch')) {
                this.log('Skipping as only moodswitched selected');
              } else {
                this.accessoryList.push(accessory);
              }
            } else {
              this.log('Platform - Skipping as room ' + controlRoom + ' is not in the config.json rooms list.');
            }

          } else {
            // cannot add this accessory as it does not have a room
            this.log('Platform - Skipping as could not determine which room the accessory is in.');
          }
        }
      }

    }
  }

  console.log("Returning accessory list!");
  for (var accessory in this.accessoryList) {
    console.log("Name " + this.accessoryList[accessory].name);
  }

  this.log('Platform - Total accessory count ' + this.accessoryList.length + ' across ' + this.platform.rooms.length + ' rooms.');
  return this.accessoryList;
};


exports.Factory.prototype.checkCustomAttrs = function(factory, itemId, platform, catList) {
  var item = factory.itemList[itemId];
  //console.log('Type before checkCustomAttrs ' + item.name + ' type ' + item.type);
  //this function will make accesories more precise based on other attributes
  //eg, all InfoOnlyAnalog items which start with the name 'Temperat' are considered temperature sensors

  if (item.name.indexOf("emperat") !== -1) {
    item.type = "TemperatureSensor";

  } else if (item.name.indexOf("Humidity") !== -1) {
    item.type = "HumiditySensor";

  } else if (item.name.indexOf("vocht") !== -1) {
    item.type = "HumiditySensor";

  } else if (item.type == "TimedSwitch") {
    item.type = "TimedSwitch";

  } else if (catList[item.cat] !== undefined && catList[item.cat].image === "00000000-0000-0002-2000000000000000.svg") {
    //this is the lightbulb image, which means that this is a lightning control
    if (item.type === "Switch") {
      item.type = "Lightbulb";
    }
  } else if (item.parentType === "LightController" || item.parentType === "LightControllerV2") {
    //this is a subcontrol of a lightcontroller
    if (item.type === "Switch") {
      item.type = "Lightbulb";
    } else if (item.type === "ColorPickerV2") { // Handle the new ColorPickerV2 which replaces the colorPicker in the new LightControllerV2
      item.type = "Colorpicker";
    }
  }

  if (item.name.indexOf("Screen Slaapkamer") !== -1) { // KNX Screens
    console.log("Found EIB Blinds!! :-) " + item.name);
    //console.log(JSON.stringify(item, null, 4));
    //console.log(JSON.stringify(factory.knxScreens_Shared, null, 4));

    var room = item.name.split(" ")[1];
    if (item.type == "UpDownDigital") {
      item.type = "EIBBlinds";
    } else if (item.type == "InfoOnlyAnalog") {
      var access_name = item.name.split(" ");
      if (access_name[2] == "Positie") {
        factory.list_child_pos_UUID[access_name[1]] = item.uuidAction; // UUID to listen on for position info
      } //else if (access_name[2] == "Go2PosKNX") {
        //factory.list_child_pos_UUID[access_name[1] + "Go2PosKNX"] = item.uuidAction; // UUID to listen on for position info
      //}
    } else if (item.type == "EIBDimmer") {
      factory.list_child_pos_UUID[access_name[1] + "EIBDimmer"] = item.uuidAction;
    }
  }

  if (item.type === "Gate") {
    item.type = "Gate";
  }

  if (item.type == "InfoOnlyDigital") {
    if (item.defaultIcon == '00000000-0000-0021-2000000000000000') {
      item.type = "DoorBell";

    } else if ((item.name.indexOf("Motion") !== -1) || (item.name.indexOf("Presence") !== -1)) {
      item.type = "MotionSensor";

    } else if (item.name.indexOf("Door ") !== -1) {
      item.type = "ContactSensor";
      //Phil: adding watersensor
    } else if (item.name.indexOf("Waters") !== -1) {
      item.type = "LeakSensor";

    } else if (item.name.indexOf("Doorbell") !== -1) {
      item.type = "DoorBell";

    } else if (item.name.indexOf("WC") !== -1) {
      item.type = "ContactSensor";

    }

  }

  if (item.type == "InfoOnlyAnalog") {

    if (item.name.indexOf("Door Contact") !== -1) {
      item.type = "ContactSensor";

    } else if (((item.name.indexOf("Motion") !== -1) || (item.name.indexOf("Presence") !== -1)) && (item.name.indexOf("Brightness") == -1)) {
      item.type = "MotionSensor";

    } else if ((item.name.indexOf("Brightness") !== -1) || (item.name.indexOf("Light Level") !== -1)) {
      item.type = 'LightSensor';
      // Phil: adding WaterLevelSensor
    } else if (item.name.indexOf("Waterput 2") !== -1) {
      item.type = 'WaterLevelSensor';

    } else if (item.name.indexOf("Temperature") !== -1) {
      item.type = 'TemperatureSensor';
    }
  }

  if (item.type === "EIBDimmer") {
    item.type = "Dimmer"
  }

  if (item.name.indexOf("Loxone") !== -1) {
    //this is a Loxone status or temperature, I don't need these in Siri
    item.skip = true;
  }

  if ((item.uuidAction.indexOf("/masterValue") !== -1) || (item.uuidAction.indexOf("/masterColor") !== -1)) {
    // the 'Overall Brightness' and 'Overall Color' features of the new Loxone LightController2 don't really have a context in Homekit, skip them
    item.skip = true;
  }

  item.manufacturer = "Loxone";

  return item;
};


exports.Factory.prototype.traverseSitemap = function(jsonSitmap, factory) {

  //this function will simply add every control and subControl to the itemList, holding all its information
  //it will also store category information, as we will use this to decide on correct Item Type
  for (var sectionKey in jsonSitmap) {
    if (jsonSitmap.hasOwnProperty(sectionKey)) {
      if (sectionKey === "cats") {
        var cats = jsonSitmap[sectionKey];
        for (var catUuid in cats) {
          if (cats.hasOwnProperty(catUuid)) {
            factory.catList[catUuid] = cats[catUuid];
          }
        }
      } else if (sectionKey === "rooms") {
        var rooms = jsonSitmap[sectionKey];
        for (var roomUuid in rooms) {
          if (rooms.hasOwnProperty(roomUuid)) {
            factory.roomList[roomUuid] = rooms[roomUuid];
          }
        }
      } else if (sectionKey === "controls") {
        var controls = jsonSitmap[sectionKey];
        for (var controlUuid in controls) {
          if (controls.hasOwnProperty(controlUuid)) {
            var control = controls[controlUuid],
              controlRoom = "'No Room'";

            // The controls room is not defined if the room "Not used" is assigned via the Config
            if (control.room) {
              controlRoom = factory.roomList[control.room];
            }

            // Append the room name to the name for better identification
            control.name += (" in " + controlRoom.name);
            control.roomname = controlRoom.name;
            factory.itemList[controlUuid] = control;
            console.log("PIETER Control new item in itemList " + control.name);

            // Check if the control has any subControls like LightController(V2)
            if (control.subControls) {
              for (var subControlUuid in control.subControls) {
                if (control.subControls.hasOwnProperty(subControlUuid)) {
                  var subControl = control.subControls[subControlUuid];
                  subControl.parentType = control.type;

                  // Append the name of its parent control to the subControls name
                  subControl.name += (" of " + control.name);
                  factory.itemList[subControlUuid] = subControl;

                }
              }
            }

            // if we have a LightController(V2) then we create a new control (switch) for each Mood
            if ((control.type == 'LightControllerV2') && ((factory.platform.moodSwitches == 'all') || (factory.platform.moodSwitches == 'only'))) {
              var moods = JSON.parse(factory.platform.ws.getLastCachedValue(control.states.moodList));
              //factory.log(moods.length);
              for (var r = 0; r < moods.length; r++) {
                var mood = moods[r];
                // create a control for LightControllerV2MoodSwitch for each Mood of this LightControllerV2
                var moodSwitchControl = JSON.parse(JSON.stringify(control));
                moodSwitchControl.subControls = null;
                moodSwitchControl.uuidAction = controlUuid + '/' + mood.id;
                moodSwitchControl.name = 'Mood ' + mood.name + ' of ' + control.name;
                moodSwitchControl.parentType = control.type;
                moodSwitchControl.uuidActionOriginal = controlUuid;
                moodSwitchControl.mood = mood;
                moodSwitchControl.type = 'LightControllerV2MoodSwitch';
                factory.itemList[moodSwitchControl.uuidAction] = moodSwitchControl;

              }
            }


          }
        }
      }
    }
  }
};
