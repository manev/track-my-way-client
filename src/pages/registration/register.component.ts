import { LoadingDialogService } from './../../services/loading.service';
import { OnInit, Component, ViewChild } from "@angular/core";
import { Http } from "@angular/http";
import { NavController } from 'ionic-angular';
import { Keyboard, Geolocation } from "ionic-native";
import { ServerHostManager } from "../../services/serverHostManager";
import { localDeviceSettings } from "../../services/localDeviceSettings";
import Util from "../../services/util";
import { User } from "../../services/user";
import { ContactsComponent } from "../contacts/contacts.component";
import { PushNotificationService } from "../../services/push-notification.service";

declare var navigator: any;

@Component({ templateUrl: "registration.html" })
export class RegistrationComponent implements OnInit {

  @ViewChild("name") nameInput;

  user = new User();
  countriesInfo: any;
  isLoading;

  constructor(
    private serverHost: ServerHostManager,
    private settings: localDeviceSettings,
    private http: Http,
    private loadingDialog: LoadingDialogService,
    private pushService: PushNotificationService,
    private nav: NavController) { }

  ngOnInit() {
    this.isLoading = true;
    Geolocation.getCurrentPosition()
      .then(pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        this.http.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.settings.api_ley}`)
          .subscribe(response => {
            response.json().results.forEach(r => {
              const hasCountry = r.types.some(t => t === "country");
              if (hasCountry) {
                this.user.CountryCode = r.address_components[0].short_name;
                setTimeout(() =>
                  this.isLoading = false, 10000);
                this.setNameInputFocus();
                return;
              }
            });
          });
      }).catch(ex => {
        alert(ex);

        this.isLoading = false;
        this.setNameInputFocus();

        if (navigator.globalization)
          navigator.globalization.getLocaleName(result => {
            let code = result.value.split('-');
            this.user.CountryCode = code.length === 1 ? code[0] : code[1];
          }, null);
        else
          this.user.CountryCode = "bg"
      });
    this.countriesInfo = Util.GetAllCountries().sort((item1, item2) => item1.name.localeCompare(item2.name));
  }

  register() {
    const country = this.countriesInfo.filter(item => item.alpha2 === this.user.CountryCode)[0];
    const loadingIndicator = this.loadingDialog.showLoading("Registering user");

    this.user.Phone.Number = country.countryCallingCodes[0] + this.user.Phone.Number;

    this.pushService.getIds().then(data => {
      this.user.PushId = data.userId;
      this.serverHost.registerUser(this.user, response => {
        if (response.status === "Ok") {
          loadingIndicator.dismiss();
          this.settings.setCurrentUser(this.user);
          this.nav.setRoot(ContactsComponent);
        }
      });
    });
  }

  private setNameInputFocus() {
    setTimeout(() => {
      this.nameInput.setFocus();
      Keyboard.show();
    }, 150);
  }
}
