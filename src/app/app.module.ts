import { NgModule, ErrorHandler } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";

import { IonicApp, IonicModule } from 'ionic-angular';

import { MyApp } from "./app.component";
import { AppErrorHandler } from "./app.error-handler";
import { RegistrationComponent } from "./../pages/registration/register.component";
import { ContactsComponent } from "./../pages/contacts/contacts.component";
import { MapComponent } from "./../pages/map/map.component";
import { LocalDeviceSettings } from "../services/localDeviceSettings";
import { ServerHostManager } from "../services/serverHostManager";
import { PushNotificationService } from "../services/push-notification.service";
import { LoadingDialogService } from "../services/loading.service";

import { Contacts } from '@ionic-native/contacts';
import { Device } from '@ionic-native/device';
import { SMS } from '@ionic-native/sms';
import { EmailComposer } from '@ionic-native/email-composer';
import { Network } from '@ionic-native/network';
import { Geolocation } from '@ionic-native/geolocation';
import { Keyboard } from '@ionic-native/keyboard';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';


@NgModule({
  declarations: [MyApp, RegistrationComponent, ContactsComponent, MapComponent],
  bootstrap: [IonicApp],
  imports: [BrowserModule, IonicModule.forRoot(MyApp)],
  entryComponents: [MyApp, RegistrationComponent, ContactsComponent, MapComponent],
  providers: [
    LocalDeviceSettings,
    ServerHostManager,
    PushNotificationService,
    LoadingDialogService,
    Contacts,
    Device,
    SMS,
    EmailComposer,
    Network,
    Geolocation,
    Keyboard,
    StatusBar,
    SplashScreen,
    { provide: ErrorHandler, useClass: AppErrorHandler }]
})
export class AppModule {
}
