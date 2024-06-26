import {Injectable, OnDestroy} from '@angular/core';
import {asyncScheduler, BehaviorSubject, merge} from 'rxjs';
import { Observable, of as ObservableOf } from 'rxjs';
import { throwError } from 'rxjs';
import {map, catchError, observeOn} from 'rxjs/operators';
import {
    KalturaClient, KalturaLiveStreamConfiguration,
    KalturaMultiRequest, KalturaPlaybackProtocol,
    KalturaSipSourceType,
    PexipGenerateSipUrlAction
} from 'kaltura-ngx-client';
import {KalturaSourceType} from 'kaltura-ngx-client';
import {KalturaLiveStreamBitrate} from 'kaltura-ngx-client';
import {KalturaRecordStatus} from 'kaltura-ngx-client';
import {KalturaLiveStreamEntry} from 'kaltura-ngx-client';
import {KalturaDVRStatus} from 'kaltura-ngx-client';
import {KalturaMediaEntry} from 'kaltura-ngx-client';
import {LiveStreamRegenerateStreamTokenAction} from 'kaltura-ngx-client';
import { AppLocalization } from '@kaltura-ng/mc-shared';
import {AppAnalytics, BrowserService} from 'app-shared/kmc-shell';
import {LiveXMLExporter} from './live-xml-exporter';
import {AVAIL_BITRATES} from './bitrates';
import {EntryWidget} from '../entry-widget';
import {ConversionProfileListAction} from 'kaltura-ngx-client';
import {KalturaConversionProfileFilter} from 'kaltura-ngx-client';
import {KalturaFilterPager} from 'kaltura-ngx-client';
import {KalturaConversionProfileType} from 'kaltura-ngx-client';
import {KalturaNullableBoolean} from 'kaltura-ngx-client';
import {AreaBlockerMessage, KalturaValidators} from '@kaltura-ng/kaltura-ui';
import {BaseEntryGetAction} from 'kaltura-ngx-client';
import { KMCPermissions, KMCPermissionsService } from 'app-shared/kmc-shared/kmc-permissions';
import { ContentEntryViewSections } from 'app-shared/kmc-shared/kmc-views/details-views/content-entry-view.service';
import { LiveDashboardAppViewService } from 'app-shared/kmc-shared/kmc-views/component-views';
import {KalturaLogger} from '@kaltura-ng/kaltura-logger';
import { cancelOnDestroy, tag } from '@kaltura-ng/kaltura-common';
import {FormBuilder, FormGroup} from "@angular/forms";

export interface bitrate {
	enabled: boolean,
	bitrate: number,
	width: number,
	height: number,
	errors: string
}

@Injectable()
export class EntryLiveWidget extends EntryWidget implements OnDestroy {

	public _liveType: string = "";
	private dirty: boolean;

	private _conversionProfiles: BehaviorSubject<{ items: any[]}> = new BehaviorSubject<{ items: any[]}>({items: []});
	public _conversionProfiles$ = this._conversionProfiles.asObservable();

	public _recordStatus: string = "";
	public _manualLiveUrl: string = "";
	public _DVRStatus: string = "";
	public _showDVRWindow: boolean = false;
	public _dvrWindowAvailable: boolean = false;
	public _explicitLive: boolean = true;
	public _lowLatency: boolean = false;
	public _srtKey: string = '';
	public _liveDashboardEnabled: boolean = false;

	public _selectedConversionProfile: number;
	public _manualStreamsConfiguration = [];
	public _bitrates: bitrate[] = [];
	public _availableBitrates = AVAIL_BITRATES;
    public _form: FormGroup;

	public _autoStartOptions = [
		{label: this._appLocalization.get('applications.content.entryDetails.live.disabled'), value: true},
		{label: this._appLocalization.get('applications.content.entryDetails.live.enabled'), value: false}
	];

