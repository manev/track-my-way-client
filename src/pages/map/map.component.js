/// <reference path="../../../typings/tsd.d.ts" />
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ionic_angular_1 = require('ionic-angular');
var core_1 = require("@angular/core");
var serverHostManager_1 = require("../../services/serverHostManager");
var util_1 = require("../../services/util");
var MapComponent = (function () {
    function MapComponent(params, viewCtrl, serverHost, nav, elementRef) {
        this.params = params;
        this.viewCtrl = viewCtrl;
        this.serverHost = serverHost;
        this.nav = nav;
        this.elementRef = elementRef;
        this.isResponseWaiting = true;
        this.contact = params.get("contact");
    }
    MapComponent.prototype.ngOnInit = function () {
        var _this = this;
        this.loadGoogleMap();
        this.serverHost.onRequestTrackingResult(function (requestResult) {
            if (requestResult.IsAccepted) {
                _this.loadGoogleMap();
            }
            else {
                var prompt_1 = ionic_angular_1.Alert.create({ title: "Request cancelled", buttons: ['OK'] });
                _this.nav.present(prompt_1);
            }
            _this.serverHost.offRequestTrackingResult();
        });
        //this.serverHost.requestTracking(this.contact);
        this.serverHost.onStopUserTrackRecieved(function (user) {
            var message = user.FirstName + " has been disconnected.";
            navigator.notification.alert(message, function () {
                // if (map)
                // 	map.closeDialog();
                _this.viewCtrl.dismiss({});
            }, "", "Back to contacts");
        });
    };
    MapComponent.prototype.loadGoogleMap = function () {
        var _this = this;
        plugin.google.maps.Map.isAvailable(function (isAvailable, message) {
            if (isAvailable)
                _this.initMap();
            else
                alert(message);
        });
    };
    MapComponent.prototype.initMap = function () {
    };
    MapComponent = __decorate([
        ionic_angular_1.Page({
            templateUrl: util_1.default.GetTemplateUri("map")
        }), 
        __metadata('design:paramtypes', [ionic_angular_1.NavParams, ionic_angular_1.ViewController, serverHostManager_1.default, ionic_angular_1.NavController, core_1.ElementRef])
    ], MapComponent);
    return MapComponent;
}());
exports.MapComponent = MapComponent;
//# sourceMappingURL=map.component.js.map