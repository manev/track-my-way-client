import { Injectable } from "@angular/core";
import { OneSignal } from '@ionic-native/onesignal';

const appId = "2f7c3177-9126-4fc5-94a4-53187cd2fa43";
const projNum = "826251723660";
const emptyFunc = () => { };

@Injectable()
export class PushNotificationService {
  private isRegistered = false;

  constructor(private oneSignal: OneSignal) {
  }

  register(options: PushNotification = new PushNotification()) {
    if (this.isRegistered)
      return;

    this.isRegistered = true;

    this.oneSignal.startInit(appId, projNum);
    this.oneSignal.inFocusDisplaying(this.oneSignal.OSInFocusDisplayOption.Notification);

    this.oneSignal.handleNotificationReceived().subscribe(data => options.handleNotificationReceived(data));
    this.oneSignal.handleNotificationOpened().subscribe(data => options.handleNotificationOpened(data));
    this.oneSignal.endInit();
  }

  public getIds(): Promise<{ userId: string, pushToken: string }> {
    if (!this.isRegistered)
      this.register();

    return this.oneSignal.getIds();
  }
}

export class PushNotification {
  constructor(public handleNotificationReceived: Function = emptyFunc,
    public handleNotificationOpened: Function = emptyFunc) {
  }
}