	constructor(private _kalturaServerClient: KalturaClient,
              private _appLocalization: AppLocalization,
              private _analytics: AppAnalytics,
              private _permissionsService: KMCPermissionsService,
              private _browserService: BrowserService,
              private _liveDasboardAppViewService: LiveDashboardAppViewService,
              private _fb: FormBuilder,
              logger: KalturaLogger) {
		super(ContentEntryViewSections.Live, logger);
	}

    public initManualForm() {
        this._form = this._fb.group({
                flashHDSURL: ['', KalturaValidators.url],
                hlsStreamUrl: ['', KalturaValidators.url],
                dashStreamUrl: ['', KalturaValidators.url]
            },
            {
                validator: (formGroup: FormGroup) => {
                    return this._atLeastOneUrlValidator(formGroup);
                }
            });

        let flashHDSURL = this._manualStreamsConfiguration.find(stream => stream.label.split(" ")[0] === KalturaPlaybackProtocol.akamaiHds)?.url || '';
        if (flashHDSURL === '') {
            flashHDSURL = this._manualStreamsConfiguration.find(stream => stream.label.split(" ")[0] === KalturaPlaybackProtocol.hds)?.url || '';
        }
        const hlsStreamUrl = this._manualStreamsConfiguration.find(stream => stream.label.split(" ")[0] === KalturaPlaybackProtocol.appleHttp)?.url || '';
        const dashStreamUrl = this._manualStreamsConfiguration.find(stream => stream.label.split(" ")[0] === KalturaPlaybackProtocol.mpegDash)?.url || '';
        this._form.reset({ flashHDSURL, hlsStreamUrl, dashStreamUrl });

        merge(this._form.valueChanges,
            this._form.statusChanges)
            .pipe(observeOn(asyncScheduler)) // using async scheduler so the form group status/dirty mode will be synchornized
            .pipe(cancelOnDestroy(this))
            .subscribe(
                () => {
                    super.updateState({
                        isValid: this._form.status !== 'INVALID',
                        isDirty: this._form.dirty
                    });
                }
            );
    }

	protected onReset() {
		this._DVRStatus = "";
        this._manualLiveUrl = "";
		this._showDVRWindow = false;
		this._dvrWindowAvailable = false;
		this._selectedConversionProfile = null;
		this._explicitLive = true;
		this._lowLatency = false;
		this._srtKey = "";
		this._manualStreamsConfiguration = [];
		this._bitrates = [];
		this.dirty = false;
	}

	protected onDataSaving(data: KalturaMediaEntry, request: KalturaMultiRequest) {
		if (this._liveType === "universal") {
			// create bitrate array for saving
			let bitrates: KalturaLiveStreamBitrate[] = [];
			this._bitrates.forEach((br: bitrate) => {
				if (br.enabled) {
					bitrates.push(new KalturaLiveStreamBitrate({
						bitrate: br.bitrate,
						width: br.width,
						height: br.height
					}));
				}
			});
			(data as KalturaLiveStreamEntry).bitrates = bitrates;
		}
		if (this._liveType === "kaltura") {
            const entry = this.data as KalturaLiveStreamEntry;
			(data as KalturaLiveStreamEntry).explicitLive = this._explicitLive ? KalturaNullableBoolean.trueValue : KalturaNullableBoolean.falseValue;
			(data as KalturaLiveStreamEntry).adminTags = this.getAdminTags(entry.adminTags || '');
			(data as KalturaLiveStreamEntry).srtPass = this._srtKey === '' ? null : this._srtKey;
			(data as KalturaLiveStreamEntry).conversionProfileId = this._selectedConversionProfile;
		}
		if (this._liveType === "manual") {
            const entry = data as KalturaLiveStreamEntry;
            entry.liveStreamConfigurations = [];
            // save hls stream to main entry and stream configuration
            const hlsStreamUrl = this._form.controls['hlsStreamUrl'].value;
            entry.hlsStreamUrl = hlsStreamUrl;
            if (hlsStreamUrl && hlsStreamUrl.length) {
                const cfg = new KalturaLiveStreamConfiguration();
                cfg.protocol = KalturaPlaybackProtocol.appleHttp;
                cfg.url = hlsStreamUrl;
                entry.liveStreamConfigurations.push(cfg);
            }

            // save flash stream to stream configuration
            const flashStreamUrl = this._form.controls['flashHDSURL'].value;
            if (flashStreamUrl && flashStreamUrl.length) {
                let protocol = KalturaPlaybackProtocol.akamaiHds;
                let flashStreamConfig = (this.data as KalturaLiveStreamEntry).liveStreamConfigurations.find(cfg => cfg.protocol === KalturaPlaybackProtocol.akamaiHds);
                if (!flashStreamConfig) {
                    protocol = KalturaPlaybackProtocol.hds;
                }
                const cfg = new KalturaLiveStreamConfiguration();
                cfg.protocol = protocol;
                cfg.url = flashStreamUrl;
                entry.liveStreamConfigurations.push(cfg);
            }

            // save dash stream to stream configuration
            const dashStreamUrl = this._form.controls['dashStreamUrl'].value;
            if (dashStreamUrl && dashStreamUrl.length) {
                const dashStreamConfig = (this.data as KalturaLiveStreamEntry).liveStreamConfigurations.find(cfg => cfg.protocol === KalturaPlaybackProtocol.mpegDash);
                const cfg = new KalturaLiveStreamConfiguration();
                cfg.protocol = KalturaPlaybackProtocol.mpegDash;
                cfg.url = dashStreamUrl;
                entry.liveStreamConfigurations.push(cfg);
            }
		}
	}

