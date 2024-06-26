import {AfterViewInit, Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {ISubscription} from 'rxjs/Subscription';
import {Subject} from 'rxjs';

import {
    ESearchSearchUserAction,
    KalturaClient,
    KalturaESearchItemType,
    KalturaESearchOperatorType, KalturaESearchUserFieldName,
    KalturaESearchUserItem,
    KalturaESearchUserOperator,
    KalturaESearchUserParams,
    KalturaESearchUserResult
} from 'kaltura-ngx-client';
import {KalturaFilterPager} from 'kaltura-ngx-client';
import {SuggestionsProviderData} from '@kaltura-ng/kaltura-primeng-ui';
import { AppLocalization } from '@kaltura-ng/mc-shared';
import {BrowserService} from 'app-shared/kmc-shell';
import {AreaBlockerMessage} from '@kaltura-ng/kaltura-ui';
import {PopupWidgetComponent, PopupWidgetStates} from '@kaltura-ng/kaltura-ui';
import {KalturaUser} from 'kaltura-ngx-client';
import { cancelOnDestroy, tag } from '@kaltura-ng/kaltura-common';

@Component({
  selector: 'kBulkAddPublishers',
  templateUrl: './bulk-add-publishers.component.html',
  styleUrls: ['./bulk-add-publishers.component.scss']
})
export class BulkAddPublishersComponent implements OnInit, OnDestroy, AfterViewInit {

  @Input() parentPopupWidget: PopupWidgetComponent;
  @Output() addPublishersChanged = new EventEmitter<KalturaUser[]>();

  public _loading = false;
  public _sectionBlockerMessage: AreaBlockerMessage;

  public _usersProvider = new Subject<SuggestionsProviderData>();
  public users: KalturaUser[] = [];

  private _searchPublishersSubscription: ISubscription;
  private _parentPopupStateChangeSubscribe: ISubscription;
  private _confirmClose: boolean = true;

  constructor(private _kalturaServerClient: KalturaClient,
              private _appLocalization: AppLocalization,
              private _browserService: BrowserService) {
    this._convertUserInputToValidValue = this._convertUserInputToValidValue.bind(this); // fix scope issues when binding to a property
  }

  ngOnInit() {
    this.users = [];
  }

  ngAfterViewInit() {
    if (this.parentPopupWidget) {
      this._parentPopupStateChangeSubscribe = this.parentPopupWidget.state$
        .subscribe(event => {
          if (event.state === PopupWidgetStates.Open) {
            this._confirmClose = true;
          }
          if (event.state === PopupWidgetStates.BeforeClose) {
            if (event.context && event.context.allowClose) {
              if (this.users.length && this._confirmClose) {
                event.context.allowClose = false;
                this._browserService.confirm(
                  {
                    header: this._appLocalization.get('applications.content.entryDetails.captions.cancelEdit'),
                    message: this._appLocalization.get('applications.content.entryDetails.captions.discard'),
                    accept: () => {
                      this._confirmClose = false;
                      this.parentPopupWidget.close();
                    }
                  }
                );
              }
            }
          }
        });
    }
  }

  ngOnDestroy() {
    this._parentPopupStateChangeSubscribe.unsubscribe();
  }

  _searchUsers(event): void {
    this._usersProvider.next({suggestions: [], isLoading: true});

    if (this._searchPublishersSubscription) {
      // abort previous request
      this._searchPublishersSubscription.unsubscribe();
      this._searchPublishersSubscription = null;
    }

    this._kalturaServerClient.request(new ESearchSearchUserAction({
        searchParams: new KalturaESearchUserParams({
            searchOperator: new KalturaESearchUserOperator({
                operator: KalturaESearchOperatorType.orOp,
                searchItems: [
                    new KalturaESearchUserItem({
                        itemType: KalturaESearchItemType.startsWith,
                        fieldName: KalturaESearchUserFieldName.screenName,
                        searchTerm: event.query
                    }),
                    new KalturaESearchUserItem({
                        itemType: KalturaESearchItemType.startsWith,
                        fieldName: KalturaESearchUserFieldName.firstName,
                        searchTerm: event.query.split(" ")[0]
                    }),
                    new KalturaESearchUserItem({
                        itemType: KalturaESearchItemType.partial,
                        fieldName: KalturaESearchUserFieldName.lastName,
                        searchTerm: event.query
                    }),
                    new KalturaESearchUserItem({
                        itemType: KalturaESearchItemType.startsWith,
                        fieldName: KalturaESearchUserFieldName.userId,
                        searchTerm: event.query
                    })
                ]
            })
        }),
        pager: new KalturaFilterPager({
            pageIndex : 0,
            pageSize : 30
        })
    }))
      .pipe(cancelOnDestroy(this))
      .subscribe(
        result => {
          const suggestions = [];
          let users = [];
          if (result?.objects) {
            result.objects.forEach((res: KalturaESearchUserResult) => users.push(res.object))
          }
          users.forEach(suggestedUser => {
              suggestedUser['__tooltip'] = suggestedUser.id;
            const isSelectable = !(this.users || []).find(user => user.id === suggestedUser.id);
            suggestions.push({
              name: `${suggestedUser.screenName} (${suggestedUser.id})`,
              item: suggestedUser,
              isSelectable: isSelectable
            });
          });
          this._usersProvider.next({suggestions: suggestions, isLoading: false});
        },
        err => {
          this._usersProvider.next({suggestions: [], isLoading: false, errorMessage: (err.message || err)});
        }
      );

  }

  public _convertUserInputToValidValue(value: string): any {
    let result = null;
    const tooltip = this._appLocalization.get('applications.content.bulkActions.userTooltip', {0: value});
    if (value) {
      result = {
          id: value,
          screenName: value,
          __tooltip: tooltip,
          __class: 'userAdded'
        };

    }
    return result;
  }


  public _apply() {
    this.addPublishersChanged.emit(this.users);
    this._confirmClose = false;
    this.parentPopupWidget.close();
  }
}

