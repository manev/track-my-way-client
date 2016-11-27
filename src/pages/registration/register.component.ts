import { OnInit, Component } from "@angular/core";

import { NavController } from 'ionic-angular';

import { ServerHostManager } from "../../services/serverHostManager";
import { localDeviceSettings } from "../../services/localDeviceSettings";
import Util from "../../services/util";
import { User } from "../../services/user";
import { ContactsComponent } from "../contacts/contacts.component";

declare var navigator: any;

@Component({ templateUrl: "registration.html" })
export class RegistrationComponent implements OnInit {

  constructor(
    private serverHost: ServerHostManager,
    private settings: localDeviceSettings,
    private nav: NavController) { }

  ngOnInit() {
    this.countriesInfo = Util.GetAllCountries().sort((item1, item2) => item1.name.localeCompare(item2.name));

    if (navigator.globalization) {
      navigator.globalization.getLocaleName(result => {
        let code = result.value.split('-');
        this.user.CountryCode = code.length === 1 ? code[0] : code[1];
      }, null);
    } else {
      this.user.CountryCode = "bg"
    }
  }

  register() {
    let country = this.countriesInfo.filter(item => item.alpha2 === this.user.CountryCode)[0];

    this.user.Phone.Number = country.countryCallingCodes[0] + this.user.Phone.Number;
    this.settings.setCurrentUser(this.user);
    this.serverHost.registerUser();
    this.nav.setRoot(ContactsComponent);
  }

  user = new User();
  countriesInfo: any;
}
