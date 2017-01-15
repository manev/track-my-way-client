import { Injectable } from "@angular/core";
import { Observable } from "rxjs/Observable";
import { Observer } from "rxjs/Observer";
import 'rxjs/add/operator/share';

import { localDeviceSettings } from "./localDeviceSettings";
import { User } from "./user";

declare var io: any;

@Injectable()
export class ServerHostManager {
  private liveUrl = "http://whereru-kokata.rhcloud.com:8000";
  private localhost = "ws://192.168.1.121:8081";
  private socket;
  private usersObservable: Observable<Array<User>>;

  constructor(private settings: localDeviceSettings) {
    // this.liveUrl = this.localhost;
    this.socket = io(this.liveUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });
    this.socket.on("disconnect", () => {
      debugger;
      console.log("disconnected to server");
    });
  }

  emitLoginUser() {
    let user = this.settings.getUser();
    this.emit("loggin-user-event", user);
  }

  addPingListener(callback: Function) {
    this.on("ping-back", data => {
      const res = JSON.parse(data);
      callback(res);
    });
  }

  sendPing() {
    this.emit("ping-me");
  }

  addLogListener(callback: Function) {
    this.on("log", message => {
      callback(message);
    });
  }

  getAllRegisteredUsers(): Observable<Array<User>> {
    if (!this.usersObservable) {
      let _observer: Observer<Array<User>>;
      this.on("get-all-registered-users-event", data => {
        const users = <Array<User>>JSON.parse(data);
        _observer.next(users);
      });
      this.usersObservable = new Observable<Array<User>>(observer => _observer = observer).share();
    }
    this.emitLoginUser();

    return this.usersObservable;
  }

  registerUser() {
    const user = this.settings.getUser();
    this.emit("add-user-event", user);
  }

  addTrackingListener(callback) {
    const currentUser = this.settings.getUser();
    const requestUserEvent = "request-user-event";
    this.on(requestUserEvent, callback);
  }

  removeTrackingListener() {
    const currentUser = this.settings.getUser();
    const requestUserEvent = "request-user-event";
    this.socket.off(requestUserEvent);
  }

  trackingResponse(callback) {
    this.on("request-user-event-result", result => {
      if (result == null) return;
      let res = JSON.parse(result);
      callback(res);
    });
  }

  stopRequestTracking() {
    this.socket.off("request-user-event-result");
  }

  sendTrackingResponse(sender, isAccepted) {
    this.emit("request-user-track-result",
      JSON.stringify({
        SenderUser: sender,
        IsAccepted: isAccepted
      }));
  }

  requestTracking(user) {
    this.emit("request-user-track", JSON.stringify(user));
  }

  onPositionRecieved(callback) {
    this.on("send-position-event", param => {
      let args = JSON.parse(param);
      callback(args);
    });
  }

  disconnectPositionRecieved() {
    this.socket.off("send-position-event");
  }

  sendPosition(receivers, position) {
    receivers.forEach(r => {
      this.socket.emit("send-position-event", JSON.stringify(r), JSON.stringify(position));
    });
  }

  onStopUserTrackRecieved(callback) {
    this.on("stop-user-tracking", user => {
      callback(JSON.parse(user));
    });
  }

  removeStopUserTrackRecieved() {
    this.socket.off("stop-user-tracking");
  }

  stopTracking(user) {
    this.emit("stop-user-tracking", user);
  }

  disconnect() {
    this.emit("disconnect");
  }

  onUserDisconnect(callback: Function) {
    this.on("disonnect-user", user => {
      callback(JSON.parse(user));
    });
  }

  emitPushRegKey(key: string) {
    let user = this.settings.getUser();
    this.emit("user-registration-key", { phoneNumber: user.Phone.Number, key: key });
  }

  push(contact) {
    this.emit("sender-user-push", JSON.stringify(contact));
  }

  private ensureSocketConnection() {
    if (this.socket.connected === false)
      this.socket = this.socket.connect();
  }

  private on(event, callback) {
    this.ensureSocketConnection();
    this.socket.on(event, callback);
  }

  private emit(event, payload = null) {
    this.ensureSocketConnection();
    if (payload)
      this.socket.emit(event, typeof payload === "object" ? JSON.stringify(payload) : payload);
    else
      this.socket.emit(event);
  }
}
