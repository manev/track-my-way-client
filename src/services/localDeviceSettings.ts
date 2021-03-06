import { Injectable } from "@angular/core";
import { SQLite } from "ionic-native";
import { User, Tel } from "./user";

@Injectable()
export class localDeviceSettings {
  public api_ley = "AIzaSyAew8rDZygmnQ1aHPKgNG1UaBOqW02HAfs";

  private currentVersion = 3.22;
  private userKey = "current-user-key";
  private versionKey = "current-version-key";
  private db: SQLite;

  constructor() {
    this.db = new SQLite();
  }

  setMockedUser(): void {
    localStorage.setItem(this.userKey,
      JSON.stringify(new User("BG", "test-valentina", new Tel("+359896786756", 1), "80d25cee-2b2a-4f9b-bebb-9e69df64a385")));
  }

  setCurrentUser(user: User): void {
    localStorage.setItem(this.userKey, user === null ? null : JSON.stringify(user));
  }

  getUser() {
    let user = localStorage.getItem(this.userKey);
    return JSON.parse(user);
  }

  isNewVersionAvailable(): boolean {
    let version = localStorage.getItem(this.versionKey) || 0;
    return +version < this.currentVersion;
  }

  updateCurrentVersion(): void {
    localStorage.setItem(this.versionKey, this.currentVersion.toString());
  }

  saveUserContacts(deviceContacts: any[]) {
    this.executeInSql().then(args => {
      this.db.transaction(tx => {
        tx.executeSql("DROP TABLE IF EXISTS contacts", [], args => {
          tx.executeSql("CREATE TABLE IF NOT EXISTS contacts (number, kind, description, countrycode, firstname, photo, pushId)", [], args => {
            deviceContacts.forEach(contact => {
              this.db.executeSql("INSERT INTO contacts VALUES (?, ?, ?, ?, ?, ?, ?)", [
                contact.Phone.Number,
                contact.Phone.Kind,
                contact.Phone.Description || "",
                contact.CountryCode,
                contact.FirstName,
                contact.photo,
                contact.PushId]).then(args => {
                  console.log("item created");
                }).catch(error => {
                  alert(`SQLite INSERT error: ${error.message}`);
                });
            });
          }, error => {
            alert(`SQLite error (saveUserContacts): ${error.message}`);
            this.db.close();
          });
        });
      });
    });
  }

  //SELECT name FROM sqlite_master WHERE type='table' AND name='table_name';
  getAllContacts(): Promise<any[]> {
    return this.executeInSql().then(args => {
      return this.db.executeSql("CREATE TABLE IF NOT EXISTS contacts (number, kind, description, countrycode, firstname, photo)", [])
        .then(_ => {
          return this.db.executeSql("SELECT * FROM contacts", []).catch(error => {
            alert(`SQLite error (getAllContacts): ${error.message}`);
          });
        });
    });
  }

  deleteCurrentDB() {
    this.executeInSql().then(_ => this.db.executeSql("DROP TABLE IF EXISTS contacts", []));
  }

  private executeInSql(): Promise<any> {
    return this.db.openDatabase({ name: "TrackMyWay.db", location: "default" }).catch(error => {
      alert(`SQLite error: ${error}`);
    });
  }
}
