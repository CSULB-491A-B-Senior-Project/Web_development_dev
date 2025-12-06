import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { Navbar } from './app/ui/navbar/navbar';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

// bootstrapApplication(Navbar)
//   .catch((err) => console.error('Error bootstrapping Navbar:', err));