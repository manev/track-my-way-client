import { OnInit, Component, ViewChild } from "@angular/core";
import { NavController, NavParams, ViewController, Platform } from 'ionic-angular';
import { Geolocation } from 'ionic-native';

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
    this.serverHost.onStopUserTrackRecieved(user => {
      var message = user.FirstName + " has been disconnected.";
      navigator.notification.alert(message, () => {
        this.dispose();
        this.nav.pop();
      }, "", "Back to contacts");
    });
    this.loadGoogleMap();
    this.configBackButton();
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
    let isLoaded = false;
    let isAnimationInProgress = false;
    let isMapDragged = false;

    this.map = plugin.google.maps.Map.getMap();
    this.map.addEventListener(plugin.google.maps.event.CAMERA_CHANGE, args => {
      if (isLoaded) {
        this.zoom = args.zoom;
        //isMapDragged = true;
      }
    });

    this.map.on(plugin.google.maps.event.MAP_READY, () => {
      this.map.setDiv(div);
      //this.map.setClickable(false);
      this.map.setMyLocationEnabled(true);
      this.map.refreshLayout();
    });

    this.watchPositionHandler = Geolocation.watchPosition({ timeout: 15000, enableHighAccuracy: false })
      .subscribe((result: any) => {
        if (result.coords)
          this.positionChanged(result.coords.latitude, result.coords.longitude);
        else
          alert(`There was a problem retrieving your Geolocation.  Try to restart your location service. ${result.message}`);
      });

    this.serverHost.onPositionRecieved(position => {
      if (!isLoaded) {
        isAnimationInProgress = true;
      }
      var _position = position.Geopoint.Position;
      var pos = new plugin.google.maps.LatLng(_position.Latitude, _position.Longitude);
      var cameraSettings = {
        'target': pos,
        'tilt': 0,
        'zoom': this.zoom,
        'bearing': 140
      };

      if (!isAnimationInProgress && isLoaded && !isMapDragged) {
        this.map.moveCamera(cameraSettings);
      }
      else if (!isMapDragged) {
        this.map.animateCamera(cameraSettings, () => {
          isLoaded = true;
          isAnimationInProgress = false;
        });
      }

      this.map.clear();

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

        this.map.addMarker({
          position: pos,
          styles: {
            "maxWidth": "80%",
            "text-align": "center"
          },
          title: this.contact.FirstName,
          icon: canvas.toDataURL("image/png")
        }, marker => marker.showInfoWindow());
      };
    });
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
