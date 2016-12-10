import { OnInit, NgZone, Component } from "@angular/core";
import { NavController, AlertController, LoadingController, ActionSheetController } from 'ionic-angular';
import { Contacts, Device } from "ionic-native";

import { ServerHostManager } from "../../services/serverHostManager";
import { localDeviceSettings } from "../../services/localDeviceSettings";
import Util from "../../services/util";
import { User, Tel } from "../../services/user";
import { MapComponent } from "../map/map.component";

declare let navigator: any;

@Component({ templateUrl: "contacts.html" })
export class ContactsComponent implements OnInit {
  constructor(
    private serverHost: ServerHostManager,
    private settings: localDeviceSettings,
    private nav: NavController,
    private ngZone: NgZone,
    private loadingController: LoadingController,
    private actionSheet: ActionSheetController,
    private alert: AlertController) {
  }

  hasContacts: any = null;
  contacts = Array<User>();

  private isInSession = false;

  ngOnInit() {
    this.serverHost.onTrackingRequest(this.onTrackingRequest.bind(this));

    if (Device.serial === "320496b4274211a1")
      this.setupMockUser();
    else
      this.loadContacts();

    this.setupPushNotification();

    this.serverHost.onUserDisconnect((user: User) => {
      this.contacts.forEach(contact => {
        if (contact.Phone.Number === user.Phone.Number) {
          contact.IsOnline = false;
          return;
        }
      });
    });
  }

  openActionSheet(contact) {
    let actionSheet = this.actionSheet.create({
      cssClass: 'action-sheets-basic-page',
      buttons: [
        {
          text: "Share your location",
          icon: "navigate",
          handler: () => this.startTracking(contact)
        },
        {
          icon: "share",
          text: "Share your location via direct link"
        },
        {
          icon: "chatbubbles",
          text: "Start chat"
        },
        {
          text: "Cancel",
          icon: "close"
        }
      ]
    });
    actionSheet.present();
  }

  startTracking(contact) {
    if (!contact.IsOnline) {
      let prompt = this.alert.create({ title: "Warning!", subTitle: "User is offline", buttons: ['OK'] });
      prompt.present();
      return;
    }

    let waitSpinner = this.loadingController.create({
      showBackdrop: true,
      spinner: "ios",
      content: "Waiting for contact response..."
    });

    this.serverHost.onRequestTrackingResult(requestResult => {
      waitSpinner.dismiss();

      if (requestResult.IsAccepted) {
        this.nav.setRoot(MapComponent, { contact: contact });
      } else {
        let prompt = this.alert.create({ title: "Warning!", subTitle: "User refused to track you!", buttons: ['OK'] });
        prompt.present();
      }
      this.serverHost.offRequestTrackingResult();
    });
    this.serverHost.requestTracking(contact);

    waitSpinner.present();
  }

  onTrackingRequest(sender) {
    if (this.isInSession) return;

    this.isInSession = true;

    let that = this;
    let user = <User>JSON.parse(sender);
    let prompt = this.alert.create({
      title: "Tracking request recieved",
      message: user.FirstName + " wants to track your location",
      buttons: [{
        text: 'Cancel',
        handler: data => {
          that.serverHost.requestTrackingResponse(user, false);
          that.isInSession = false;
          prompt.dismiss();
        }
      }, {
        text: 'OK',
        handler: data => {
          that.serverHost.requestTrackingResponse(user, true);
          this.nav.setRoot(MapComponent, { contact: user });
        }
      }]
    });
    prompt.present();
  }

  onContactsLoaded(deviceContacts: any[]) {
    const that = this;
    this.serverHost.getAllRegisteredUsers().subscribe((users: any) => {
      this.ngZone.run(() => {
        this.contacts = [];
        const currentUser = this.settings.getUser();
        const validUsers = users.filter(user => currentUser.Phone.Number !== user.Phone.Number);
        const country = Util.GetCountryByCode(currentUser.CountryCode);
        deviceContacts.forEach(contact => {
          if (contact.phoneNumbers) {
            contact.phoneNumbers.forEach(phone => {
              validUsers.forEach(user => {
                let num = user.Phone.Number;
                if (!phone.value.startsWith(country.countryCallingCodes[0]))
                  num = user.Phone.Number.replace(country.countryCallingCodes[0], 0);

                if (phone.value.replace(/\s/g, '') === num && this.contacts.indexOf(user) === -1)
                  this.contacts.push(user);
              });
            });
          }
        });
        that.hasContacts = that.contacts.length > 0;
        that.settings.saveUserContacts(that.contacts);
      });
    });
  }

  onPush(contact) {
    this.serverHost.push(contact);
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
    this.hasContacts = true;
    this.serverHost.emitLoginUser();
  }

  private loadContacts() {
    this.settings.getAllContacts().then((args: any) => {
      const fieldType = navigator.contacts.fieldType;
      const fields = [fieldType.id, fieldType.displayName, fieldType.phoneNumbers, fieldType.name];

      if (args.rows.length > 0) {
        const _contacts = [];
        const cachedItems = [];
        for (let i = 0; i < args.rows.length; i++) {
          const item = args.rows.item(i);
          cachedItems.push(item);
          if (_contacts.indexOf(item) === -1)
            _contacts.push({
              CountryCode: item.countrycode,
              FirstName: item.firstname,
              Phone: {
                Kind: item.kind,
                Description: item.description,
                Number: item.number
              }
            });
        }
        this.contacts = _contacts;
        this.hasContacts = this.contacts.length > 0;
        this.serverHost.emitLoginUser();
        this.serverHost.getAllRegisteredUsers().subscribe(users => {
          users.forEach(user =>
            this.contacts.forEach(c => {
              if (c.CountryCode === user.CountryCode && c.FirstName === user.FirstName && c.Phone.Number === user.Phone.Number)
                c.IsOnline = user.IsOnline;
            })
          );
        });
      } else {
        Contacts.find(fields, { multiple: true, desiredFields: fields, hasPhoneNumber: true })
          .then(this.onContactsLoaded.bind(this))
          .then(() => this.serverHost.emitLoginUser())
          .catch(reason => alert("Error loading contacts: " + reason.error));
      }
    });
  }
}
