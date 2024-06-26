import { Injectable } from '@angular/core';
import { KmcMainViewBaseService, ViewMetadata } from '../kmc-main-view-base.service';
import { Router } from '@angular/router';
import { KalturaLogger } from '@kaltura-ng/kaltura-logger';
import { BrowserService } from 'app-shared/kmc-shell/providers/browser.service';
import { Title } from '@angular/platform-browser';
import { AppLocalization } from '@kaltura-ng/mc-shared';
import { serverConfig } from 'config/server';
import { ContextualHelpService } from 'app-shared/kmc-shared/contextual-help/contextual-help.service';
import { KMCPermissions, KMCPermissionsService } from "app-shared/kmc-shared/kmc-permissions";

@Injectable()
export class SettingsAuthenticationMainViewService extends KmcMainViewBaseService {

    constructor(
        logger: KalturaLogger,
        browserService: BrowserService,
        router: Router,
        private _appLocalization: AppLocalization,
        private _appPermissions: KMCPermissionsService,
        titleService: Title,
        contextualHelpService: ContextualHelpService
    ) {
        super(logger.subLogger('SettingsAuthenticationMainViewService'), browserService, router, titleService, contextualHelpService);
    }

    isAvailable(): boolean {
        return this._appPermissions.hasPermission(KMCPermissions.FEATURE_AUTH_BROKER_PERMISSION) && !!serverConfig.externalServices && !!serverConfig.externalServices.authProfileEndpoint && !!serverConfig.externalServices.authProfileEndpoint.uri;
    }

    getRoutePath(): string {
        return 'settings/authentication';
    }

    getViewMetadata(): ViewMetadata {
        return {
            viewKey: 'settings-authentication',
            title: this._appLocalization.get('app.titles.settingsAuthenticationPageTitle'),
            menu: this._appLocalization.get('app.titles.settingsAuthenticationMenuTitle')
        };
    }
}
