import { OnInit, Component, ViewChild } from "@angular/core";
import { NavController, NavParams, ViewController, Platform } from 'ionic-angular';
import { Geolocation } from 'ionic-native';

import { ServerHostManager } from "../../services/serverHostManager";
import { ContactsComponent } from "./../contacts/contacts.component";

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

  @ViewChild("mapHost") mapHost;

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
        this.nav.setRoot(ContactsComponent);
      }, "", "Back to contacts");
    });
    this.loadGoogleMap();
    this.configBackButton();
  }

  ngOnDestroy() {
    this.dispose();
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
    let zoom = 17;
    let isMapDragged = false;

    this.map = plugin.google.maps.Map.getMap();
    this.map.addEventListener(plugin.google.maps.event.CAMERA_CHANGE, args => {
      if (isLoaded) {
        zoom = args.zoom;
        //isMapDragged = true;
      }
    });

    this.map.on(plugin.google.maps.event.MAP_READY, () => {
      this.map.setDiv(div);
      this.map.refreshLayout();
    });

    this.watchPositionHandler = Geolocation.watchPosition({ timeout: 15000, enableHighAccuracy: true })
      .subscribe(result => {
        if (result.coords)
          this.positionChanged(result.coords.latitude, result.coords.longitude);
        else
          alert("There was a problem retrieving your Geolocation. Try to restart your location service.");
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
        'zoom': zoom,
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
      this.map.addMarker({
        position: pos,
        title: this.contact.FirstName
      }, marker => marker.showInfoWindow());
    });
  }

  private positionChanged(latitude, longitude) {
    let payload = { Geopoint: { Position: { Latitude: latitude, Longitude: longitude } } };
    this.serverHost.sendPosition([this.contact], payload);
  }

  private configBackButton() {
    this.backButtonHandler = this.platform.registerBackButtonAction(() => {
      navigator.notification.confirm("Are you sure you want to stop the session?", () => {
        this.dispose();
        this.nav.setRoot(ContactsComponent);
      }, "Cancel", "Back to contacts");
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
