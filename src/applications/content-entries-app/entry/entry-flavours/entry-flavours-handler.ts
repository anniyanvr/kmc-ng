import { Injectable } from '@angular/core';
import { EntryFormWidget } from '../entry-form-widget';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { EntryWidgetKeys } from '../entry-widget-keys';
import { Observable } from 'rxjs/Observable';
import { AppAuthentication } from 'app-shared/kmc-shell';
import { AppLocalization } from '@kaltura-ng/kaltura-common';
import { AreaBlockerMessage } from '@kaltura-ng/kaltura-ui';
import { KalturaClient } from '@kaltura-ng/kaltura-client';
import { BrowserService } from 'app-shared/kmc-shell';
import { KalturaFlavorAsset } from 'kaltura-typescript-client/types/KalturaFlavorAsset';
import { KalturaFlavorAssetWithParams } from 'kaltura-typescript-client/types/KalturaFlavorAssetWithParams';
import { FlavorAssetGetFlavorAssetsWithParamsAction } from 'kaltura-typescript-client/types/FlavorAssetGetFlavorAssetsWithParamsAction';
import { KalturaFlavorAssetStatus } from 'kaltura-typescript-client/types/KalturaFlavorAssetStatus';
import { KalturaLiveParams } from 'kaltura-typescript-client/types/KalturaLiveParams';
import { KalturaEntryStatus } from 'kaltura-typescript-client/types/KalturaEntryStatus';
import { KalturaWidevineFlavorAsset } from 'kaltura-typescript-client/types/KalturaWidevineFlavorAsset';
import { FlavorAssetDeleteAction } from 'kaltura-typescript-client/types/FlavorAssetDeleteAction';
import { FlavorAssetConvertAction } from 'kaltura-typescript-client/types/FlavorAssetConvertAction';
import { FlavorAssetReconvertAction } from 'kaltura-typescript-client/types/FlavorAssetReconvertAction';
import { KalturaUploadedFileTokenResource } from 'kaltura-typescript-client/types/KalturaUploadedFileTokenResource';
import { FlavorAssetSetContentAction } from 'kaltura-typescript-client/types/FlavorAssetSetContentAction';
import { FlavorAssetAddAction } from 'kaltura-typescript-client/types/FlavorAssetAddAction';
import { KalturaUrlResource } from 'kaltura-typescript-client/types/KalturaUrlResource';
import { KalturaContentResource } from 'kaltura-typescript-client/types/KalturaContentResource';
import { UploadManagement } from '@kaltura-ng/kaltura-common/upload-management';
import { KalturaOVPFile } from '@kaltura-ng/kaltura-server-utils/upload-management';
import { Message } from 'primeng/primeng';
import { environment } from 'app-environment';
import { Flavor } from './flavor';

@Injectable()
export class EntryFlavoursHandler extends EntryFormWidget
{
	private _flavors = new BehaviorSubject<{ items : Flavor[]}>(
		{ items : []}
	);
	public _flavors$ = this._flavors.asObservable();

	public _entryStatus = "";
	public _entryStatusClassName = "";
	public sourceAvailabale: boolean = false;
	public _msgs: Message[] = [];

    constructor( private _kalturaServerClient: KalturaClient, private _appLocalization: AppLocalization,
	     private _appAuthentication: AppAuthentication, private _browserService: BrowserService, private _uploadManagement : UploadManagement)
    {
        super(EntryWidgetKeys.Flavours);
    }

    /**
     * Do some cleanups if needed once the section is removed
     */
    protected _onReset()
    {
	    this._msgs = [];
    }

    protected _onActivate(firstTimeActivating: boolean) {
	    this._setEntryStatus();
        return this._fetchFlavors('activation', true);
    }

