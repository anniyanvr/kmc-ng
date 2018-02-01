import { Injectable, OnDestroy } from '@angular/core';
import { KalturaBaseEntry } from 'kaltura-ngx-client/api/types/KalturaBaseEntry';
import { Observable } from 'rxjs/Observable';
import { KalturaDetachedResponseProfile } from 'kaltura-ngx-client/api/types/KalturaDetachedResponseProfile';
import { KalturaMetadataSearchItem } from 'kaltura-ngx-client/api/types/KalturaMetadataSearchItem';
import { KalturaNullableBoolean } from 'kaltura-ngx-client/api/types/KalturaNullableBoolean';
import { KalturaSearchOperatorType } from 'kaltura-ngx-client/api/types/KalturaSearchOperatorType';
import { KalturaSearchOperator } from 'kaltura-ngx-client/api/types/KalturaSearchOperator';
import { KalturaSearchCondition } from 'kaltura-ngx-client/api/types/KalturaSearchCondition';
import { KalturaContentDistributionSearchItem } from 'kaltura-ngx-client/api/types/KalturaContentDistributionSearchItem';
import { KalturaFilterPager } from 'kaltura-ngx-client/api/types/KalturaFilterPager';
import { KalturaResponseProfileType } from 'kaltura-ngx-client/api/types/KalturaResponseProfileType';
import { KalturaMediaEntryFilter } from 'kaltura-ngx-client/api/types/KalturaMediaEntryFilter';
import { KalturaUtils } from '@kaltura-ng/kaltura-common/utils/kaltura-utils';
import { KalturaClient } from 'kaltura-ngx-client';
import {
  EntriesDataProvider, EntriesFilters, MetadataProfileData,
  SortDirection
} from 'app-shared/content-shared/entries/entries-store/entries-store.service';
import { PlaylistExecuteFromFiltersAction } from 'kaltura-ngx-client/api/types/PlaylistExecuteFromFiltersAction';
import { KalturaMediaEntryFilterForPlaylist } from 'kaltura-ngx-client/api/types/KalturaMediaEntryFilterForPlaylist';
import { CategoriesModes } from 'app-shared/content-shared/categories/categories-mode-type';
import { environment } from 'app-environment';
import { MetadataProfileCreateModes, MetadataProfileStore, MetadataProfileTypes } from 'app-shared/kmc-shared';

@Injectable()
export class PlaylistEntriesDataProvider implements EntriesDataProvider, OnDestroy {
  constructor(private _kalturaServerClient: KalturaClient,
              private _metadataProfileService: MetadataProfileStore) {
  }

  ngOnDestroy() {

  }

  private _updateFilterWithJoinedList(list: any[],
                                      requestFilter: KalturaMediaEntryFilter,
                                      requestFilterProperty: keyof KalturaMediaEntryFilter): void {
    const value = (list || []).map(item => item).join(',');

    if (value) {
      requestFilter[requestFilterProperty] = value;
    }
  }

  private _getMetadataProfiles(): Observable<MetadataProfileData[]> {
    return this._metadataProfileService.get({
      type: MetadataProfileTypes.Entry,
      ignoredCreateMode: MetadataProfileCreateModes.App
    })
      .cancelOnDestroy(this)
      .first()
      .map(metadataProfiles => {
        return metadataProfiles.items.map(metadataProfile => ({
          id: metadataProfile.id,
          name: metadataProfile.name,
          lists: (metadataProfile.items || []).map(item => ({ id: item.id, name: item.name }))
        }));
      }).catch(() => null);
  }

