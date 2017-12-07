import { ModuleWithProviders, NgModule } from '@angular/core';
import { KmcServerPolls } from './kmc-server-polls.service';

@NgModule({
  imports: [],
  declarations: [],
  exports: [],
  providers: []
})
export class KMCServerPollsModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: KMCServerPollsModule,
      providers: [KmcServerPolls]
    };
  }
}