    private getAdminTags(tags: string): string {
        if (this._lowLatency) {
            if (tags.indexOf('lowlatency') === -1) {
                if (tags === '') {
                    tags = 'lowlatency';
                } else {
                    tags += ',lowlatency';
                }
            }
        } else {
            if (tags.indexOf('lowlatency') > -1) {
                if (tags.indexOf(',lowlatency') !== -1) {
                    tags = tags.replace(',lowlatency','');
                } else {
                    tags = tags.replace('lowlatency', '');
                }
            }
        }
        return tags;
    }

    public onSrtPassChange(): void {
        if (this._srtKey.length > 9 && this._srtKey.length < 80){
            this.setDirty();
        }
    }

	protected onValidate(wasActivated: boolean): Observable<{ isValid: boolean}> {
		return Observable.create(observer => {
			let isValid = this._liveType === "universal" ? this._validateBitrates({updateDirtyMode: false}) : true;
            if (this._liveType === "manual") {
                for (const controlName in this._form.controls) {
                    if (this._form.controls.hasOwnProperty(controlName)) {
                        if (this._form.get(controlName).errors !== null) {
                            isValid = false;
                        }
                    }
                }
                if (this._form.errors !== null) {
                    isValid = false;
                }
            }
            observer.next({isValid});
			observer.complete()
		});
	}

    private _atLeastOneUrlValidator(formgroup: FormGroup) {
        if (!formgroup.controls['flashHDSURL'].value &&
            !formgroup.controls['hlsStreamUrl'].value &&
            !formgroup.controls['dashStreamUrl'].value) {
            return {atLeastOneUrl: true};
        } else {
            return null;
        }
    }

