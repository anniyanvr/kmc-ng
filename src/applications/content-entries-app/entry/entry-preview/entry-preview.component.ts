import {Component, OnDestroy, OnInit} from '@angular/core';
import {EntryPreviewWidget} from './entry-preview-widget.service';
import {KalturaMediaEntry} from 'kaltura-ngx-client';
import {KalturaEntryStatus} from 'kaltura-ngx-client';
import {AppEventsService} from 'app-shared/kmc-shared';
import {PreviewAndEmbedEvent} from 'app-shared/kmc-shared/events';
import {AppLocalization} from '@kaltura-ng/mc-shared';
import {KMCPermissionsService} from 'app-shared/kmc-shared/kmc-permissions/kmc-permissions.service';
import {KMCPermissions} from 'app-shared/kmc-shared/kmc-permissions';
import {KalturaLogger} from '@kaltura-ng/kaltura-logger';
import { ClipAndTrimAppViewService } from 'app-shared/kmc-shared/kmc-views/component-views';
import { EntryStore } from '../entry-store.service';
import { cancelOnDestroy, tag } from '@kaltura-ng/kaltura-common';
import {AppAnalytics} from "app-shared/kmc-shell";

@Component({
	selector: 'kEntryPreview',
	templateUrl: './entry-preview.component.html',
	styleUrls: ['./entry-preview.component.scss'],
  providers: [
    KalturaLogger.createLogger('EntryPreviewComponent')
  ]
})
export class EntryPreview implements OnInit, OnDestroy {

	public _actionLabel: string;
  public _clipAndTrimEnabled = false;
    public _clipAndTrimDisabledReason: string = null;
    public _previewDisabled = false;


  private _currentEntry: KalturaMediaEntry;


	constructor(public _widgetService: EntryPreviewWidget,
                private _appLocalization: AppLocalization,
                private _analytics: AppAnalytics,
                private _clipAndTrimAppViewService: ClipAndTrimAppViewService,
                private _permissionsService: KMCPermissionsService,
                private _appEvents: AppEventsService,
                private _store: EntryStore) {
	}

	private _checkClipAndTrimAvailability(): void {

	    if (this._currentEntry) {
            this._clipAndTrimEnabled = this._clipAndTrimAppViewService.isAvailable({
                entry: this._currentEntry,
                hasSource: this._store.hasSource.value()
            });
        } else {
            this._clipAndTrimEnabled = false;
        }
    }

	ngOnInit() {
        const hasEmbedPermission = this._permissionsService.hasPermission(KMCPermissions.CONTENT_MANAGE_EMBED_CODE);
        this._actionLabel = hasEmbedPermission
            ? this._appLocalization.get('applications.content.entryDetails.preview.pande')
            : this._appLocalization.get('applications.content.entryDetails.preview.previewInPlayer');

        this._widgetService.attachForm();

        this._store.hasSource.value$
            .pipe(cancelOnDestroy(this))
            .subscribe(
                data => {
                    this._checkClipAndTrimAvailability();
                });

        this._widgetService.data$
            .pipe(cancelOnDestroy(this))
            .subscribe(
            data => {
                if (data) {
                    this._currentEntry = data;
                    const entryHasContent = this._currentEntry.status.toString() !== KalturaEntryStatus.noContent.toString();

                    this._previewDisabled = !entryHasContent;
                }

                this._checkClipAndTrimAvailability();

            }
        );
    }

	openPreviewAndEmbed() {
        this._analytics.trackClickEvent('Share_Embed');
		this._appEvents.publish(new PreviewAndEmbedEvent(this._currentEntry));
	}

	ngOnDestroy() {
		this._widgetService.detachForm();
	}
}

