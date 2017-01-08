import { Component } from "@angular/core";
import { DomSanitizer } from '@angular/platform-browser';
import { NavController, AlertController, LoadingController, ActionSheetController, Loading, Platform } from 'ionic-angular';
import { Contacts, Device } from "ionic-native";

import { ServerHostManager } from "../../services/serverHostManager";
import { localDeviceSettings } from "../../services/localDeviceSettings";
import Util from "../../services/util";
import { User, Tel } from "../../services/user";
import { MapComponent } from "../map/map.component";

declare let navigator: any;
declare let resolveLocalFileSystemURL: any;
declare let cordova;

@Component({ templateUrl: "contacts.html" })
export class ContactsComponent {
  constructor(
    private serverHost: ServerHostManager,
    private settings: localDeviceSettings,
    private nav: NavController,
    private platform: Platform,
    private domSanitizer: DomSanitizer,
    private loadingController: LoadingController,
    private actionSheet: ActionSheetController,
    private alert: AlertController) {
  }

  contacts = Array<User>();

  private isInSession = false;
  private fieldType = navigator.contacts.fieldType;
  private fields = [this.fieldType.id, this.fieldType.displayName, this.fieldType.phoneNumbers, this.fieldType.name, this.fieldType.photos];

  openActionSheet(contact) {
    const actionSheet = this.actionSheet.create({
      cssClass: 'action-sheets-basic-page',
      buttons: [
        {
          text: "Share your location",
          icon: "navigate",
          handler: () => this.startTracking(contact)
        },
        // {
        //   icon: "share",
        //   text: "Share your location via direct link"
        // },
        // {
        //   icon: "chatbubbles",
        //   text: "Start chat"
        // },
        {
          role: "cancel",
          text: "Cancel",
          icon: "close"
        }
      ]
    });
    actionSheet.present();
  }

  onPush(contact) {
    this.serverHost.push(contact);
  }

  ionViewDidEnter() {
    this.serverHost.addTrackingListener(this.onTrackingRequestRecieved.bind(this));
  }

  ionViewDidLoad() {
    this.serverHost.onUserDisconnect((user: User) => {
      this.contacts.forEach(contact => {
        if (contact.Phone.Number === user.Phone.Number) {
          contact.IsOnline = false;
          return;
        }
      });
    });

    if (Device.serial === "320496b4274211a1")
      this.setupMockUser();
    else
      this.loadContacts();

    this.setupPushNotification();
  }

  private startTracking(contact) {
    if (!contact.IsOnline) {
      const prompt = this.alert.create({ title: "Warning!", subTitle: "User is offline", buttons: ['OK'] });
      prompt.present();
      return;
    }

    const loading = this.showLoading("Waiting for contact response...");

    this.serverHost.trackingResponse(requestResult => {
      loading.dismiss();

      if (requestResult.IsAccepted) {
        this.serverHost.removeTrackingListener();
        this.nav.push(MapComponent, { contact: contact });
      } else {
        const prompt = this.alert.create({ title: "Warning!", subTitle: "User refused to track you!", buttons: ['OK'] });
        prompt.present();
      }
      this.serverHost.stopRequestTracking();
    });
    this.serverHost.requestTracking(contact);
  }

  private onTrackingRequestRecieved(sender) {
    let that = this;
    let user = <User>JSON.parse(sender);
    const prompt = this.alert.create({
      title: "Request recieved",
      message: `${user.FirstName} wants to share location`,
      buttons: [{
        text: 'OK',
        handler: data => {
          this.isInSession = true;
          this.serverHost.sendTrackingResponse(user, true);
          this.serverHost.removeTrackingListener();
          this.nav.push(MapComponent, { contact: that.contacts.find(c => c.Phone.Number === user.Phone.Number) });
          //this.nav.setRoot(MapComponent, { contact: user });
        }
      }, {
        text: 'Cancel',
        handler: data => {
          that.serverHost.sendTrackingResponse(user, false);
          prompt.dismiss();
        }
      }]
    });
    prompt.present();
  }

  private setupPushNotification() {
    // Push.hasPermission().then(value => {
    //   if (!value.isEnabled) {
    //     navigator.notification.alert("Your app doesn't support push notification", null);
    //     return;
    //   }
    //   var push = Push.init({
    //     android: {
    //       senderID: "826251723660",
    //       sound: true,
    //       clearNotifications: true,
    //       vibrate: true
    //     }
    //   });

    //   push.on('registration', value => this.serverHost.emitPushRegKey(value.registrationId));

    //   push.on('notification', data => {
    //     console.log(data);
    //   });

    //   push.on('error', function (e) {
    //     console.log(e.message);
    //   });
    // }).catch(error => alert(`Error in Push: ${error}`));
  }

  private setupMockUser() {
    let user = new User("BG", "Koko", new Tel("+359889356845", 1));
    user.IsOnline = true;
    this.contacts.push(user);
    this.serverHost.emitLoginUser();
  }

  private loadContacts() {
    this.settings.getAllContacts().then((args: any) => {
      if (args.rows.length > 0)
        this.loadContactsFromCache(args.rows);
      else
        this.loadContactsFromDevice();
    });
  }

