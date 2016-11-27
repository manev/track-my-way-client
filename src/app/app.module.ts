import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";

import { IonicApp, IonicModule } from 'ionic-angular';

import { MyApp } from "./app.component";
import { RegistrationComponent } from "./../pages/registration/register.component";
import { ContactsComponent } from "./../pages/contacts/contacts.component";
import { MapComponent } from "./../pages/map/map.component";
import { localDeviceSettings } from "../services/localDeviceSettings";
import { ServerHostManager } from "../services/serverHostManager";

@NgModule({
  declarations: [MyApp, RegistrationComponent, ContactsComponent, MapComponent],
  bootstrap: [IonicApp],
  imports: [BrowserModule, IonicModule.forRoot(MyApp, {
    actionSheetEnter: 'action-sheet-md-slide-in',
    actionSheetLeave: 'action-sheet-md-slide-out',
    actionSheetCancelIcon: 'ion-md-close',
    actionSheetDestructiveIcon: 'ion-md-trash',
    backButtonText: '',
    backButtonIcon: 'ion-md-arrow-back',
    iconMode: 'md',
    menuType: 'overlay',
    modalEnter: 'modal-md-slide-in',
    modalLeave: 'modal-md-slide-out',
    pageTransition: 'md-transition',
    pageTransitionDelay: 120,
    popupEnter: 'popup-md-pop-in',
    popupLeave: 'popup-md-pop-out',
    tabbarHighlight: true,
    tabbarPlacement: 'top',
    tabSubPages: true,
  })],
  entryComponents: [MyApp, RegistrationComponent, ContactsComponent, MapComponent],
  providers: [localDeviceSettings, ServerHostManager]
})
export class AppModule {
}