    public _fetchFlavors(origin: 'activation' | 'reload' , reset: boolean = true, showLoader: boolean = true): Observable<{ failed: boolean, error?: Error }>{
	    return Observable.create(observer =>
	    {
		    if (showLoader) {
			    super._showLoader();
		    }
		    if (reset) {
			    this._flavors.next({items: []});
		    }
		    this.sourceAvailabale = false;

		    let requestSubscription = this._kalturaServerClient.request(new FlavorAssetGetFlavorAssetsWithParamsAction({
			    entryId: this.data.id
		    }))
			    .cancelOnDestroy(this,this.widgetReset$)
			    .monitor('get flavors')
			    .subscribe(
				    response =>
				    {
					    if (response && response.length) {
						    let flavors: Flavor[] = [];
						    let flavorsWithAssets: Flavor[] = [];
						    let flavorsWithoutAssets: Flavor[] = [];
						    response.forEach((flavor: KalturaFlavorAssetWithParams) => {
							    if (flavor.flavorAsset && flavor.flavorAsset.isOriginal){
								    flavors.push(this.createFlavor(flavor, response)); // this is the source. put it first in the array
								    this.sourceAvailabale = true;
							    }else if (flavor.flavorAsset && (!flavor.flavorAsset.status || (flavor.flavorAsset.status && flavor.flavorAsset.status.toString() !== KalturaFlavorAssetStatus.temp.toString()))){
								    flavorsWithAssets.push(this.createFlavor(flavor, response)); // flavors with assets that is not in temp status
							    }else if (!flavor.flavorAsset && flavor.flavorParams && !(flavor.flavorParams instanceof KalturaLiveParams)){
								    flavorsWithoutAssets.push(this.createFlavor(flavor, response)); // flavors without assets
							    }
						    });
						    flavors = flavors.concat(flavorsWithAssets).concat(flavorsWithoutAssets); // source first, then flavors with assets, then flavors without assets
						    super._hideLoader();
						    this._flavors.next({items : flavors});
						    observer.next({failed: false});
						    observer.complete();
					    }
				    },
				    error =>
				    {
					    this._flavors.next({items : []});
					    super._hideLoader();
					    if (origin === 'activation') {
						    super._showActivationError();
					    }else {
						    this._showBlockerMessage(new AreaBlockerMessage(
							    {
								    message: this._appLocalization.get('applications.content.entryDetails.errors.flavorsLoadError'),
								    buttons: [
									    {
										    label: this._appLocalization.get('applications.content.entryDetails.errors.retry'),
										    action: () => {
											    this._fetchFlavors('reload', reset).cancelOnDestroy(this,this.widgetReset$).subscribe(() =>
											    {
												    // do nothing
											    });
										    }
									    }
								    ]
							    }
						    ), true);
					    }
					    observer.error({failed: true, error: error});
				    }
			    );

		    return () =>
		    {
			    if (requestSubscription)
			    {
				    requestSubscription.unsubscribe();
				    requestSubscription = null;
			    }
		    }
	    });

    }

	private createFlavor(flavor: KalturaFlavorAssetWithParams, allFlavors: KalturaFlavorAssetWithParams[]): Flavor{
		let newFlavor: Flavor = <Flavor>flavor;
		newFlavor.name = flavor.flavorParams ? flavor.flavorParams.name : '';
		newFlavor.id = flavor.flavorAsset ? flavor.flavorAsset.id : '';
		newFlavor.paramsId = flavor.flavorParams.id;
		newFlavor.isSource = flavor.flavorAsset ? flavor.flavorAsset.isOriginal : false;
		newFlavor.isWidevine = flavor.flavorAsset ? flavor.flavorAsset instanceof KalturaWidevineFlavorAsset : false;
		newFlavor.isWeb = flavor.flavorAsset ? flavor.flavorAsset.isWeb : false;
		newFlavor.format = flavor.flavorAsset ? flavor.flavorAsset.fileExt : '';
		newFlavor.codec = flavor.flavorAsset ? flavor.flavorAsset.videoCodecId : '';
		newFlavor.bitrate = (flavor.flavorAsset && flavor.flavorAsset.bitrate && flavor.flavorAsset.bitrate > 0) ? flavor.flavorAsset.bitrate.toString() : '';
		newFlavor.size = flavor.flavorAsset ? (flavor.flavorAsset.status.toString() === KalturaFlavorAssetStatus.ready.toString() ? flavor.flavorAsset.size.toString() : '0') : '';
		newFlavor.status = flavor.flavorAsset ? flavor.flavorAsset.status.toString() : '';
		newFlavor.statusLabel = "";
		newFlavor.statusTooltip = "";
		newFlavor.tags = flavor.flavorAsset ? flavor.flavorAsset.tags : '-';
		newFlavor.drm = {};

		// set dimensions
		const width: number = flavor.flavorAsset ? flavor.flavorAsset.width :flavor.flavorParams.width;
		const height: number = flavor.flavorAsset ? flavor.flavorAsset.height :flavor.flavorParams.height;
		const w: string = width === 0 ? "[auto]" : width.toString();
		const h: string = height === 0 ? "[auto]" : height.toString();
		newFlavor.dimensions = w + " x " + h;

		// set status
		if (flavor.flavorAsset) {
			newFlavor.statusLabel = this._appLocalization.get('applications.content.entryDetails.flavours.status.' + KalturaFlavorAssetStatus[flavor.flavorAsset.status]);
			if (flavor.flavorAsset.status.toString() === KalturaFlavorAssetStatus.notApplicable.toString()){
				newFlavor.statusTooltip = this._appLocalization.get('applications.content.entryDetails.flavours.status.naTooltip');
			}
		}

		// add DRM details
		if (newFlavor.isWidevine){
			// get source flavors for DRM
			const sourceIDs = (flavor.flavorAsset as KalturaWidevineFlavorAsset).actualSourceAssetParamsIds ? (flavor.flavorAsset as KalturaWidevineFlavorAsset).actualSourceAssetParamsIds.split(",") : [];
			let sources = [];
			sourceIDs.forEach(sourceId => {
				allFlavors.forEach(flavor => {
					if (flavor.flavorParams.id.toString() === sourceId){
						sources.push(flavor.flavorParams.name);
					}
				});
			});
			// set start and end date
			let startDate = (flavor.flavorAsset as KalturaWidevineFlavorAsset).widevineDistributionStartDate;
			if (startDate == -2147483648 || startDate == 18001 || startDate == 2000001600) {
				startDate = null;
			}
			let endDate = (flavor.flavorAsset as KalturaWidevineFlavorAsset).widevineDistributionEndDate;
			if (endDate == -2147483648 || endDate == 18001 || endDate == 2000001600) {
				endDate = null;
			}
			newFlavor.drm = {
				name: flavor.flavorParams.name,
				id: (flavor.flavorAsset as KalturaWidevineFlavorAsset).widevineAssetId,
				flavorSources: sources,
				startTime: startDate,
				endTime: endDate
			};
		}
		return newFlavor;
	}

