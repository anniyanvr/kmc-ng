/**
 * A list of permission tokens as provided by the server and supported in the KMC.
 *
 * DEVELOPER NOTICE:
 * - All the tokens must be UPPER_CASED and use underline (_) instead of dot ('.')
 * - if the original name doesn't match the naming standards, add the mapping manually in file 'kmc-permissions-rules' property 'customPermissionKeyToNameMapping'
 *
 */
export enum KMCPermissions {
    'ACCESS_CONTROL_ADD' = 1000,
    'ACCESS_CONTROL_DELETE' = 1001,
    'ACCESS_CONTROL_UPDATE' = 1002,
    'ACCOUNT_UPDATE_SETTINGS' = 1003,
    'ADMIN_ROLE_ADD' = 1004,
    'ADMIN_ROLE_DELETE' = 1005,
    'ADMIN_ROLE_UPDATE' = 1006,
    'ADMIN_USER_ADD' = 1007,
    'ADMIN_USER_BULK' = 1008,
    'ADMIN_USER_DELETE' = 1009,
    'ADMIN_USER_UPDATE' = 1010,
    'ATTACHMENT_MODIFY' = 1011,
    'BULK_LOG_DELETE' = 1012,
    'BULK_LOG_DOWNLOAD' = 1013,
    'CAPTION_MODIFY' = 1014,
    'CONTENT_INGEST_BULK_UPLOAD' = 1015,
    'CONTENT_INGEST_CLIP_MEDIA' = 1016,
    'CONTENT_INGEST_EXTERNAL_SEARCH' = 1017,
    'CONTENT_INGEST_INTO_ORPHAN' = 1018,
    'CONTENT_INGEST_INTO_READY' = 1019,
    'CONTENT_INGEST_ORPHAN_AUDIO' = 1020,
    'CONTENT_INGEST_ORPHAN_VIDEO' = 1021,
    'CONTENT_INGEST_REFERENCE_MODIFY' = 1022,
    'CONTENT_INGEST_REMOTE_STORAGE' = 1023,
    'CONTENT_INGEST_REPLACE' = 1024,
    'CONTENT_INGEST_UPLOAD' = 1025,
    'CONTENT_INGEST_WEBCAM' = 1026,
    'CONTENT_MANAGE_ACCESS_CONTROL' = 1027,
    'CONTENT_MANAGE_ASSIGN_CATEGORIES' = 1028,
    'CONTENT_MANAGE_CATEGORY_USERS' = 1029,
    'CONTENT_MANAGE_CUSTOM_DATA' = 1030,
    'CONTENT_MANAGE_DELETE' = 1031,
    'CONTENT_MANAGE_DISTRIBUTION_REMOVE' = 1032,
    'CONTENT_MANAGE_DISTRIBUTION_SEND' = 1033,
    'CONTENT_MANAGE_DISTRIBUTION_WHERE' = 1034,
    'CONTENT_MANAGE_DOWNLOAD' = 1035,
    'CONTENT_MANAGE_EDIT_CATEGORIES' = 1036,
    'CONTENT_MANAGE_EMBED_CODE' = 1037,
    'CONTENT_MANAGE_ENTRY_USERS' = 1038,
    'CONTENT_MANAGE_METADATA' = 1039,
    'CONTENT_MANAGE_RECONVERT' = 1040,
    'CONTENT_MANAGE_SCHEDULE' = 1041,
    'CONTENT_MANAGE_THUMBNAIL' = 1042,
    'CONTENT_MODERATE_APPROVE_REJECT' = 1043,
    'CONTENT_MODERATE_CUSTOM_DATA' = 1044,
    'CONTENT_MODERATE_METADATA' = 1045,
    'CUEPOINT_MANAGE' = 1046,
    'CUSTOM_DATA_PROFILE_ADD' = 1047,
    'CUSTOM_DATA_PROFILE_DELETE' = 1048,
    'CUSTOM_DATA_PROFILE_UPDATE' = 1049,
    'DROPFOLDER_CONTENT_INGEST_DROP_FOLDER_DELETE' = 1050,
    'DROPFOLDER_CONTENT_INGEST_DROP_FOLDER_MATCH' = 1051,
    'INTEGRATION_UPDATE_SETTINGS' = 1052,
    'LIVE_STREAM_ADD' = 1053,
    'LIVE_STREAM_UPDATE' = 1054,
    'PLAYLIST_ADD' = 1055,
    'PLAYLIST_DELETE' = 1056,
    'PLAYLIST_EMBED_CODE' = 1057,
    'PLAYLIST_UPDATE' = 1058,
    'STUDIO_ADD_UICONF' = 1059,
    'STUDIO_DELETE_UICONF' = 1060,
    'STUDIO_SELECT_CONTENT' = 1061,
    'STUDIO_UPDATE_UICONF' = 1062,
    'SYNDICATION_ADD' = 1063,
    'SYNDICATION_DELETE' = 1064,
    'SYNDICATION_UPDATE' = 1065,
    'TRANSCODING_ADD' = 1066,
    'TRANSCODING_DELETE' = 1067,
    'TRANSCODING_UPDATE' = 1068,
    'ACCESS_CONTROL_BASE' = 1069,
    'ACCOUNT_BASE' = 1070,
    'ADMIN_BASE' = 1071,
    'CONTENT_MANAGE_BASE' = 1072,
    'BULK_LOG_BASE' = 1073,
    'CONTENT_INGEST_BASE' = 1074,
    'CONTENT_MANAGE_DISTRIBUTION_BASE' = 1075,
    'CONTENT_MODERATE_BASE' = 1076,
    'CUSTOM_DATA_PROFILE_BASE' = 1077,
    'DROPFOLDER_CONTENT_INGEST_DROP_FOLDER_BASE' = 1078,
    'INTEGRATION_BASE' = 1079,
    'PLAYLIST_BASE' = 1080,
    'STUDIO_BASE' = 1081,
    'SYNDICATION_BASE' = 1082,
    'TRANSCODING_BASE' = 1083,
    'ADVERTISING_UPDATE_SETTINGS' = 1084,
    'ANALYTICS_BASE' = 1085,
    'CONTENTDISTRIBUTION_PLUGIN_PERMISSION' = 1086,
    'DYNAMIC_FLAG_KMC_CHUNKED_CATEGORY_LOAD' = 1087,
    'FEATURE_ALLOW_VAST_CUE_POINT_NO_URL' = 1088,
    'FEATURE_ANALYTICS_TAB' = 1089,
    'FEATURE_DISABLE_CATEGORY_LIMIT' = 1090,
    'FEATURE_DISABLE_KMC_DRILL_DOWN_THUMB_RESIZE' = 1091,
    'FEATURE_DISABLE_KMC_KDP_ALERTS' = 1092,
    'FEATURE_DISABLE_KMC_LIST_THUMBNAILS' = 1093,
    'FEATURE_DRAFT_ENTRY_CONV_PROF_SELECTION' = 1094,
    'FEATURE_END_USER_MANAGE' = 1095,
    'FEATURE_END_USER_REPORTS' = 1096,
    'FEATURE_ENTITLEMENT' = 1097,
    'FEATURE_ENTRY_REPLACEMENT' = 1098,
    'FEATURE_HIDE_ASPERA_LINK' = 1099,
    'FEATURE_KALTURA_LIVE_STREAM' = 1100,
    'FEATURE_KMC_AKAMAI_UNIVERSAL_LIVE_STREAM_PROVISION' = 1101,
    'FEATURE_KMC_DRILLDOWN_TAGS_COLUMN' = 1102,
    'FEATURE_KMC_VERIFY_MODERATION' = 1103,
    'FEATURE_LIVE_STREAM' = 1104,
    'FEATURE_LIVE_STREAM_RECORD' = 1105,
    'FEATURE_MULTI_FLAVOR_INGESTION' = 1106,
    'FEATURE_PUSH_PUBLISH' = 1107,
    'FEATURE_REMOTE_STORAGE_INGEST' = 1108,
    'FEATURE_SHOW_ASPERA_UPLOAD_BUTTON' = 1109,
    'FEATURE_SHOW_FLASH_STUDIO' = 1110,
    'FEATURE_SHOW_HTML_STUDIO' = 1111,
    'FEATURE_V3_STUDIO_PERMISSION' = 1112,
    'FEATURE_VAST' = 1113,
    'METADATA_PLUGIN_PERMISSION' = 1114,
    'WIDEVINE_PLUGIN_PERMISSION' = 1115,
    'CONTENT_INGEST_DROP_FOLDER_MATCH' = 1116,
    'FEATURE_ENTRY_REPLACEMENT_APPROVAL' = 1117,
    'FEATURE_CLIP_MEDIA' = 1118,
    'ADCUEPOINT_PLUGIN_PERMISSION' = 1119,
    'CAPTION_PLUGIN_PERMISSION' = 1120,
    'ATTACHMENT_PLUGIN_PERMISSION' = 1121,
    'DROPFOLDER_PLUGIN_PERMISSION' = 1122,
    'FEATURE_ENABLE_USAGE_DASHBOARD' = 1123,
    'REACH_PLUGIN_PERMISSION' = 1124,
    'FEATURE_NEW_ANALYTICS_TAB' = 1125,
    'FEATURE_NEW_ANALYTICS_TAB_DISABLE' = 1126,
    'FEATURE_VAR_CONSOLE_LOGIN' = 1127,
    'FEATURE_LIVE_ANALYTICS_DASHBOARD' = 1128,
    'FEATURE_SIP' = 1129,
    'FEATURE_MULTI_ACCOUNT_ANALYTICS' = 1130,
    'ADMIN_PUBLISHER_MANAGE' = 1131,
    'FEATURE_LIVE_STREAM_KALTURA_RECORDING' = 1132,
    'FEATURE_LOAD_THUMBNAIL_WITH_KS' = 1133
}
