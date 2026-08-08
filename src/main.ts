import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app'; // O AppComponent dependiendo de cómo se llame tu clase en app.ts

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));