"use strict";

var request = require("request");

var WaterLevelSensorItem = function(widget,platform,homebridge) {

    this.platform = platform;
    this.uuidAction = widget.uuidAction;
    this.currentWaterLevel = undefined;

    WaterLevelSensorItem.super_.call(this, widget,platform,homebridge);
};

// Register a listener to be notified of changes in this items value
WaterLevelSensorItem.prototype.initListener = function() {
    this.platform.ws.registerListenerForUUID(this.uuidAction, this.callBack.bind(this));
};

WaterLevelSensorItem.prototype.callBack = function(value) {
    //function that gets called by the registered ws listener
    this.currentWaterLevel = value;

    //also make sure this change is directly communicated to HomeKit
    this.otherService
        .getCharacteristic(this.homebridge.hap.Characteristic.WaterLevel)
        .setValue(this.currentWaterLevel);
};
//
//
// I don't know how to add a Characteristic as a "Service"
//

WaterLevelSensorItem.prototype.getOtherServices = function() {
    var otherService = new this.homebridge.hap.Service.HumidifierDehumidifier(); // not sure what service to link it to, so WaterputSensor as dummy
//
//
//
//

    otherService.getCharacteristic(this.homebridge.hap.Characteristic.WaterLevel)
        .on('get', this.getItemState.bind(this))
        .setValue(this.currentWaterLevel);

    return otherService;
};

WaterLevelSensorItem.prototype.getItemState = function(callback) {
   callback(undefined, this.currentWaterLevel);
};

module.exports = WaterLevelSensorItem;
