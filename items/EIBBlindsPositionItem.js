"use strict";

var request = require("request");

var EIBBlindsPositionItem = function(widget,platform,homebridge) {

    this.platform = platform;
    this.uuidAction = widget.uuidAction; //to control a dimmer, use the uuidAction
    this.stateUuid = widget.states.position; //a blind always has a state called position, which is the uuid which will receive the event to read
    this.name = widget.name;
    console.log("Name POS " + widget.name + " KNXScreens " + this.KNXScreens);
    console.log("My parent name is " + this.KNXScreens[this.name.split(" ")[1]].updown.name);
    EIBBlindsPositionItem.super_.call(this, widget,platform,homebridge);
};

// Register a listener to be notified of changes in this items value
EIBBlindsPositionItem.prototype.initListener = function() {
    console.log("My parent name is " + this.KNXScreens[this.name.split(" ")[1]].updown.name);
    this.platform.ws.registerListenerForUUID(this.stateUuid, this.callBack.bind(this));
};

EIBBlindsPositionItem.prototype.callBack = function(value) {
    //function that gets called by the registered ws listener
    console.log("Got new state for EIB blind " + value + " and UUID " + this.UUID + " and state UUID " + this.stateUuid);


    console.log("My parent UUID is " + this.KNXScreens[this.name.split(" ")[1]].updown.stateUuid);
};

EIBBlindsPositionItem.prototype.getOtherServices = function() {
    console.log("Empty other services!")
};

EIBBlindsPositionItem.prototype.getItemPositionState = function(callback) {
    callback(undefined,this.positionState);
};

EIBBlindsPositionItem.prototype.getItemTargetPosition = function(callback) {
    callback(undefined,this.targetPosition);
};

EIBBlindsPositionItem.prototype.getItemCurrentPosition = function(callback) {
    callback(undefined,this.currentPosition);
};

EIBBlindsPositionItem.prototype.setItem = function(value, callback) {

    //sending new state (pct closed) to loxone
    var self = this;

    //set a flag that we're in control. this way we'll know if the action is coming from Homekit or from external actor (eg Loxone app)
    //this flag is removed after 20 seconds (increase if you have really long or slow blinds ;)
    this.inControl =true;
    setTimeout(function(){ self.inControl = false; }, 20000);

    this.startedPosition = this.currentPosition;
    this.targetPosition = parseInt(value);

    var command = 0;
    if (typeof value === 'boolean') {
        command = value ? 'FullUp' : 'FullDown';
    } else {
        //reverse again the value
        command = "ManualPosition/" + (100 - value);
    }
    this.log("[blinds] iOS - send message to " + this.name + ": " + command);
    this.platform.ws.sendCommand(this.uuidAction, command);
    callback();

};

module.exports = EIBBlindsPositionItem;
