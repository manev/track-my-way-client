import { ViewChild, Component, NgZone } from "@angular/core";
import { Platform, AlertController, MenuController, Alert, LoadingController } from "ionic-angular";
import {
  Diagnostic,
  StatusBar,
  Device,
  Insomnia,
  Splashscreen,
  BackgroundMode,
  LocationAccuracy,
  BackgroundGeolocation,
  Network,
  Toast
} from "ionic-native";

import { localDeviceSettings } from "../services/localDeviceSettings";
import { RegistrationComponent } from "../pages/registration/register.component";
import { ContactsComponent } from "../pages/contacts/contacts.component";
import { ServerHostManager } from "../services/serverHostManager";
import { PushNotificationService, PushNotification } from "../services/push-notification.service";

declare var navigator: any;

@Component({
  templateUrl: "./app.component.html"
})
export class MyApp {
  @ViewChild("navHost") nav;

  public hasInternet: boolean;

  private alertLocation: Alert;
  private exitAlert: Alert;

  constructor(
    private platform: Platform,
    private zone: NgZone,
    private localSettings: localDeviceSettings,
    private menu: MenuController,
    private serverHost: ServerHostManager,
    private loading: LoadingController,
    private pushService: PushNotificationService,
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
          this.requestLocationAccuracy();
          this.configResume();
          this.configBackgroundMode();
          this.configBackButton();
          this.configLogListener();
          this.configNetworkListener();
          this.configPushNotifyService();
        }
      });
    });
  }

  onEnableBackgroundMode() {
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

  private requestLocationAccuracy() {
    LocationAccuracy.canRequest().then(
      value => {
        if (value)
          LocationAccuracy.request(LocationAccuracy.REQUEST_PRIORITY_HIGH_ACCURACY).then(
            () => this.bootstrapp(),
            () => this.configLocationService()
          );
        else
          this.configLocationService();
      });
  }

  private configBackButton() {
    this.platform.registerBackButtonAction(() => {
      if (this.exitAlert) return;

      this.exitAlert = this.alertController.create({
        title: "Exit",
        subTitle: "Are you sure you want to exit?",
        buttons: [{
          text: "Ok",
          handler: () => this.platform.exitApp()
        },
        {
          text: "Cancel",
          handler: () => {
            this.exitAlert.dismiss();
            this.exitAlert = null;
          }
        }]
      });
      this.exitAlert.onDidDismiss(() => this.exitAlert = null);
      this.exitAlert.present();
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
      this.localSettings.deleteCurrentDB();
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

  private configNetworkListener() {
    let timeInterval;

    this.hasInternet = Network.type !== "offline";

    Network.onDisconnect().subscribe(() => {
      this.zone.run(() => this.hasInternet = false);
      timeInterval = setInterval(() => Toast.showShortCenter("No internet connection!").subscribe(), 500);
    });

    Network.onConnect().subscribe(() => {
      this.zone.run(() => this.hasInternet = true);
      Toast.hide();
      clearInterval(timeInterval);
    });
  }

  private configBackgroundMode() {
    if (!BackgroundMode.isEnabled()) {
      BackgroundMode.setDefaults({
        title: "TrackMyWay title",
        ticker: "TrackMyWay is now running in background mode",
        text: "TrackMyWay text",
        silent: true
      });
      BackgroundMode.enable();
    }
  }

  private configPushNotifyService() {
    //this.nav.push(MapComponent, { contact: data.payload.additionalData.targetUser })
    const pushOptions = new PushNotification();
    this.pushService.register(pushOptions);
  }
}