    private _setEntryStatus(){
	    const status = this.data.status.toString();
	    switch (status){
		    case KalturaEntryStatus.noContent.toString():
		    	this._entryStatusClassName = "kStatusNoContent kIconwarning";
			    break;
		    case KalturaEntryStatus.ready.toString():
		    	this._entryStatusClassName = "kStatusReady kIconconfirmation";
			    break;
		    case KalturaEntryStatus.errorConverting.toString():
		    case KalturaEntryStatus.errorImporting.toString():
		    	this._entryStatusClassName = "kStatusError kIconwarning";
			    break;
		    default:
		    	this._entryStatusClassName = "kStatusErrorProcessing kIconwarning";
			    break;
	    }
	    this._entryStatus = this._appLocalization.get('applications.content.entryDetails.flavours.' + this._entryStatusClassName.split(" ")[0]);
    }

    public deleteFlavor(flavor: Flavor): void{
	    this._browserService.confirm(
		    {
			    header: this._appLocalization.get('applications.content.entryDetails.flavours.deleteConfirmTitle'),
			    message: this._appLocalization.get('applications.content.entryDetails.flavours.deleteConfirm',{"0": flavor.id}),
			    accept: () => {
				    super._showLoader();
				    this._kalturaServerClient.request(new FlavorAssetDeleteAction({
					    id: flavor.id
				    }))
					    .cancelOnDestroy(this,this.widgetReset$)
					    .monitor('delete flavor: '+flavor.id)
					    .subscribe(
						    response =>
						    {
							    super._hideLoader();
							    this._msgs = [];
							    this._msgs.push({severity: 'success', summary: '', detail: this._appLocalization.get('applications.content.entryDetails.flavours.deleteSuccess')});
							    this._fetchFlavors('reload', false).cancelOnDestroy(this,this.widgetReset$).subscribe(() =>
							    {
								    // do nothing
							    });
						    },
						    error =>
						    {
							    super._hideLoader();
							    this._msgs = [];
							    this._msgs.push({severity: 'error', summary: '', detail: this._appLocalization.get('applications.content.entryDetails.flavours.deleteFailure')});
						    }
					    );
			    }
		    });
    }

    public downloadFlavor (flavor: Flavor): void{
	    const baseUrl = environment.core.kaltura.cdnUrl;
	    const protocol = baseUrl.split(":")[0];
	    const partnerId = this._appAuthentication.appUser.partnerId;
	    let url = baseUrl + '/p/' + partnerId +'/sp/' + partnerId + '00/playManifest/entryId/' + this.data.id + '/flavorId/' + flavor.id + '/format/download/protocol/' + protocol;
	    this._browserService.openLink(url);
    }

    public convertFlavor(flavor: Flavor): void{
	    this._convert(flavor, flavor.paramsId.toString(), new FlavorAssetConvertAction({
		    flavorParamsId: flavor.paramsId,
		    entryId: this.data.id
	    }));
    }

	public reconvertFlavor(flavor: Flavor): void {
		this._convert(flavor, flavor.id, new FlavorAssetReconvertAction({
			id: flavor.id
		}));
	}

