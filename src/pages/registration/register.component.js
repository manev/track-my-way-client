/// <reference path="../../../typings/cordova/cordova.d.ts" />
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
var serverHostManager_1 = require("../../services/serverHostManager");
var localDeviceSettings_1 = require("../../services/localDeviceSettings");
var util_1 = require("../../services/util");
var user_1 = require("../../services/user");
var contacts_component_1 = require("../contacts/contacts.component");
var Registration = (function () {
    function Registration(serverHost, settings, nav) {
        this.serverHost = serverHost;
        this.settings = settings;
        this.nav = nav;
        this.user = new user_1.User();
    }
    Registration.prototype.ngOnInit = function () {
        var _this = this;
        this.countriesInfo = util_1.default.GetAllCountries();
        if (navigator.globalization) {
            navigator.globalization.getLocaleName(function (result) {
                var code = result.value.split('-');
                _this.user.CountryCode = code.length === 1 ? code[0] : code[1];
            }, null);
        }
        else {
            this.user.CountryCode = "bg";
        }
    };
    Registration.prototype.register = function () {
        var _this = this;
        var country = this.countriesInfo.filter(function (item) { return item.alpha2 === _this.user.CountryCode; })[0];
        this.user.Phone.Number = country.countryCallingCodes[0] + this.user.Phone.Number;
        this.settings.setCurrentUser(this.user);
        this.serverHost.registerUser();
        this.nav.setRoot(contacts_component_1.ContactsComponent);
    };
    Registration = __decorate([
        ionic_angular_1.Page({
            templateUrl: util_1.default.GetTemplateUri("registration")
        }), 
        __metadata('design:paramtypes', [serverHostManager_1.default, localDeviceSettings_1.default, ionic_angular_1.NavController])
    ], Registration);
    return Registration;
}());
exports.Registration = Registration;
//# sourceMappingURL=register.component.js.map