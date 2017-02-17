import { Injectable, Injector } from "@angular/core";
import { OneSignal } from "ionic-native";

const appId = "2f7c3177-9126-4fc5-94a4-53187cd2fa43";
const projNum = "826251723660";
const emptyFunc = () => { };

@Injectable()
export class PushNotificationService {
  private isRegistered = false;

  constructor(protected injector: Injector) {
  }

  register(options: PushNotification = new PushNotification()) {
    if (this.isRegistered)
      return;

    this.isRegistered = true;

    OneSignal.startInit(appId, projNum);
    OneSignal.inFocusDisplaying(OneSignal.OSInFocusDisplayOption.Notification);

    OneSignal.handleNotificationReceived().subscribe(data => options.handleNotificationReceived(data));
    OneSignal.handleNotificationOpened().subscribe(data => options.handleNotificationOpened(data));
    OneSignal.endInit();
  }

  public getIds(): Promise<{ userId: string, pushToken: string }> {
    if (!this.isRegistered)
      this.register();

    return OneSignal.getIds();
  }
}

export class PushNotification {
  constructor(public handleNotificationReceived: Function = emptyFunc,
    public handleNotificationOpened: Function = emptyFunc) {
  }
}
