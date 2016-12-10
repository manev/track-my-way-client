import { Injectable } from "@angular/core";
import { Observable } from "rxjs/Observable";
import { Observer } from "rxjs/Observer";
import 'rxjs/add/operator/share';

import { localDeviceSettings } from "./localDeviceSettings";
import { User } from "./user";

declare var io: any;

@Injectable()
export class ServerHostManager {

  constructor(private settings: localDeviceSettings) { }

  private live_url: string = 'http://whereru-kokata.rhcloud.com:8000';
  //private live_url = "ws://192.168.1.147:3001";
  private socket = io(this.live_url, { reconnection: true });
  private usersObservable: Observable<Array<User>>;

  private ensureSocketConnection() {
    if (this.socket.connected === false)
      this.socket = this.socket.connect();
  }

  private on(event, callback) {
    this.ensureSocketConnection();
    this.socket.on(event, callback);
  }

  private emit(event, payload = {}) {
    this.ensureSocketConnection();
    if (payload)
      this.socket.emit(event, typeof payload === "object" ? JSON.stringify(payload) : payload);
    else
      this.socket.emit(event);
  }

  emitLoginUser() {
    let user = this.settings.getUser();
    this.emit("loggin-user-event", user);
  }

  ping(callback) {
    this.on("ping-back", data => {
       let res = JSON.parse(data);
       callback(res);
    });
    this.emit("ping");
  }

  getAllRegisteredUsers(): Observable<Array<User>> {
    if (!this.usersObservable) {
      let _observer: Observer<Array<User>>;
      this.on("get-all-registered-users-event", data => {
        let users = <Array<User>>JSON.parse(data);
        _observer.next(users);
      });
      this.usersObservable = new Observable<Array<User>>(observer => _observer = observer).share();
    }
    return this.usersObservable;
  }

  registerUser() {
    let user = this.settings.getUser();
    this.emit("add-user-event", user);
  }

  onTrackingRequest(callback) {
    let currentUser = this.settings.getUser();
    let requestUserEvent = currentUser.Phone.Number + "-request-user-event";
    this.on(requestUserEvent, callback);
  }

  onRequestTrackingResult(callback) {
    this.on("request-user-event-result", result => {
      if (result == null) return;
      let res = JSON.parse(result);
      callback(res);
    });
  }

  offRequestTrackingResult() {
    this.ensureSocketConnection();
    this.socket.off("request-user-event-result");
  }

  requestTrackingResponse(sender, isAccepted) {
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

  stopTracking() {
    let user = this.settings.getUser();
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
}