	protected onActivate(firstTimeActivating : boolean) {
		// set live type and load data accordingly
		switch (this.data.sourceType.toString()) {
      case KalturaSourceType.liveStream.toString():
				this._liveType = "kaltura";
        this._liveDashboardEnabled = this._liveDasboardAppViewService.isAvailable()
          && this._permissionsService.hasPermission(KMCPermissions.ANALYTICS_BASE);
				this._setRecordStatus();
				this._setDVRStatus();
				super._showLoader();
				this._conversionProfiles.next({items: []});

        if (this._permissionsService.hasPermission(KMCPermissions.FEATURE_KALTURA_LIVE_STREAM)) {
          return this._kalturaServerClient.request(new ConversionProfileListAction({
            filter: new KalturaConversionProfileFilter({
              typeEqual: KalturaConversionProfileType.liveStream
            }),
            pager: new KalturaFilterPager({
              pageIndex: 1,
              pageSize: 500
            })
          }))
            .pipe(cancelOnDestroy(this, this.widgetReset$))
            .pipe(catchError((error, caught) => {
              super._hideLoader();
              super._showActivationError();
              this._conversionProfiles.next({ items: [] });
              return throwError(error);
            }))
            .pipe(map(response => {
              if (response.objects && response.objects.length) {
                // set the default profile first in the array
                response.objects.sort((a, b) => {
                  if (a.isDefault > b.isDefault) {
                    return -1;
                  }
                  if (a.isDefault < b.isDefault) {
                    return 1;
                  }
                  return 0;
                });
                // create drop down options array
                const conversionProfiles = [];
                response.objects.forEach(profile => {
                  conversionProfiles.push({ label: profile.name, value: profile.id });
                  if (this.data.conversionProfileId === profile.id) {
                    this._selectedConversionProfile = profile.id; // preselect this profile in the profiles drop-down
                  }
                });
                this._conversionProfiles.next({ items: conversionProfiles });
                super._hideLoader();

                  return {failed: false};
              } else {
                  return {failed: true};
              }
            }));
        } else {
          super._hideLoader();
          break;
        }
			case KalturaSourceType.akamaiUniversalLive.toString():
				this._liveType = "universal";
				this._showDVRWindow = true;
				this._setDVRStatus();
				this._setBitrates();
				break;
			case KalturaSourceType.manualLiveStream.toString():
				this._liveType = "manual";
				this._setManualStreams();
                this.initManualForm();
				break;
		}

        return ObservableOf({failed: false});
	}

	public _exportXML() {
		const entry = this.data as KalturaLiveStreamEntry;
		const xml: string = LiveXMLExporter.exportXML(entry, this._liveType, this._bitrates);
		this._browserService.download(xml, "export_" + entry.id + ".xml", "text/xml");
	}

	private _setDVRStatus(): void {
		let entry = this.data as KalturaLiveStreamEntry;
		if (!entry.dvrStatus || entry.dvrStatus.toString() === KalturaDVRStatus.disabled.toString()) {
			this._DVRStatus = this._appLocalization.get('app.common.off');
		} else if (entry.dvrStatus.toString() == KalturaDVRStatus.enabled.toString()) {
			this._DVRStatus = this._appLocalization.get('app.common.on');
			if (this._liveType === "kaltura") {
				this._showDVRWindow = true;
				this._dvrWindowAvailable = !isNaN(entry.dvrWindow);
			}
		}
		this._explicitLive = entry.explicitLive === KalturaNullableBoolean.trueValue;
		this._lowLatency = entry.adminTags && entry.adminTags.indexOf('lowlatency') > -1;
        this._srtKey = entry.srtPass;
	}

	private _setRecordStatus(): void {
		let entry = this.data as KalturaLiveStreamEntry;
		if (!entry.recordStatus || entry.recordStatus.toString() === KalturaRecordStatus.disabled.toString()) {
			this._recordStatus = this._appLocalization.get('app.common.off');
		} else if (entry.recordStatus.toString() === KalturaRecordStatus.appended.toString() || entry.recordStatus.toString() === KalturaRecordStatus.perSession.toString()) {
			this._recordStatus = this._appLocalization.get('app.common.on');
		}
	}

	private _setManualStreams(): void {
		let entry: KalturaLiveStreamEntry = this.data as KalturaLiveStreamEntry;
        this._manualLiveUrl = entry.hlsStreamUrl;
		if (entry.liveStreamConfigurations) {
			entry.liveStreamConfigurations.forEach(streamConfig => {
				let protocol = streamConfig.protocol.toString();
				let postfix = this._appLocalization.get('applications.content.entryDetails.live.streamUrl');
				this._manualStreamsConfiguration.push({label: protocol + " " + postfix, url: streamConfig.url});
			});
		}
	}

