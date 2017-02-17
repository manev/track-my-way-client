import { OnInit, Component, ViewChild } from "@angular/core";
import { NavController, NavParams, ViewController, Platform } from 'ionic-angular';
import { BackgroundGeolocation, Geolocation, Network } from 'ionic-native';

import { ServerHostManager } from "../../services/serverHostManager";
import { localDeviceSettings } from "../../services/localDeviceSettings";

declare var plugin: any;
declare var navigator: any;

@Component({ templateUrl: "map.html" })
export class MapComponent implements OnInit {
  private contact;
  private key;
  private sendOnlyPosition = false;
  private map;
  private isResponseWaiting = true;
  private watchPositionHandler;
  private backButtonHandler;
  private isDisposed = false;
  private zoom = 17;
  private userAvatar;
  private isMapDragged = false;
  private lastLat;
  private lastLong;
  private isPaused = false;
  private clearUserDisconnect;
  private lastReportedLat;
  private lastReportedLong;
  private userCountRemove;
  private observableCount = 0;
  private clearUserTrackTracking;
  private clearPositionRecieved;

  @ViewChild("mapHost") mapHost;
  @ViewChild("bntZoomIn") bntZoomIn;

  constructor(
    private params: NavParams,
    private settings: localDeviceSettings,
    private viewCtrl: ViewController,
    private serverHost: ServerHostManager,
    private nav: NavController,
    private platform: Platform) {

    this.contact = params.get("contact");
    this.key = params.get("key");

    this.sendOnlyPosition = this.key !== undefined;
  }

  ngOnInit() {
    this.clearUserTrackTracking = this.serverHost.onStopUserTrackRecieved(this.onUserDisconnect.bind(this));

    this.loadGoogleMap();
    this.configBackButton();
    this.configPlatformPause();
    this.configPlatformResume();

    Network.onConnect().subscribe(() => this.serverHost.emitLoginUser());

    if (this.sendOnlyPosition)
      this.userCountRemove = this.serverHost.addUserCountListener(count => this.observableCount = count);
    else
      this.clearUserDisconnect = this.serverHost.onUserDisconnect(this.onUserDisconnect.bind(this));
  }

  ngOnDestroy() {
    this.dispose();
  }

  zoomIn(event) {
    this.map.setZoom(++this.zoom);
    event.preventDefault();
  }

  zoomOut(event) {
    this.map.setZoom(--this.zoom);
    event.preventDefault();
  }

  moveToTarget() {
    this.isMapDragged = false;
    this.moveCameraMap(this.lastLat, this.lastLong);
  }

  private loadGoogleMap() {
    this.isResponseWaiting = false;
    plugin.google.maps.Map.isAvailable((isAvailable, message) => {
      if (isAvailable)
        this.initMap(this.mapHost.nativeElement);
      else
        alert(message);
    });
  }

  private initMap(div) {
    this.map = plugin.google.maps.Map.getMap();
    const mapMoveHandler = args => {

      if (!this.lastLat || !this.lastLong) return;

      const lat = args.target.lat.toFixed(3);
      const lng = args.target.lng.toFixed(3);
      const lastLat = this.lastLat.toFixed(3);
      const lastLong = this.lastLong.toFixed(3);

      if (lat !== lastLat || lng !== lastLong) {
        this.zoom = args.zoom;
        this.isMapDragged = true;
      }
    };

    this.map.addEventListener(plugin.google.maps.event.MAP_READY, () => {
      this.map.setDiv(div);
      //this.map.setClickable(false);
      //this.map.setMyLocationEnabled(true);
      this.map.refreshLayout();
      this.map.addEventListener(plugin.google.maps.event.CAMERA_CHANGE, mapMoveHandler);
      //this.configBackgroundLocation();
    });

    this.watchPositionHandler = Geolocation.watchPosition({ timeout: 60000, enableHighAccuracy: false })
      .subscribe((result: any) => {
        if (result.coords) {
          this.positionChanged(result.coords.latitude, result.coords.longitude);
          if (this.sendOnlyPosition) {
            this.map.clear();
            this.map.addMarker({
              position: new plugin.google.maps.LatLng(result.coords.latitude, result.coords.longitude),
              title: this.observableCount === 1 ? '1 user is watching your location' : `${this.observableCount} users are watching your location`,
            }, marker => marker.showInfoWindow());
            this.moveCameraMap(result.coords.latitude, result.coords.longitude);
          }
        }
        else
          alert(`There was a problem retrieving your Geolocation.  Try to restart your location service. ${result.message}`);
      });

    if (!this.sendOnlyPosition)
      this.clearPositionRecieved = this.serverHost.onPositionRecieved(position => this.onPositionRecieved(position.Geopoint.Position));
  }

