import { Injectable } from "@angular/core";
import { Platform, LoadingController, Loading } from "ionic-angular";

@Injectable()
export class LoadingDialogService {
  constructor(private platform: Platform, private loadingController: LoadingController) {
  }

  showLoading(content: string): Loading {
    const loading = this.loadingController.create({
      content: content,
      spinner: "ios"
    });
    loading.present();

    loading.onDidDismiss(() => {
      if (backButtonHandler)
        backButtonHandler();
    });

    const backButtonHandler = this.platform.registerBackButtonAction(() => {
      backButtonHandler();
      if (loading)
        loading.dismiss();
      else
        this.platform.exitApp();
    }, 101);

    return loading;
  }
}
