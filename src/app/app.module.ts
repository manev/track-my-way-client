import { NgModule, ErrorHandler } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";

import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';

import { MyApp } from "./app.component";
import { RegistrationComponent } from "./../pages/registration/register.component";
import { ContactsComponent } from "./../pages/contacts/contacts.component";
import { MapComponent } from "./../pages/map/map.component";
import { localDeviceSettings } from "../services/localDeviceSettings";
import { ServerHostManager } from "../services/serverHostManager";

@NgModule({
  declarations: [MyApp, RegistrationComponent, ContactsComponent, MapComponent],
  bootstrap: [IonicApp],
  imports: [BrowserModule, IonicModule.forRoot(MyApp)],
  entryComponents: [MyApp, RegistrationComponent, ContactsComponent, MapComponent],
  providers: [
    localDeviceSettings,
    ServerHostManager,
    { provide: ErrorHandler, useClass: IonicErrorHandler }]
})
export class AppModule {
}
