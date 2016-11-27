import { OnInit, Component, ViewChild } from "@angular/core";
import {
  NavController,
  NavParams,
  ViewController,
  Platform
} from 'ionic-angular';
import { Geolocation } from 'ionic-native';

import { ServerHostManager } from "../../services/serverHostManager";

declare var plugin: any;
declare var navigator: any;

@Component({ templateUrl: "map.html" })
export class MapComponent implements OnInit {
  private contact;
  private map;
  isResponseWaiting = true;

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
        this.viewCtrl.dismiss({});
      }, "", "Back to contacts");
    });
    this.loadGoogleMap();
  }

  ngOnDestroy() {
    if (this.map)
      this.map.remove();
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

    Geolocation.watchPosition({ timeout: 3000, enableHighAccuracy: true }).subscribe(result => {
      if (result.message)
        alert(result.message);
      else
        this.positionChanged(result.coords.latitude, result.coords.longitude);
    });

    let backgroundOptions = {
      desiredAccuracy: 10,
      stationaryRadius: 20,
      distanceFilter: 30
    };

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
}