  public getServerFilter(data: EntriesFilters, mediaTypesDefault = true): Observable<KalturaMediaEntryFilterForPlaylist> {
    try {
      return this._getMetadataProfiles()
        .map(metadataProfiles => {
          // create request items
          const filter = new KalturaMediaEntryFilterForPlaylist({});

          const advancedSearch = filter.advancedSearch = new KalturaSearchOperator({});
          advancedSearch.type = KalturaSearchOperatorType.searchAnd;

          // filter 'freeText'
          if (data.freetext) {
            filter.freeText = data.freetext;
          }

          // filter 'createdAt'
          if (data.createdAt) {
            if (data.createdAt.fromDate) {
              filter.createdAtGreaterThanOrEqual = KalturaUtils.getStartDateValue(data.createdAt.fromDate);
            }

            if (data.createdAt.toDate) {
              filter.createdAtLessThanOrEqual = KalturaUtils.getEndDateValue(data.createdAt.toDate);
            }
          }

          // filters of joined list
          this._updateFilterWithJoinedList(data.mediaTypes, filter, 'mediaTypeIn');
          this._updateFilterWithJoinedList(data.durations, filter, 'durationTypeMatchOr');
          this._updateFilterWithJoinedList(data.replacementStatuses, filter, 'replacementStatusIn');
          this._updateFilterWithJoinedList(data.flavors, filter, 'flavorParamsIdsMatchOr');

          // filter 'distribution'
          if (data.distributions && data.distributions.length > 0) {
            const distributionItem = new KalturaSearchOperator({
              type: KalturaSearchOperatorType.searchOr
            });

            advancedSearch.items.push(distributionItem);

            data.distributions.forEach(item => {
              // very complex way to make sure the value is number (an also bypass both typescript and tslink checks)
              if (isFinite(+item) && parseInt(item) == <any>item) { // tslint:disable-line
                const newItem = new KalturaContentDistributionSearchItem(
                  {
                    distributionProfileId: +item,
                    hasEntryDistributionValidationErrors: false,
                    noDistributionProfiles: false
                  }
                );

                distributionItem.items.push(newItem)
              } else {
                // this._logger.warn(`cannot convert distribution value '${item}' into number. ignoring value`);
              }
            });
          }

          // filter 'originalClippedEntries'
          if (data.originalClippedEntries && data.originalClippedEntries.length > 0) {
            let originalClippedEntriesValue: KalturaNullableBoolean = null;

            data.originalClippedEntries.forEach(item => {
              switch (item) {
                case '0':
                  if (originalClippedEntriesValue == null) {
                    originalClippedEntriesValue = KalturaNullableBoolean.falseValue;
                  } else if (originalClippedEntriesValue === KalturaNullableBoolean.trueValue) {
                    originalClippedEntriesValue = KalturaNullableBoolean.nullValue;
                  }
                  break;
                case '1':
                  if (originalClippedEntriesValue == null) {
                    originalClippedEntriesValue = KalturaNullableBoolean.trueValue;
                  } else if (originalClippedEntriesValue === KalturaNullableBoolean.falseValue) {
                    originalClippedEntriesValue = KalturaNullableBoolean.nullValue;
                  }
                  break;
              }
            });

            if (originalClippedEntriesValue !== null) {
              filter.isRoot = originalClippedEntriesValue;
            }
          }

          // filters of custom metadata lists
          if (metadataProfiles && metadataProfiles.length > 0) {

            metadataProfiles.forEach(metadataProfile => {
              // create advanced item for all metadata profiles regardless if the user filtered by them or not.
              // this is needed so freetext will include all metadata profiles while searching.
              const metadataItem: KalturaMetadataSearchItem = new KalturaMetadataSearchItem({
                metadataProfileId: metadataProfile.id,
                type: KalturaSearchOperatorType.searchAnd,
                items: []
              });
              advancedSearch.items.push(metadataItem);

              metadataProfile.lists.forEach(list => {
                const metadataProfileFilters = data.customMetadata[list.id];
                if (metadataProfileFilters && metadataProfileFilters.length > 0) {
                  const innerMetadataItem: KalturaMetadataSearchItem = new KalturaMetadataSearchItem({
                    metadataProfileId: metadataProfile.id,
                    type: KalturaSearchOperatorType.searchOr,
                    items: []
                  });
                  metadataItem.items.push(innerMetadataItem);

                  metadataProfileFilters.forEach(filterItem => {
                    const searchItem = new KalturaSearchCondition({
                      field: `/*[local-name()='metadata']/*[local-name()='${list.name}']`,
                      value: filterItem
                    });

                    innerMetadataItem.items.push(searchItem);
                  });
                }
              });
            });
          }

          if (data.categories && data.categories.length) {
            const categoriesValue = data.categories.map(item => item).join(',');
            if (data.categoriesMode === CategoriesModes.SelfAndChildren) {
              filter.categoryAncestorIdIn = categoriesValue;
            } else {
              filter.categoriesIdsMatchOr = categoriesValue;
            }
          }

          // remove advanced search arg if it is empty
          if (advancedSearch.items && advancedSearch.items.length === 0) {
            delete filter.advancedSearch;
          }

          // handle default value for media types
          if (!filter.mediaTypeIn && mediaTypesDefault) {
            filter.mediaTypeIn = '1,2,5,6,201';
          }

          // update the sort by args
          if (data.sortBy) {
            filter.orderBy = `${data.sortDirection === SortDirection.Desc ? '-' : '+'}${data.sortBy}`;
          }

          filter.limit = data.limits && data.limits > 0 && data.limits <= environment.modules.contentPlaylists.ruleBasedTotalResults
            ? data.limits
            : environment.modules.contentPlaylists.ruleBasedTotalResults;

          // readonly filters for rule-based playlist
          filter.statusIn = '1,2';
          filter.typeIn = '1,7';
          filter.moderationStatusIn = '1,2,5,6';

          return filter;
        });
    } catch (err) {
      return Observable.throw(err);
    }
  }

