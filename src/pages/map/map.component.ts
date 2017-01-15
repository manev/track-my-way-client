import { OnInit, Component, ViewChild } from "@angular/core";
import { NavController, NavParams, ViewController, Platform } from 'ionic-angular';
import { BackgroundGeolocation, Geolocation, BackgroundMode } from 'ionic-native';

import { ServerHostManager } from "../../services/serverHostManager";

declare var plugin: any;
declare var navigator: any;

@Component({ templateUrl: "map.html" })
export class MapComponent implements OnInit {
  private contact;
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

  @ViewChild("mapHost") mapHost;
  @ViewChild("bntZoomIn") bntZoomIn;

  constructor(
    private params: NavParams,
    private viewCtrl: ViewController,
    private serverHost: ServerHostManager,
    private nav: NavController,
    private platform: Platform) {

    this.contact = params.get("contact");
  }

  ngOnInit() {
    this.serverHost.onUserDisconnect(this.onUserDisconnect.bind(this));
    this.serverHost.onStopUserTrackRecieved(this.onUserDisconnect.bind(this));

    this.loadGoogleMap();
    this.configBackButton();
    this.configPlatformPause();
    this.configPlatformResume();
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
      const lat = args.target.lat.toFixed(5);
      const lng = args.target.lng.toFixed(5);

      if (!this.lastLat || !this.lastLong) return;

      if (lat !== this.lastLat.toFixed(5) || this.lastLong.toFixed(5) !== lng) {
        this.zoom = args.zoom;
        this.isMapDragged = true;
      }
    };

    this.map.addEventListener(plugin.google.maps.event.CAMERA_CHANGE, mapMoveHandler);

    this.map.addEventListener(plugin.google.maps.event.MAP_READY, () => {
      this.map.setDiv(div);
      //this.map.setClickable(false);
      //this.map.setMyLocationEnabled(true);
      this.map.refreshLayout();
      this.configBackgroundLocation();
    });

    this.watchPositionHandler = Geolocation.watchPosition({ timeout: 60000, enableHighAccuracy: false })
      .subscribe((result: any) => {
        if (result.coords)
          this.positionChanged(result.coords.latitude, result.coords.longitude);
        else
          alert(`There was a problem retrieving your Geolocation.  Try to restart your location service. ${result.message}`);
      });

    this.serverHost.onPositionRecieved(position => {
      const _position = position.Geopoint.Position;
      const pos = new plugin.google.maps.LatLng(_position.Latitude, _position.Longitude);

      this.lastLat = _position.Latitude;
      this.lastLong = _position.Longitude;

      if (this.isPaused) {
        return;
      }

      if (!this.isMapDragged)
        this.moveCameraMap(this.lastLat, this.lastLong);

      this.map.clear();
      if (this.userAvatar)
        this.map.addMarker({
          position: pos,
          styles: { "maxWidth": "80%", "text-align": "center" },
          title: this.contact.FirstName,
          icon: this.userAvatar
        }, marker => marker.showInfoWindow());
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
    });
  }

  private configBackgroundLocation() {
    const callbackFn = location => {
      this.positionChanged(location.latitude, location.longitude);
      BackgroundGeolocation.finish();
    };

    const failureFn = error => { console.log('BackgroundGeolocation error'); };

    BackgroundGeolocation.configure(callbackFn, failureFn, {
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

  private moveToTarget() {
    this.isMapDragged = false;
    this.moveCameraMap(this.lastLat, this.lastLong);
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

  private positionChanged(latitude, longitude) {
    let payload = { Geopoint: { Position: { Latitude: latitude, Longitude: longitude } } };
    this.serverHost.sendPosition([this.contact], payload);
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

  private configPlatformPause() {
    this.platform.pause.subscribe(() => {
      this.isPaused = true;
    });
  }

  private onUserDisconnect(user) {
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

  private dispose() {
    if (this.isDisposed)
      return;

    this.isDisposed = true;
    this.serverHost.removeStopUserTrackRecieved();

    if (this.map)
      this.map.remove();

    if (this.watchPositionHandler)
      this.watchPositionHandler.unsubscribe();

    this.backButtonHandler();

    this.serverHost.disconnectPositionRecieved();
    this.serverHost.stopTracking(this.contact);
  }
}
