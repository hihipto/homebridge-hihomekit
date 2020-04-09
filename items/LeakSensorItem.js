"use strict";

var request = require("request");

var LeakSensorItem = function(widget,platform,homebridge) {

    this.platform = platform;
    this.uuidAction = widget.uuidAction;
    this.LeakDetected = false;

    LeakSensorItem.super_.call(this, widget,platform,homebridge);
};

// Register a listener to be notified of changes in this items value
LeakSensorItem.prototype.initListener = function() {
    this.platform.ws.registerListenerForUUID(this.uuidAction, this.callBack.bind(this));
};

LeakSensorItem.prototype.callBack = function(value) {
    //function that gets called by the registered ws listener

    //console.log("Got new state for Leak: " + value);

    this.LeakDetected = value;

    //also make sure this change is directly communicated to HomeKit
    this.otherService
        .getCharacteristic(this.homebridge.hap.Characteristic.LeakDetected)
        .setValue(this.LeakDetected);
};

LeakSensorItem.prototype.getOtherServices = function() {
    var otherService = new this.homebridge.hap.Service.LeakSensor();

    otherService.getCharacteristic(this.homebridge.hap.Characteristic.LeakDetected)
        .on('get', this.getItemState.bind(this))
        .setValue(this.LeakDetected);

    return otherService;
};

LeakSensorItem.prototype.getItemState = function(callback) {
   callback(undefined, this.LeakDetected);
};

module.exports = LeakSensorItem;