  public executeQuery(data: EntriesFilters): Observable<{ entries: KalturaBaseEntry[], totalCount?: number }> {
    let pagination: KalturaFilterPager = null;
    // update desired fields of entries
    const responseProfile = new KalturaDetachedResponseProfile({
      type: KalturaResponseProfileType.includeFields,
      fields: 'id,name,thumbnailUrl,mediaType,plays,createdAt,duration,status,startDate,endDate,moderationStatus,tags,categoriesIds,downloadUrl,sourceType'
    });

    // update pagination args
    if (data.pageIndex || data.pageSize) {
      pagination = new KalturaFilterPager(
        {
          pageSize: data.pageSize,
          pageIndex: data.pageIndex + 1
        }
      );
    }

    // build the request
    return <any>
      this.getServerFilter(data)
        .switchMap(filter => this._kalturaServerClient.request(
          new PlaylistExecuteFromFiltersAction({
            filters: [filter],
            totalResults: environment.modules.contentPlaylists.ruleBasedTotalResults,
            pager: pagination,
            responseProfile
          }))
        ).map(response => ({ entries: response, totalCount: response.length })
      );
  }

  public getDefaultFilterValues(savedAutoSelectChildren: CategoriesModes): EntriesFilters {
    const categoriesMode = typeof savedAutoSelectChildren === 'number'
      ? savedAutoSelectChildren
      : CategoriesModes.SelfAndChildren;

    return {
      freetext: '',
      pageSize: 50,
      pageIndex: 0,
      sortBy: 'plays',
      sortDirection: SortDirection.Desc,
      createdAt: { fromDate: null, toDate: null },
      scheduledAt: { fromDate: null, toDate: null },
      mediaTypes: [],
      timeScheduling: [],
      ingestionStatuses: [],
      durations: [],
      originalClippedEntries: [],
      moderationStatuses: [],
      replacementStatuses: [],
      accessControlProfiles: [],
      flavors: [],
      distributions: [], categories: [],
      categoriesMode,
      customMetadata: {},
      limits: environment.modules.contentPlaylists.ruleBasedTotalResults,
    };
  }
}