  private configBackgroundLocation() {
    const callbackFn = location => {
      this.positionChanged(location.latitude, location.longitude);
      BackgroundGeolocation.finish();
    };

    const failureFn = error => { console.log('BackgroundGeolocation error'); };

    BackgroundGeolocation.configure({
      desiredAccuracy: 1,
      stationaryRadius: 1,
      distanceFilter: 10,
      interval: 600,
      stopOnTerminate: true,
      locationProvider: BackgroundGeolocation.LocationProvider.ANDROID_ACTIVITY_PROVIDER
    });

    // Turn ON the background-geolocation system. The user will be tracked whenever they suspend the app.
    BackgroundGeolocation.start();
  }

  private getUserImage(): Promise<string> {
    const executor = (resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = 65;
      canvas.height = 60;
      const context = canvas.getContext("2d");

      const img = new Image();
      img.src = this.contact.photoAsDataUrl;
      img.onload = () => {
        context.save();
        context.beginPath();
        context.arc(30, 30, 30, 0, Math.PI * 2, true);
        context.closePath();
        context.clip();

        context.drawImage(img, 0, 0, context.canvas.width, context.canvas.height);
        context.strokeStyle = "#002500";
        context.lineWidth = 5;
        context.strokeRect(0, 0, context.canvas.width, context.canvas.height);

        context.beginPath();
        context.arc(0, 0, 30, 0, Math.PI * 2, true);
        context.clip();
        context.closePath();
        context.restore();

        resolve(canvas.toDataURL("image/png"));
      }
    };
    return new Promise(executor);
  }

  private moveCameraMap(lat, lng) {
    const pos = new plugin.google.maps.LatLng(lat, lng);
    const cameraSettings = {
      target: pos,
      til: 0,
      zoom: this.zoom,
      bearing: 140
    };
    this.map.moveCamera(cameraSettings);
  }

  private onPositionRecieved(position) {
    const pos = new plugin.google.maps.LatLng(position.Latitude, position.Longitude);

    this.lastLat = position.Latitude;
    this.lastLong = position.Longitude;

    if (this.isPaused) {
      return;
    }

    if (!this.isMapDragged)
      this.moveCameraMap(this.lastLat, this.lastLong);

    this.map.clear();
    if (this.userAvatar) {
      this.map.addMarker({
        position: pos,
        styles: { "maxWidth": "80%", "text-align": "center" },
        title: this.contact.FirstName,
        icon: this.userAvatar
      }, marker => marker.showInfoWindow());

      this.map.addMarker({
        position: new plugin.google.maps.LatLng(this.lastReportedLat, this.lastReportedLong),
        styles: { "maxWidth": "80%", "text-align": "center" },
        title: "Me",
      }, marker => marker.showInfoWindow());
    }
    else
      this.getUserImage().then(icon => {
        this.userAvatar = icon;
        this.map.addMarker({
          position: pos,
          styles: {
            "maxWidth": "80%",
            "text-align": "center"
          },
          title: this.contact.FirstName,
          icon: icon
        }, marker => marker.showInfoWindow());
      });
  }

  private positionChanged(latitude, longitude) {
    if (this.lastReportedLat !== latitude.toFixed(3) || this.lastReportedLong !== longitude.toFixed(3) || true) {
      this.lastReportedLat = latitude.toFixed(3);
      this.lastReportedLong = longitude.toFixed(3);

      let payload = { Geopoint: { Position: { Latitude: latitude, Longitude: longitude } } };
      const user = Object.assign({}, this.contact);
      delete user.photoAsDataUrl;
      delete user.photo;

      this.serverHost.sendPosition([this.sendOnlyPosition ? this.settings.getUser() : user], payload, this.key);
    }
  }

  private configBackButton() {
    this.backButtonHandler = this.platform.registerBackButtonAction(() => {
      navigator.notification.confirm("Are you sure you want to stop the session?", args => {
        if (args === 2) {
          this.dispose();
          this.nav.pop();
        }
      }, "Disconnect?", ["Cancel", "<< Go back"]);
    }, 101);
  }

  private onUserDisconnect(user) {
    this.clearUserDisconnect();
    var message = user.FirstName + " has been disconnected.";
    navigator.notification.alert(message, () => {
      this.dispose();
      this.nav.pop();
    }, "", "Back to contacts");
  }

  private configPlatformResume() {
    this.platform.resume.subscribe(() => {
      this.isPaused = false;
    });
  }

  private configPlatformPause() {
    this.platform.pause.subscribe(() => {
      this.isPaused = true;
    });
  }

  private dispose() {
    if (this.isDisposed)
      return;

    this.isDisposed = true;
    this.clearUserTrackTracking();

    if (this.map)
      this.map.remove();

    if (this.watchPositionHandler)
      this.watchPositionHandler.unsubscribe();

    this.backButtonHandler();

    if (this.sendOnlyPosition) {

      this.userCountRemove();
      const currentUser = this.settings.getUser();
      currentUser["tracked-room"] = this.key;
      this.serverHost.stopTracking(currentUser);
    } else {
      this.clearUserDisconnect();
      this.clearPositionRecieved();

      const user = Object.assign({}, this.contact);
      delete user.photoAsDataUrl;
      delete user.photo;
      this.serverHost.stopTracking(this.contact);
    }
  }
}
