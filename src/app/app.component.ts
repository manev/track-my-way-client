import { Platform, AlertController, MenuController, Alert } from 'ionic-angular';
import { StatusBar, Device, BackgroundGeolocation, Insomnia, Splashscreen } from 'ionic-native';
import { ViewChild, Component } from "@angular/core";

import { localDeviceSettings } from "../services/localDeviceSettings";
import { RegistrationComponent } from "../pages/registration/register.component";
import { ContactsComponent } from "../pages/contacts/contacts.component";

declare var navigator: any;

@Component({
  template: `
            <ion-menu [content]="mycontent">
                <ion-toolbar primary class="bar bar-header bar-stable"><ion-title>Menu</ion-title></ion-toolbar>
                <ion-content>
                    <ion-list>
                         <button (click)="onEnableBackgroundMode()" ion-item detail-none>Enable run in background</button>
                         <button (click)="onDisableBackgroundMode()" ion-item detail-none>Disable run in background</button>
                         <button (click)="onMenuClose()" ion-item><ion-icon name="close"></ion-icon> Close</button>
                    </ion-list>
                </ion-content>
            </ion-menu>
            <ion-nav #mycontent></ion-nav>`
})
export class MyApp {
  @ViewChild("mycontent") nav;

  private alertLocation: Alert;

  constructor(
    private platform: Platform,
    private localSettings: localDeviceSettings,
    private menu: MenuController,
    private alertController: AlertController) {

    platform.ready().then(() => {
      StatusBar.styleDefault();
      Splashscreen.hide();

      this.configInsomnia();
      this.configNetworkService();
      this.configLocationService();
      this.configResume();
      this.configBackButton();
      // this.bootstrapp();
    });
  }

  private configBackButton() {
    this.platform.backButton.subscribe(() => {
      if (this.nav.length() === 0)
        this.platform.exitApp();

      if (this.nav.getActive().componentType === ContactsComponent) {
      }
    });
  }

  private configResume() {
    this.platform.resume.subscribe(() => {
      if (this.alertLocation) {
        BackgroundGeolocation.isLocationEnabled()
          .then(value => {
            if (value) {
              this.alertLocation = null;
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
    if (Device.device.serial === "320496b4274211a1") {
      this.localSettings.setMockedUser();
    }
    else if (this.localSettings.isNewVersionAvailable()) {
      this.localSettings.setCurrentUser(null);
    }

    const user = this.localSettings.getUser();
    if (!user) {
      this.nav.setRoot(RegistrationComponent);
      this.localSettings.updateCurrentVersion();
    } else {
      this.nav.setRoot(ContactsComponent);
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

  private configLocationService() {
    BackgroundGeolocation.isLocationEnabled()
      .then(value => {
        if (value === 0) {
          this.alertLocation = this.alertController.create({
            message: "You need to enable your device location service in order to run this app",
            buttons: [{
              text: "Exit",
              handler: () => this.platform.exitApp()
            },
            {
              text: "Enable",
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

  public onEnableBackgroundMode() {
    //BackgroundMode.enable();
    this.menu.close();
  }

  public onDisableBackgroundMode() {
    this.menu.close();
  }

  public onMenuClose() {
    this.menu.close();
  }
}
