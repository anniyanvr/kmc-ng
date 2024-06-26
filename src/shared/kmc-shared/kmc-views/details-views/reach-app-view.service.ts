import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BrowserService } from 'shared/kmc-shell/providers/browser.service';
import { KalturaCategory, KalturaEntryStatus, KalturaExternalMediaEntry, KalturaMediaEntry, KalturaMediaType } from 'kaltura-ngx-client';
import { serverConfig } from 'config/server';
import { KMCPermissions, KMCPermissionsService } from 'shared/kmc-shared/kmc-permissions/index';
import { DetailsViewMetadata, KmcDetailsViewBaseService } from 'app-shared/kmc-shared/kmc-views/kmc-details-view-base.service';
import { AppLocalization } from '@kaltura-ng/mc-shared';
import { KalturaLogger } from '@kaltura-ng/kaltura-logger';
import { ContextualHelpService } from 'app-shared/kmc-shared/contextual-help/contextual-help.service';
import { Title } from '@angular/platform-browser';
import { AppEventsService } from 'app-shared/kmc-shared/app-events';
import { CaptionRequestEvent } from 'app-shared/kmc-shared/events';
import { Observable, of as ObservableOf } from 'rxjs';

export enum ReachPages {
    entry = 'entry',
    entries = 'entries',
    category = 'category',
    dashboard = 'dashboard',
    caption = 'caption'
}

export interface ReachAppViewArgs {
    entry?: KalturaMediaEntry;
    entries?: KalturaMediaEntry[];
    category?: KalturaCategory;
    captionId?: string;
    page: ReachPages;
}

@Injectable()
export class ReachAppViewService extends KmcDetailsViewBaseService<ReachAppViewArgs> {

    constructor(private _appPermissions: KMCPermissionsService,
                private _appLocalization: AppLocalization,
                private _router: Router,
                private _appEvents: AppEventsService,
                _browserService: BrowserService,
                _logger: KalturaLogger,
                _titleService: Title,
                _contextualHelpService: ContextualHelpService) {
        super(_logger.subLogger('ReachAppViewService'), _browserService,
            _titleService, _contextualHelpService);
    }

    private _availableByPermission(args: ReachAppViewArgs): boolean {
        let _available: boolean = this._appPermissions.hasPermission(KMCPermissions.REACH_PLUGIN_PERMISSION);
        if (args.page === ReachPages.category) {
            _available = _available && this._appPermissions.hasPermission(KMCPermissions.CONTENT_MANAGE_EDIT_CATEGORIES);
        } else if (args.page === ReachPages.entry || args.page === ReachPages.entries){
            _available = _available && this._appPermissions.hasPermission(KMCPermissions.CAPTION_MODIFY);
        }
        return _available;
    }

    private _availableByData(args: ReachAppViewArgs): boolean {
        switch (args.page) {
            case ReachPages.entry:
            case ReachPages.caption:
                return this.isRelevantEntry(args.entry);
            case ReachPages.entries:
            case ReachPages.dashboard:
                return true; // since we build bulk actions menu before entries are selected, always allow by data
            case ReachPages.category:
                return args.category instanceof KalturaCategory;
            default:
                return false;
        }
    }

    public isRelevantEntry(entry: KalturaMediaEntry): boolean {
        if (entry) {
            const notImage = entry.mediaType !== KalturaMediaType.image;
            const isReady = entry.status === KalturaEntryStatus.ready;
            return isReady && notImage;
        }
        return false;
    }

    protected _open(args: ReachAppViewArgs): Observable<boolean> {
        this._logger.info('handle open view request by the user', { page: args.page });
        const page = args.page;
        delete args.page;
        this._appEvents.publish(new CaptionRequestEvent(args, page));
        return ObservableOf(true);
    }

    public isAvailable(args: ReachAppViewArgs): boolean {
        const isAvailableByConfig = !!serverConfig.externalApps.reach;
        const isAvailableByPermission = this._availableByPermission(args);
        const isAvailableByData = this._availableByData(args);

        return isAvailableByConfig && isAvailableByData && isAvailableByPermission;
    }

    public getViewMetadata(args: ReachAppViewArgs): DetailsViewMetadata {
        return { title: '', viewKey: '' };
    }
}
