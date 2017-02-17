import { Component } from "@angular/core";

import { NavController, AlertController, ActionSheetController, Loading, Platform, ActionSheet } from 'ionic-angular';
import { Contacts, Device, SMS, EmailComposer, Geolocation } from "ionic-native";

import { ServerHostManager } from "../../services/serverHostManager";
import { localDeviceSettings } from "../../services/localDeviceSettings";
import Util from "../../services/util";
import { User, Tel } from "../../services/user";
import { MapComponent } from "../map/map.component";
import { LoadingDialogService } from './../../services/loading.service';

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
    private actionSheet: ActionSheetController,
    private loadingService: LoadingDialogService,
    private alert: AlertController) {
  }

  contacts = Array<User>();

  private actionSheetInstance: ActionSheet;
  private clearTrackListener;
  private isInSession = false;
  private fieldType = navigator.contacts.fieldType;
  private fields = [this.fieldType.id, this.fieldType.displayName, this.fieldType.phoneNumbers, this.fieldType.name, this.fieldType.photos];

  openActionSheet(contact) {
    const configuration = [];
    if (contact.IsOnline)
      configuration.push({
        text: "Real time location tracking",
        icon: "navigate",
        handler: () => this.startTracking(contact)
      });

    configuration.push({
      text: "Share real time location link",
      icon: "share",
      handler: () => {
        const user = Object.assign({}, contact);
        delete user.photoAsDataUrl;
        delete user.photo;
        const args = this.getSharedUrl();
        const data = {
          targetUser: user,
          sharedUrl: args.url
        }
        this.serverHost.push(data, err => {
          if (!err)
            this.nav.push(MapComponent, { key: args.key })
          else
            alert(err.error);
        });
      }
    });

    // configuration.push({
    //   icon: "share",
    //   text: "Via SMS (real time tracking)",
    //   handler: () => { }//this.shareLinkBySms(contact, true)
    // });

    // configuration.push({
    //   icon: "share",
    //   text: "Via SMS (current position)",
    //   handler: () => { }//this.shareLinkBySms(contact, true)
    // });

    if (contact.IsOnline)
      configuration.push({
        icon: "chatbubbles",
        text: "Start chat"
      });

    configuration.push({
      role: "cancel",
      text: "Cancel",
      icon: "close"
    });

    this.actionSheetInstance = this.actionSheet.create({ cssClass: 'action-sheets-basic-page', buttons: configuration });
    this.actionSheetInstance.present();
  }

  ionViewDidEnter() {
    this.clearTrackListener = this.serverHost.addTrackingListener(this.onTrackingRequestRecieved.bind(this));
  }

  ionViewDidLoad() {
    this.serverHost.onUserDisconnect((user: User) => {
      this.contacts.some(contact => {
        if (contact.Phone.Number === user.Phone.Number) {
          contact.IsOnline = false;
          return true;
        }
      });
    });

    if (Device.serial === "320496b4274211a1")
      this.setupMockUser();
    else
      this.loadContacts();
  }

  shareLinkByMail(isRealTime = false) {
    if (isRealTime) {
      const args = this.getSharedUrl();
      const email = { subject: `Shared link`, body: args.url, isHtml: true };
      EmailComposer.open(email).then(() => this.nav.push(MapComponent, { key: args.key }));
    } else
      Geolocation.getCurrentPosition({ enableHighAccuracy: true }).then(location => {
        const email = { subject: `Shared link`, body: this.getCurrentLocationUrl(location), isHtml: true };
        EmailComposer.open(email);
      });
  }

  shareLinkBySms(contact, isRealTime = false) {
    if (!contact) return;

    if (isRealTime) {
      SMS.send(contact.Phone.Number, this.getSharedUrl().url);
    }
    else
      Geolocation.getCurrentPosition({ enableHighAccuracy: true }).then(location => {
        SMS.send(contact.Phone.Number, this.getCurrentLocationUrl(location));
      });
  }

  openShareActions() {
    const configuration = [{
      icon: "share",
      text: "Via email (real time tracking)",
      handler: () => this.shareLinkByMail(true)
    }, {
      icon: "share",
      text: "Share current position via email",
      handler: () => this.shareLinkByMail()
    }, {
      role: "cancel", text: "Cancel", icon: "close"
    }];
    this.actionSheetInstance = this.actionSheet.create({ cssClass: 'action-sheets-basic-page', buttons: configuration });
    this.actionSheetInstance.present();
  }

  private startTracking(contact) {
    const loading = this.loadingService.showLoading("Waiting for contact response...");
    const removeResponseListenerHandler = this.serverHost.addResponseListener(requestResult => {
      loading.dismiss();

      if (requestResult.IsAccepted) {
        this.clearTrackListener();
        this.nav.push(MapComponent, { contact: contact });
      } else {
        this.alert.create({ title: "Warning!", subTitle: "User refused to track you!", buttons: ['OK'] }).present();
      }
      removeResponseListenerHandler();
    });

    const clearUserHasRequest = this.serverHost.addUserHasRequestNotifier(user => {
      loading.dismiss();
      removeResponseListenerHandler();
      clearUserHasRequest();

      // this.alert.create({
      //   title: "Warning!",
      //   subTitle: `User ${user.FirstName} is currently in session`,
      //   buttons: ['OK']
      // }).present();
    });

    const user = Object.assign({}, contact);
    delete user.photoAsDataUrl;
    delete user.photo;
    this.serverHost.requestTracking(user);
  }

  private onTrackingRequestRecieved(sender) {
    if (this.actionSheetInstance)
      this.actionSheetInstance.dismiss();

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
          this.clearTrackListener();
          this.nav.push(MapComponent, { contact: that.contacts.find(c => c.Phone.Number === user.Phone.Number) });
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

  private setupMockUser() {
    let user = new User("BG", "Koko", new Tel("+359889356845", 1));
    user.PushId = "73c6e54e-2729-4442-9f20-63a63869de8d";
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

    const loading = this.loadingService.showLoading("Loading Contacts...");

    for (let i = 0; i < rows.length; i++) {
      const item = rows.item(i);
      if (!_contacts.some(val => val.Phone.Number === item.number)) {
        const contact = {
          CountryCode: item.countrycode,
          FirstName: item.firstname,
          photo: item.photo,
          PushId: item.pushId,
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

      this.serverHost.emitLoginUser();

      this.serverHost.getAllRegisteredUsers().subscribe((users: any) => {
        users.forEach(user => _contacts.forEach(c =>
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
            if (newContacts.length > 0)
              Promise.all(loadingPhotoPromises).then(() => this.showNewContacts(newContacts));
          })
          .catch(reason => alert("Error loading contacts: " + reason.error));
      });
    });
  }

  private loadContactsFromDevice() {
    let deviceContacts = [];
    let serverContacts = [];
    let isDeviceContactsLoaded = false;
    let isServerContactsLoaded = false;

    const loading = this.loadingService.showLoading("Syncing Contacts...");
    Contacts.find(this.fields, { multiple: true, desiredFields: this.fields, hasPhoneNumber: true })
      .then(contacts => {
        deviceContacts = contacts;
        isDeviceContactsLoaded = true;
        if (isServerContactsLoaded)
          this.onContactsLoaded(deviceContacts, serverContacts, loading);
      })
      .catch(reason => alert("Error loading contacts: " + reason.error));

    this.serverHost.getAllRegisteredUsers().subscribe(users => {
      serverContacts = users;
      isServerContactsLoaded = true;
      if (isDeviceContactsLoaded)
        this.onContactsLoaded(deviceContacts, serverContacts, loading);
    });

    this.serverHost.emitLoginUser();
  }

  private onContactsLoaded(deviceContacts: any[], users: any[], loading: Loading) {
    const that = this;
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
          if (error.code === 1) {
            let num = contact.Phone.Number;
            const country = Util.GetCountryByCode(contact.CountryCode);
            if (contact.Phone.Number.startsWith(country.countryCallingCodes[0]))
              num = contact.Phone.Number.replace(country.countryCallingCodes[0], 0);
            Contacts.find(this.fields, { filter: num }).then(args => {
              if (args.length > 0) {
                contact.photo = args[0].photos[0].value;
                this.loadContactAvatar(contact).then(() => {
                  resolve();
                  this.settings.saveUserContacts(this.contacts);
                });
              }
            });
          }
          else {
            alert(`Error in: resolveLocalFileSystemURL: ${error.code}`);
            resolve();
          }
        });
      } else {
        resolve();
      }
    }
    return new Promise(executor);
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
            this.settings.saveUserContacts(this.contacts);
          }
        }
      ]
    });
    alert.present();
  }

  private getSharedUrl() {
    const timespan = new Date().getTime();
    const currentUser = this.settings.getUser();
    const key = `${currentUser.Phone.Number}-${timespan}`;
    return {
      url: encodeURI(`${this.serverHost.webUrl}/${key}`),
      key: key
    }
  }

  private getCurrentLocationUrl(location) {
    return encodeURI(`${this.serverHost.webUrl}/?lat=${location.coords.latitude}&lng=${location.coords.longitude}&user=${JSON.stringify(this.settings.getUser())}`);
  }
}
