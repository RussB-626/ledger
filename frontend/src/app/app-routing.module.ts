// App routing configuration
// Routes for dashboard and admin pages

import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ROUTES } from './app.routes';

@NgModule({
  imports: [RouterModule.forRoot(ROUTES, { preloadAllModules: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
