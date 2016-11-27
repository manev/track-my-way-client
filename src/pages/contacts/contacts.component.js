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
var core_1 = require("@angular/core");
var ionic_angular_1 = require('ionic-angular');
var ionic_native_1 = require("ionic-native");
var serverHostManager_1 = require("../../services/serverHostManager");
var localDeviceSettings_1 = require("../../services/localDeviceSettings");
var util_1 = require("../../services/util");
var map_component_1 = require("../map/map.component");
var ContactsComponent = (function () {
    function ContactsComponent(serverHost, settings, nav, ngZone) {
        this.serverHost = serverHost;
        this.settings = settings;
        this.nav = nav;
        this.ngZone = ngZone;
        this.hasContacts = null;
        this.contacts = [];
    }
    ContactsComponent.prototype.startTracking = function (contact) {
        // if (!contact.IsOnline) {
        //     let prompt = Alert.create({
        //         title: "Warning!",
        //         subTitle: "User is offline",
        //         buttons: ['OK']
        //     });
        //     this.nav.present(prompt);
        //     return;
        // }
        var modal = ionic_angular_1.Modal.create(map_component_1.MapComponent, { contact: contact });
        modal.onDismiss(function (data) { });
        this.nav.present(modal);
    };
    ContactsComponent.prototype.ngOnInit = function () {
        var _this = this;
        var fields = ["*"];
        ionic_native_1.Contacts.find(fields)
            .then(this.onContactsLoaded.bind(this))
            .catch(function (reason) { return alert(reason.error); });
        this.serverHost.emitLoginUser();
        this.serverHost.onTrackingRequest(function (sender) {
            var that = _this;
            var user = JSON.parse(sender);
            var prompt = ionic_angular_1.Alert.create({
                title: "Tracking request recieved",
                message: user.FirstName + " wants to track your location",
                buttons: [{
                        text: 'Cancel',
                        handler: function (data) { return console.log('Cancel clicked'); }
                    },
                    {
                        text: 'OK',
                        handler: function (data) {
                            that.serverHost.requestTrackingResponse(user, true);
                        }
                    }
                ]
            });
            that.nav.present(prompt);
        });
    };
    ContactsComponent.prototype.onContactsLoaded = function (deviceContacts) {
        var _this = this;
        var that = this;
        this.serverHost.getAllRegisteredUsers()
            .then(function (users) {
            that.ngZone.run(function () {
                that.contacts = [];
                var currentUser = _this.settings.getUser();
                var validUsers = users.filter(function (user) { return currentUser.Phone.Number !== user.Phone.Number; });
                var country = util_1.default.GetAllCountries().filter(function (item) { return item.alpha2 === currentUser.CountryCode; })[0];
                deviceContacts.forEach(function (contact) {
                    if (contact.phoneNumbers) {
                        contact.phoneNumbers.forEach(function (phone) {
                            validUsers.forEach(function (user) {
                                var number = user.Phone.Number;
                                if (!phone.value.startsWith(country.countryCallingCodes[0]))
                                    number = user.Phone.Number.replace(country.countryCallingCodes[0], 0);
                                if (phone.value.replace(/\s/g, '') === number &&
                                    that.contacts.indexOf(user) === -1)
                                    that.contacts.push(user);
                            });
                        });
                    }
                });
                that.hasContacts = that.contacts.length > 0;
            });
        });
    };
    ContactsComponent = __decorate([
        ionic_angular_1.Page({
            templateUrl: util_1.default.GetTemplateUri("contacts")
        }), 
        __metadata('design:paramtypes', [serverHostManager_1.default, localDeviceSettings_1.default, ionic_angular_1.NavController, core_1.NgZone])
    ], ContactsComponent);
    return ContactsComponent;
}());
exports.ContactsComponent = ContactsComponent;
//# sourceMappingURL=contacts.component.js.map