import { Injectable } from "@angular/core";
import { Observable, Observer } from 'rxjs/Rx';
import 'rxjs/add/operator/share';

import { LocalDeviceSettings } from "./localDeviceSettings";
import { User } from "./user";

declare var io: any;

@Injectable()
export class ServerHostManager {
  private liveUrl = "http://whereru-kokata.rhcloud.com:8000";
  private socket;
  private usersObservable: Observable<Array<User>>;

  public webUrl = Object.freeze("http://web-kokata.rhcloud.com");

  constructor(private settings: LocalDeviceSettings) {
    // this.liveUrl = "ws://192.168.1.102:8081";
    // this.webUrl = "http://localhost:4200";
    this.socket = io(this.liveUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });
    this.socket.on("disconnect", () => {
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
    return this.usersObservable;
  }

  registerUser(user, callback) {
    this.emit("add-user-event", user, callback);
  }

  addTrackingListener(callback) {
    const requestUserEvent = "request-user-event";
    this.on(requestUserEvent, callback);
    return () => this.socket.off(requestUserEvent);
  }

  addResponseListener(callback) {
    const eventName = "request-user-event-result";
    this.on(eventName, result => {
      if (result == null) return;
      callback(JSON.parse(result));
    });
    return () => this.socket.off(eventName)
  }

  addUserHasRequestNotifier(callback: Function) {
    this.on("user-has-request-started", result => callback(JSON.parse(result)));

    return () => this.socket.off("user-has-request-started");
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

  onPositionRecieved(callback): Function {
    this.on("send-position-event", param => {
      let args = JSON.parse(param);
      callback(args);
    });
    return () => this.socket.off("send-position-event");
  }

  sendPosition(receivers, position, key) {
    receivers.forEach(r => {
      this.socket.emit("send-position-event", JSON.stringify(r), JSON.stringify(position), key);
    });
  }

  onStopUserTrackRecieved(callback) {
    this.on("stop-user-tracking", user => {
      callback(JSON.parse(user));
    });
    return () => this.socket.off("stop-user-tracking");
  }

  stopTracking(user) {
    this.emit("stop-user-tracking", user);
  }

  disconnect() {
    this.emit("disconnect");
  }

  onUserDisconnect(callback: Function): Function {
    this.on("disonnect-user", user => {
      callback(JSON.parse(user));
    });

    return () => {
      this.socket.off("disonnect-user");
    }
  }

  addUserCountListener(callBack: Function) {
    this.on("active-web-user-in-session", callBack);

    return () => this.socket.off("active-web-user-in-session");
  }

  push(data, callback: Function) {
    this.emit("sender-user-push", JSON.stringify(data), args => {
      callback(args);
    });
  }

  private ensureSocketConnection() {
    if (this.socket.connected === false)
      this.socket = this.socket.connect();
  }

  private on(event, callback) {
    this.ensureSocketConnection();
    this.socket.on(event, callback);
  }

  private emit(event, payload = null, callback: Function = () => { }) {
    this.ensureSocketConnection();
    if (payload)
      this.socket.emit(event, typeof payload === "object" ? JSON.stringify(payload) : payload, data => {
        if (data)
          typeof data === "object" ? callback(data) : callback(JSON.parse(data));
        else
          callback();
      });
    else
      this.socket.emit(event, data => {
        if (data)
          callback(JSON.parse(data));
        else
          callback();
      });
  }
}