	private _setBitrates(): void {
		this._bitrates = [];
		let entry: KalturaLiveStreamEntry = this.data as KalturaLiveStreamEntry;
		if (entry.bitrates) {
			entry.bitrates.forEach((br: KalturaLiveStreamBitrate) => {
				let bitRate: bitrate = {
					enabled: true,
					bitrate: br.bitrate,
					width: br.width,
					height: br.height,
					errors: ""
				};
				this._bitrates.push(bitRate);
			});
			// prepare empty bitrate slots for missing bitrates
			while (this._bitrates.length < 3) {
				this._bitrates.push({enabled: false, bitrate: 0, width: 0, height: 0, errors: ""});
			}
		}
	}
	public _validateBitrates({updateDirtyMode} : {updateDirtyMode: boolean}): boolean {
		let valid = true;
		this._bitrates.forEach((br: bitrate) => {
			br.errors = "";
			if (br.enabled) {
				if (br.bitrate > 0) {
					if (br.width === 0 || br.height === 0) {
						valid = false;
						br.errors = this._appLocalization.get('applications.content.entryDetails.live.dimensionsError');
					}
				} else {
					valid = false;
					br.errors = this._appLocalization.get('applications.content.entryDetails.live.bitrateError');
				}
			}
		});
		const newStatus: any = {isValid: valid};

		if (updateDirtyMode)
		{
			newStatus.isDirty = true;
		}

		super.updateState(newStatus);

		return valid;
	}

	public setDirty():void{
		super.updateState({isValid: true, isDirty: true});
	}

    public clearSrtPass(): void {
        this._srtKey = '';
        this.setDirty();
    }

    public _generateSrtPass(): void {
        this._analytics.trackClickEvent('Generate_passphrase_encryption');
        let rndString = '';
        let chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (let i = 48; i > 0; --i) {
            rndString += chars[Math.floor(Math.random() * chars.length)];
        }
        this._srtKey = rndString;
        this.setDirty();
    }

	public regenerateStreamToken(): void {
		this.sectionBlockerMessage = null;

		const multiRequest = new KalturaMultiRequest(
			new LiveStreamRegenerateStreamTokenAction({entryId: this.data.id}),
			new BaseEntryGetAction({entryId: this.data.id})
		);


		this._kalturaServerClient.multiRequest(multiRequest)
			.pipe(cancelOnDestroy(this, this.widgetReset$))
			.pipe(tag('block-shell'))
			.subscribe(
				response => {
					if (response.hasErrors()) {
						this._showBlockerMessage(new AreaBlockerMessage(
							{
								message: this._appLocalization.get('applications.content.entryDetails.live.regenerateFailure'),
								buttons: [
									{
										label: this._appLocalization.get('app.common.dismiss'),
										action: () => {
											this.sectionBlockerMessage = null;
										}
									},
									{
										label: this._appLocalization.get('app.common.retry'),
										action: () => {
											this.regenerateStreamToken();
										}
									}
								]
							}
						), false);
					}else {
						let entry: KalturaLiveStreamEntry = this.data as KalturaLiveStreamEntry;
						entry.primaryBroadcastingUrl = response[1].result.primaryBroadcastingUrl;
						entry.primaryRtspBroadcastingUrl =  response[1].result.primaryRtspBroadcastingUrl;
						entry.secondaryBroadcastingUrl =  response[1].result.secondaryBroadcastingUrl;
						entry.secondaryRtspBroadcastingUrl =  response[1].result.secondaryRtspBroadcastingUrl;
						entry.primarySrtStreamId =  response[1].result.primarySrtStreamId;
						entry.secondarySrtStreamId =  response[1].result.secondarySrtStreamId;
					}
				}
			);
	}

    public generateSipToken(sourceType: KalturaSipSourceType, regenerate: boolean): Observable<any> {
        const request = new PexipGenerateSipUrlAction({
            entryId: this.data.id,
            regenerate,
            sourceType
        });
        return this._kalturaServerClient.request(request).pipe(cancelOnDestroy(this, this.widgetReset$));
    }

	ngOnDestroy()
    {

    }
}