	private _convert(flavor: Flavor, id: any, request: any): void{
		flavor.status = KalturaFlavorAssetStatus.waitForConvert.toString();
		flavor.statusLabel = this._appLocalization.get('applications.content.entryDetails.flavours.status.converting');
		this._kalturaServerClient.request(request)
			.cancelOnDestroy(this,this.widgetReset$)
			.monitor('convert flavor')
			.subscribe(
				response =>
				{
					let flavors: Flavor[] = Array.from(this._flavors.getValue().items);
					flavors.forEach((fl:Flavor) => {
						if (parseInt(fl.id) == id){
							fl.status = KalturaFlavorAssetStatus.converting.toString();
						}
					});
					this._flavors.next({items : flavors});
				},
				error =>
				{
					this._msgs = [];
					this._msgs.push({severity: 'error', summary: '', detail: this._appLocalization.get('applications.content.entryDetails.flavours.convertFailure')});
					this._fetchFlavors('reload', false).cancelOnDestroy(this,this.widgetReset$).subscribe(() =>
					{
						// reload flavors as we need to get the flavor status from the server
					});
				}
			);
	}

	public uploadFlavor(flavor: Flavor, fileData: File): void{
		flavor.status = KalturaFlavorAssetStatus.importing.toString();
		flavor.statusLabel = this._appLocalization.get('applications.content.entryDetails.flavours.status.uploading');
		this._uploadManagement.newUpload(new KalturaOVPFile(fileData))
			.subscribe((response) => {
				let resource = new KalturaUploadedFileTokenResource();
				resource.token = response.uploadToken;
				if (flavor.id.length){
					this.updateFlavor(flavor, flavor.id, resource);
				}else{
					this.addNewFlavor(flavor, resource);
				}
			},
			(error) => {
				this._msgs = [];
				this._msgs.push({severity: 'error', summary: '', detail: this._appLocalization.get('applications.content.entryDetails.flavours.uploadFailure')});
				this._fetchFlavors('reload', false).cancelOnDestroy(this,this.widgetReset$).subscribe(() =>
				{
					// reload flavors as we need to get the flavor status from the server
				});
			});
	}

	private updateFlavor(flavor: Flavor, id: string, resource: KalturaContentResource): void{
		this._kalturaServerClient.request(new FlavorAssetSetContentAction({
			id: id,
			contentResource: resource
		}))
		.cancelOnDestroy(this,this.widgetReset$)
		.monitor('set flavor resource')
		.subscribe(
			response =>
			{
				this._fetchFlavors('reload', false, false).cancelOnDestroy(this,this.widgetReset$).subscribe(() =>
				{
					// do nothing
				});
			},
			error =>
			{
				this._msgs = [];
				this._msgs.push({severity: 'error',	summary: '', detail: this._appLocalization.get('applications.content.entryDetails.flavours.uploadFailure')});
				this._fetchFlavors('reload', false).cancelOnDestroy(this,this.widgetReset$).subscribe(() =>
				{
					// do nothing
				});
			}
		);
	}

	private addNewFlavor(flavor: Flavor, resource: KalturaContentResource): void{
		let flavorAsset: KalturaFlavorAsset = new KalturaFlavorAsset();
		flavorAsset.flavorParamsId = flavor.paramsId;
		this._kalturaServerClient.request(new FlavorAssetAddAction({
			entryId: this.data.id,
			flavorAsset: flavorAsset
		}))
		.cancelOnDestroy(this,this.widgetReset$)
		.monitor('add new flavor')
		.subscribe(
			response =>
			{
				this.updateFlavor(flavor, response.id, resource);
			},
			error =>
			{
				this._msgs = [];
				this._msgs.push({severity: 'error', summary: '', detail: this._appLocalization.get('applications.content.entryDetails.flavours.uploadFailure')});
				this._fetchFlavors('reload', false).cancelOnDestroy(this,this.widgetReset$).subscribe(() =>
				{
					// reload flavors as we need to get the flavor status from the server
				});
			}
		);
	}

	public importFlavor(flavor: Flavor, url: string): void{
		flavor.status = KalturaFlavorAssetStatus.importing.toString();
		let resource: KalturaUrlResource = new KalturaUrlResource({
			url : url
		});
		if (flavor.id.length){
			this.updateFlavor(flavor, flavor.id, resource);
		}else {
			this.addNewFlavor(flavor, resource);
		}
	}

	public _refresh(){
		this._fetchFlavors('reload', false).cancelOnDestroy(this,this.widgetReset$).subscribe(() =>
		{
			// reload flavors on refresh
		});
	}
}
