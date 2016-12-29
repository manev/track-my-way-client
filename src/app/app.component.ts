import { Platform, AlertController, MenuController, Alert, LoadingController } from 'ionic-angular';
import { Diagnostic, StatusBar, Device, BackgroundGeolocation, Insomnia, Splashscreen } from 'ionic-native';
import { ViewChild, Component } from "@angular/core";

import { localDeviceSettings } from "../services/localDeviceSettings";
import { RegistrationComponent } from "../pages/registration/register.component";
import { ContactsComponent } from "../pages/contacts/contacts.component";
import { ServerHostManager } from "../services/serverHostManager";

declare var navigator: any;

@Component({
  templateUrl: "./app.component.html"
})
export class MyApp {
  @ViewChild("navHost") nav;

  private alertLocation: Alert;

  constructor(
    private platform: Platform,
    private localSettings: localDeviceSettings,
    private menu: MenuController,
    private serverHost: ServerHostManager,
    private loading: LoadingController,
    private alertController: AlertController) {

    platform.ready().then(() => {
      StatusBar.styleDefault();
      Splashscreen.hide();

      Diagnostic.requestContactsAuthorization().then(args => {
        if (args === "DENIED") {
          this.platform.exitApp();
        } else {
          this.configInsomnia();
          this.configNetworkService();
          this.configLocationService();
          this.configResume();
          //this.configBackButton();
          this.configLogListener();
        }
      });
    });
  }

  onEnableBackgroundMode() {
    //BackgroundMode.enable();
    this.menu.close();
  }

  onDisableBackgroundMode() {
    this.menu.close();
  }

  onMenuClose() {
    this.menu.close();
  }

  onReconnect() {
    const loading = this.loading.create({
      content: "Connecting to server..."
    });
    loading.present();

    this.serverHost.emitLoginUser();
    this.serverHost.addPingListener(data => loading.dismiss());

    this.serverHost.sendPing();
    this.menu.close();
  }

  private configBackButton() {
    this.platform.registerBackButtonAction(() => {
      const alert = this.alertController.create({
        title: "Exit",
        subTitle: "Are you sure you want to exit?",
        buttons: [{
          text: "Ok",
          handler: () => this.platform.exitApp()
        },
        {
          text: "Cancel",
          handler: () => {
            alert.dismiss();
            this.serverHost.disconnect();
          }
        }],
      });
      alert.present();
    }, 100);
  }

  private configResume() {
    this.platform.resume.subscribe(() => {
      if (this.alertLocation) {
        BackgroundGeolocation.isLocationEnabled()
          .then(value => {
            if (value) {
              this.alertLocation.dismiss();
            } else {
              this.platform.exitApp();
            }
          });
      }
    });
  }

  private configInsomnia() {
    Insomnia.keepAwake()
      .then(() => console.log("Succeeded running insomnia"))
      .catch(error => alert(`Insomna error: ${error}`));
  }

  private bootstrapp() {
    if (Device.serial === "320496b4274211a1") {
      this.localSettings.setMockedUser();
    }
    else if (this.localSettings.isNewVersionAvailable()) {
      this.localSettings.setCurrentUser(null);
    }

    const user = this.localSettings.getUser();
    if (!user) {
      this.nav.push(RegistrationComponent);
      this.localSettings.updateCurrentVersion();
    } else {
      this.nav.push(ContactsComponent);
    }
  }

  private configNetworkService() {
    if (!navigator.onLine) {
      navigator.notification.alert(
        "You need to enable your WiFi or mobile data in order to run this app",
        () => this.platform.exitApp(),
        "",
        "Exit");
    }
  }

  private configLogListener() {
    this.serverHost.addLogListener(message => alert(message));
  }

  private configLocationService() {
    Diagnostic.requestLocationAuthorization().then(result => {
      console.log(result);
    });

    BackgroundGeolocation.isLocationEnabled()
      .then(value => {
        if (value === 0) {
          this.alertLocation = this.alertController.create({
            message: "You need to enable your device location service in order to run this app",
            title: "Enable Location?",
            buttons: [{
              text: "Exit",
              handler: () => this.platform.exitApp()
            },
            {
              text: "GO TO SETTINGS",
              handler: () => BackgroundGeolocation.showLocationSettings()
            }]
          });
          this.alertLocation.present();

          BackgroundGeolocation.watchLocationMode()
            .then(_value => {
              if (_value) {
                this.bootstrapp();
              }
            });
        } else {
          this.bootstrapp();
        }
      })
      .catch(error => alert(`BackgroundGeolocation.isLocationEnabled error: ${error}`));
  }
}
