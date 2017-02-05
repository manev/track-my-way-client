import { IonicErrorHandler } from "ionic-angular";

export class AppErrorHandler extends IonicErrorHandler {
  handleError(err: any): void {
    console.log(err);
    super.handleError(err);
  }
}