  private loadContactsFromCache(rows) {
    const _contacts = [];
    const loadingPhotoPromises = new Array<Promise<any>>();

    const loading = this.showLoading("Loading Contacts...");

    for (let i = 0; i < rows.length; i++) {
      const item = rows.item(i);
      if (!_contacts.some(val => val.Phone.Number === item.number)) {
        const contact = {
          CountryCode: item.countrycode,
          FirstName: item.firstname,
          photo: item.photo,
          Phone: {
            Kind: item.kind,
            Description: item.description,
            Number: item.number
          }
        };
        loadingPhotoPromises.push(this.loadContactAvatar(contact));
        _contacts.push(contact);
      }
    }

    Promise.all(loadingPhotoPromises).then(() => {
      this.contacts = _contacts;
      loading.dismiss();
    });

    this.serverHost.getAllRegisteredUsers().subscribe((users: any) => {
      users.forEach(user => this.contacts.forEach(c =>
        c.IsOnline = c.Phone.Number === user.Phone.Number ? user.IsOnline : c.IsOnline
      ));

      Contacts.find(this.fields, { multiple: true, desiredFields: this.fields, hasPhoneNumber: true })
        .then(deviceContacts => {
          const currentUser = this.settings.getUser();
          const validUsers = users.filter(user => currentUser.Phone.Number !== user.Phone.Number && !this.contacts.find(c => c.Phone.Number === user.Phone.Number));

          if (validUsers.length === 0) return;

          const country = Util.GetCountryByCode(currentUser.CountryCode);
          const newContacts = [];
          deviceContacts.some(contact => {
            if (contact.phoneNumbers) {
              return contact.phoneNumbers.some(phone => {
                return validUsers.some((user, index) => {
                  let num = user.Phone.Number;
                  if (!phone.value.startsWith(country.countryCallingCodes[0]))
                    num = user.Phone.Number.replace(country.countryCallingCodes[0], 0);

                  if (phone.value.replace(/\s/g, '') === num) {
                    user.photo = contact.photos && contact.photos.length > 0 ? contact.photos[0].value : "";
                    loadingPhotoPromises.push(this.loadContactAvatar(user));
                    newContacts.push(user);
                    validUsers.splice(index, 1);
                    return validUsers.length === 0;
                  }
                });
              });
            }
          });
          Promise.all(loadingPhotoPromises).then(() => this.showNewContacts(newContacts));
        })
        .catch(reason => alert("Error loading contacts: " + reason.error));
    });
  }

  private loadContactsFromDevice() {
    const loading = this.showLoading("Loading Contacts...");

    Contacts.find(this.fields, { multiple: true, desiredFields: this.fields, hasPhoneNumber: true })
      .then(contacts => this.onContactsLoaded(contacts, loading))
      .catch(reason => alert("Error loading contacts: " + reason.error));
  }

  private onContactsLoaded(deviceContacts: any[], loading: Loading) {
    const that = this;
    this.serverHost.getAllRegisteredUsers().subscribe((users: any) => {
      const localContacts = [];
      const loadingPhotoPromises = new Array<Promise<any>>();
      const currentUser = this.settings.getUser();
      const validUsers = users.filter(user => currentUser.Phone.Number !== user.Phone.Number);
      const country = Util.GetCountryByCode(currentUser.CountryCode);

      if (validUsers.length === 0) return;

      deviceContacts.some(contact => {
        if (contact.phoneNumbers) {
          return contact.phoneNumbers.some(phone => {
            return validUsers.some((user, index) => {
              let num = user.Phone.Number;
              if (!phone.value.startsWith(country.countryCallingCodes[0]))
                num = user.Phone.Number.replace(country.countryCallingCodes[0], 0);

              if (!localContacts.find(c => c.Phone.Number === num))
                if (phone.value.replace(/\s/g, '') === num) {
                  user.photo = contact.photos && contact.photos.length > 0 ? contact.photos[0].value : "";
                  loadingPhotoPromises.push(this.loadContactAvatar(user));
                  localContacts.push(user);

                  validUsers.splice(index, 1);
                  return validUsers.length === 0;
                }
            });
          });
        }
      });
      Promise.all(loadingPhotoPromises).then(() => {
        that.contacts = localContacts;
        that.settings.saveUserContacts(that.contacts);
        loading.dismiss();
      });
    });
  }

  private loadContactAvatar(contact): Promise<any> {
    const executor = (resolve, reject) => {
      if (contact.photo) {
        resolveLocalFileSystemURL(contact.photo, fileEntry => {
          fileEntry.file(file => {
            const fileReader = new FileReader();
            fileReader.onloadend = (evt: any) => {
              contact.photoAsDataUrl = evt.target.result;
              resolve();
            };
            fileReader.readAsDataURL(file);
          }, error => {
            alert(error);
            resolve();
          });
        }, error => {
          if (error.code === 1)
            console.log("no photo found with this url");
          else
            alert(`Error in: resolveLocalFileSystemURL: ${error.code}`);
          resolve();
        });
      } else {
        resolve();
      }
    }
    return new Promise(executor);
  }

  private showLoading(content: string) {
    const loading = this.loadingController.create({
      content: content,
      spinner: "ios"
    });
    loading.present();

    loading.onDidDismiss(() => {
      if (backButtonHandler)
        backButtonHandler();
    });

    const backButtonHandler = this.platform.registerBackButtonAction(() => {
      backButtonHandler();
      if (loading)
        loading.dismiss();
      else
        this.platform.exitApp();
    }, 101);

    return loading;
  }

  private showNewContacts(newContacts: any[]) {
    const alert = this.alert.create({
      title: `We have found ${newContacts.length} new contacts`,
      message: "Do you want to add them in your list?",
      buttons: [
        {
          text: "Cancel",
        },
        {
          text: "OK",
          handler: () => {
            this.contacts.push(...newContacts);
            // this.settings.saveUserContacts(newContacts);
          }
        }
      ]
    });
    alert.present();
  }
}
