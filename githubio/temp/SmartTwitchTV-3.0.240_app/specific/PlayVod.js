/*
 * Copyright (c) 2017-2020 Felipe de Leon <fglfgl27@gmail.com>
 *
 * This file is part of SmartTwitchTV <https://github.com/fgl27/SmartTwitchTV>
 *
 * SmartTwitchTV is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SmartTwitchTV is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with SmartTwitchTV.  If not, see <https://github.com/fgl27/SmartTwitchTV/blob/master/LICENSE>.
 *
 */

//Variable initialization
var PlayVod_quality = 'Auto';
var PlayVod_qualityPlaying = PlayVod_quality;

var PlayVod_state = 0;

var PlayVod_qualities = [];
var PlayVod_qualityIndex = 0;
var PlayVod_playlist = null;

var PlayVod_isOn = false;
var PlayVod_Buffer = 2000;

var PlayVod_loadingInfoDataTry = 0;

var Play_jumping = false;
var PlayVod_SizeClearID;
var PlayVod_addToJump = 0;
var PlayVod_IsJumping = false;
var PlayVod_jumpCount = 0;
var PlayVod_jump_max_step = 10;
var PlayVod_currentTime = 0;
var PlayVod_VodPositions = 0;
var PlayVod_PanelY = 0;
var PlayVod_ProgressBaroffset = 0;
var PlayVod_OldTime = 0;
var PlayVod_TimeToJump = 0;
var PlayVod_replay = false;

var PlayVod_RefreshProgressBarrID;
var PlayVod_SaveOffsetId;
var PlayVod_VodOffset;
var PlayVod_ChaptersArray = [];
var PlayVod_postChapters = '{"query":"{ video(id:\\"%x\\"){moments(momentRequestType:VIDEO_CHAPTER_MARKERS types:[GAME_CHANGE]) {edges{...VideoPlayerVideoMomentEdge}}}}fragment VideoPlayerVideoMomentEdge on VideoMomentEdge{node {...VideoPlayerVideoMoment}}fragment VideoPlayerVideoMoment on VideoMoment{durationMilliseconds positionMilliseconds type description details{...VideoPlayerGameChangeDetails}}fragment VideoPlayerGameChangeDetails on GameChangeMomentDetails{game{id displayName}}"}';
//Variable initialization end

function PlayVod_Start() {
    //Main_Log('PlayVod_Start');

    Play_HideEndDialog();
    //Play_SupportsSource = true;
    PlayVod_currentTime = 0;
    PlayVod_previewsId = 0;
    PlayVod_updateChaptersId = 0;
    PlayVod_ChaptersArray = [];
    PlayVod_ProgresBarrUpdate(0, 0);
    Main_textContent("stream_live_time", '');
    Main_textContent('progress_bar_current_time', Play_timeS(0));
    Chat_title = " VOD";
    Play_LoadLogo(Main_getElementById('stream_info_icon'), IMG_404_BANNER);
    Main_innerHTMLWithEle(Play_BottonIcons_Pause, '<div ><i class="pause_button3d icon-pause"></i> </div>');
    Main_HideElement('progress_pause_holder');
    Main_ShowElementWithEle(Play_BottonIcons_Progress);
    Play_BufferSize = 0;

    Play_BottomHide(Play_MultiStream);
    Play_BottomHide(Play_controlsOpenVod);
    Play_BottomHide(Play_controlsChatDelay);
    Play_BottomHide(Play_controlsLowLatency);
    Play_BottomHide(Play_controlsChatSend);
    Play_BottomHide(Play_controlsChapters);


    PlayExtra_UnSetPanel();
    Play_CurrentSpeed = 3;
    Play_IconsResetFocus();
    UserLiveFeed_Unset();
    Play_ShowPanelStatus(2);

    PlayVod_OldTime = 0;
    Play_DefaultjumpTimers = Settings_jumpTimers;
    PlayVod_jump_max_step = Settings_value.vod_seek_max.defaultValue;
    PlayVod_jumpSteps(Settings_value.vod_seek_min.defaultValue);
    PlayVod_state = Play_STATE_LOADING_TOKEN;
    PlayClip_HasVOD = true;
    UserLiveFeed_PreventHide = false;
    ChannelVod_vodOffset = 0;
    Main_values.Play_isHost = false;
    PlayClip_HideShowNext(0, 0);
    PlayClip_HideShowNext(1, 0);

    if (!Main_vodOffset) {//we have some vod info
        Play_LoadLogo(Main_getElementById('stream_info_icon'), Main_values.Main_selectedChannelLogo);
        Main_innerHTML(
            "stream_info_name",
            Play_partnerIcon(
                Main_values.Main_selectedChannelDisplayname,
                Main_values.Main_selectedChannelPartner,
                1,
                ' [' + (ChannelVod_language).toUpperCase() + ']'
            )
        );
        Main_innerHTML("stream_info_title", ChannelVod_title);
        Main_textContent("stream_info_game", ChannelVod_game);
        Main_innerHTML("stream_live_time", ChannelVod_createdAt + ',' + STR_SPACE + ChannelVod_views);
        Main_textContent("stream_live_viewers", '');
        Main_textContent("stream_watching_time", '');

        Main_replaceClassEmoji('stream_info_title');
    }

    if (!Play_PreviewId) {
        PlayVod_SetStart();
        Play_showBufferDialog();
        var isFromVod = true;
        var ShowDialog = Settings_Obj_default('vod_dialog');
        PlayVod_VodOffset = 0;

        if (!PlayVod_replay && !Main_vodOffset && ShowDialog < 2) {

            var VodIdex = AddUser_UserIsSet() ? Main_history_Exist('vod', Main_values.ChannelVod_vodId) : -1;

            //Check if the vod exist in the history
            if (VodIdex > -1) {

                PlayVod_VodOffset = Main_values_History_data[AddUser_UsernameArray[0].id].vod[VodIdex].watched;

            }

            //Check if the vod saved position is bigger then 0 means thisvod was already watched
            if (!PlayVod_VodOffset) {

                VodIdex = AddUser_UserIsSet() ? Main_history_Find_Vod_In_Live(Main_values.ChannelVod_vodId) : -1;

                if (VodIdex > -1) {
                    isFromVod = false;

                    PlayVod_VodOffset =
                        ((Main_values_History_data[AddUser_UsernameArray[0].id].live[VodIdex].date - (new Date(Main_values_Play_data[12]).getTime())) / 1000);
                }

            }

            if (!ShowDialog && PlayVod_VodOffset) {
                Main_vodOffset = PlayVod_VodOffset;
                Play_showWarningDialog(
                    STR_SHOW_VOD_PLAYER_WARNING + STR_BR + Play_timeMs(Main_vodOffset * 1000),
                    2000
                );
            }
        }

        if (PlayVod_VodOffset && !Main_vodOffset) {
            Play_HideBufferDialog();
            Play_showVodDialog(isFromVod);
        } else {
            PlayVod_PosStart();

            if (!Main_vodOffset) {
                Chat_offset = 0;
                Chat_Init();
            }
        }

    } else {
        PlayVod_PosStart();
    }
}

function PlayVod_SetStart() {
    Play_EndSet(2);
    PlayVod_muted_segments_value = null;
    PlayVod_previews_clear();
    PlayVod_PrepareLoad();
    PlayVod_updateVodInfo();
    PlayVod_updateChapters();
}

function PlayVod_PosStart() {
    //Main_Log('PlayVod_PosStart');

    Main_setTimeout(
        function() {
            Main_ShowElementWithEle(Play_Controls_Holder);
            Main_ShowElement('progress_pause_holder');
        },
        1000
    );
    Main_textContent('progress_bar_duration', Play_timeS(Play_DurationSeconds));

    PlayVod_SaveOffsetId = Main_setInterval(PlayVod_SaveOffset, 60000, PlayVod_SaveOffsetId);

    Play_IsWarning = false;
    PlayVod_jumpCount = Settings_value.vod_seek_min.defaultValue;
    PlayVod_IsJumping = false;
    Play_jumping = false;
    PlayVod_isOn = true;

    if (!Play_PreviewId) {
        if (!PlayVod_replay) PlayVod_loadData();
        else {
            PlayVod_state = Play_STATE_PLAYING;
            PlayVod_onPlayer();
        }
    } else {
        PlayVod_autoUrl = Play_PreviewURL;
        PlayVod_playlist = Play_PreviewResponseText;

        PlayVod_state = Play_STATE_PLAYING;

        if (Play_PreviewOffset) Main_vodOffset = Play_PreviewOffset;
        PlayVod_onPlayer();

        if (!Play_PreviewOffset) {

            Chat_offset = parseInt(OSInterface_gettime() / 1000);
            Chat_Init();
            Play_getQualities(2, false);

        }

        PlayVod_SetStart();
        Play_CheckIfIsLiveCleanEnd();

        PlayVod_SaveOffset();
    }

    Play_controls[Play_controlsChanelCont].setLable(Main_values.Main_selectedChannelDisplayname);
    Play_controls[Play_controlsGameCont].setLable(Play_data.data[3]);

    Main_values.Play_WasPlaying = 2;
    Main_SaveValues();
}

function PlayVod_PrepareLoad() {
    PlayVod_loadingInfoDataTry = 0;
}

function PlayVod_updateVodInfo() {
    var theUrl = Main_kraken_api + 'videos/' + Main_values.ChannelVod_vodId + Main_TwithcV5Flag_I;
    BasexmlHttpGet(theUrl, (DefaultHttpGetTimeout * 2) + (PlayVod_loadingInfoDataTry * DefaultHttpGetTimeoutPlus), 2, null, PlayVod_updateVodInfoPannel, PlayVod_updateVodInfoError);
}

function PlayVod_updateVodInfoError() {
    PlayVod_loadingInfoDataTry++;
    if (PlayVod_loadingInfoDataTry < DefaultHttpGetReTryMax) {
        PlayVod_updateVodInfo();
    }
}

function PlayVod_CheckFollow() {
    if (AddUser_UserIsSet()) {
        AddCode_Channel_id = Main_values.Main_selectedChannel_id;
        AddCode_PlayRequest = true;
        AddCode_CheckFollow();
    } else Play_hideFollow();
}

function PlayVod_updateVodInfoPannel(response) {
    response = JSON.parse(response);

    //Update the value only if the Play_UpdateDuration() has not yet
    if (!Play_DurationSeconds) Play_DurationSeconds = parseInt(response.length);

    ChannelVod_title = twemoji.parse(response.title, false, true);

    Main_values.Main_selectedChannelPartner = response.channel.partner;
    Main_innerHTML(
        "stream_info_name",
        Play_partnerIcon(
            Main_values.Main_selectedChannelDisplayname,
            Main_values.Main_selectedChannelPartner,
            1,
            '[' + (response.channel.broadcaster_language).toUpperCase() + ']'
        )
    );

    Main_innerHTML("stream_info_title", ChannelVod_title);
    Main_innerHTML(
        "stream_info_game",
        (response.game && response.game !== "" ? STR_STARTED + STR_PLAYING + response.game : "")
    );

    Main_innerHTML("stream_live_time", STR_STREAM_ON + Main_videoCreatedAt(response.created_at) + ',' + STR_SPACE + Main_addCommas(response.views) + STR_VIEWS);
    Main_textContent("stream_live_viewers", '');
    Main_textContent("stream_watching_time", '');

    Main_textContent('progress_bar_duration', Play_timeS(Play_DurationSeconds));

    PlayVod_currentTime = Main_vodOffset * 1000;
    PlayVod_ProgresBarrUpdate(Main_vodOffset, Play_DurationSeconds, true);

    Main_values.Main_selectedChannelDisplayname = response.channel.display_name;

    Main_values.Main_selectedChannelLogo = response.channel.logo;
    Play_LoadLogo(Main_getElementById('stream_info_icon'), Main_values.Main_selectedChannelLogo);

    Main_values.Main_selectedChannel_id = response.channel._id;
    Main_values.Main_selectedChannel = response.channel.name;

    PlayVod_CheckFollow();

    PlayVod_previews_pre_start(response.seek_previews_url);
    PlayVod_muted_segments_value = response.muted_segments;
    PlayVod_muted_segments(PlayVod_muted_segments_value);

    Main_values_Play_data = ScreensObj_VodCellArray(response);
    Main_Set_history('vod', Main_values_Play_data);
}

function PlayVod_Resume() {
    UserLiveFeed_Hide();
    Play_showBufferDialog();
    Play_ResumeAfterOnlineCounter = 0;

    //Get the time from android as it can save it more reliably
    Main_vodOffset = OSInterface_getsavedtime() / 1000;

    if (navigator.onLine) PlayVod_ResumeAfterOnline();
    else Play_ResumeAfterOnlineId = Main_setInterval(PlayVod_ResumeAfterOnline, 100, Play_ResumeAfterOnlineId);

    Play_EndSet(2);
    PlayVod_SaveOffsetId = Main_setInterval(PlayVod_SaveOffset, 60000, PlayVod_SaveOffsetId, PlayVod_SaveOffsetId);

    Play_ShowPanelStatusId = Main_setInterval(
        function() {
            Play_UpdateStatus(2);
        },
        1000,
        Play_ShowPanelStatusId
    );
}

function PlayVod_ResumeAfterOnline(forced) {
    if (forced || navigator.onLine || Play_ResumeAfterOnlineCounter > 200) {
        Main_clearInterval(Play_ResumeAfterOnlineId);
        PlayVod_state = Play_STATE_LOADING_TOKEN;
        PlayVod_loadData();
    }
    Play_ResumeAfterOnlineCounter++;
}

function PlayVod_SaveOffset() {
    //Prevent setting it to 0 before it was used
    if (!Main_vodOffset) {
        var vodOffset = parseInt(OSInterface_gettime() / 1000);
        if (vodOffset > 0) {
            Main_setItem('Main_vodOffset', vodOffset);
            PlayVod_SaveVodIds(vodOffset);
        }
    }
}

//Browsers crash trying to get the streams link
function PlayVod_loadDataSuccessFake() {
    PlayVod_qualities = [
        {
            'id': 'Auto',
            'band': 0,
            'codec': 'avc',
        },
        {
            'id': '1080p60 | source ',
            'band': '| 10.00Mbps',
            'codec': ' | avc',
        },
        {
            'id': '720p60',
            'band': ' | 5.00Mbps',
            'codec': ' | avc',
        },
        {
            'id': '720p',
            'band': ' | 2.50Mbps',
            'codec': ' | avc',
        },
        {
            'id': '480p',
            'band': ' | 2.50Mbps',
            'codec': ' | avc',
        },
        {
            'id': '320p',
            'band': ' | 2.50Mbps',
            'codec': ' | avc',
        },
    ];
    Play_SetExternalQualities(PlayVod_qualities, 1);
    PlayVod_state = Play_STATE_PLAYING;
    if (PlayVod_isOn) PlayVod_qualityChanged();
}

var PlayVod_autoUrl;
var PlayVod_loadDataId = 0;
function PlayVod_loadData() {
    //Main_Log('PlayVod_loadData');

    if (Main_IsOn_OSInterface) {

        PlayVod_loadDataId = (new Date().getTime());

        OSInterface_getStreamDataAsync(
            Play_vod_token.replace('%x', Main_values.ChannelVod_vodId),
            Play_vod_links.replace('%x', Main_values.ChannelVod_vodId),
            'PlayVod_loadDataResult',
            PlayVod_loadDataId,
            0,
            DefaultHttpGetReTryMax,
            DefaultHttpGetTimeout
        );

    } else PlayVod_loadDataSuccessFake();
}

function PlayVod_loadDataResult(response) {

    if (PlayVod_isOn && response) {

        var responseObj = JSON.parse(response);

        if (responseObj.checkResult > 0 && responseObj.checkResult === PlayVod_loadDataId) {

            if (responseObj.status === 200) {
                PlayVod_autoUrl = responseObj.url;
                PlayVod_loadDataSuccessEnd(responseObj.responseText);
                return;
            } else if (responseObj.status === 1) {
                PlayVod_loadDataCheckSub();
                return;
            } else if (responseObj.status === 410) {
                //410 = api v3 is gone use v5 bug
                PlayVod_WarnEnd(STR_410_ERROR);
                return;
            }

            PlayVod_loadDataErrorFinish();
        }

    }

}

function PlayVod_loadDataErrorFinish() {
    if (Main_IsOn_OSInterface) {
        Play_HideBufferDialog();

        Play_showWarningDialog(STR_410_ERROR + ((ScreenObj[Main_values.Main_Go].screen === Main_HistoryLive) ? STR_PREVIEW_VOD_DELETED : ''), 2000);

        Main_setTimeout(
            function() {
                Play_PlayEndStart(2);
            },
            2000
        );
    } else PlayVod_loadDataSuccessFake();
}

function PlayVod_loadDataSuccessEnd(playlist) {
    PlayVod_playlist = playlist;
    PlayVod_state = Play_STATE_PLAYING;
    if (PlayVod_isOn) PlayVod_onPlayer();
}

function PlayVod_loadDataCheckSub() {
    if (AddUser_UserIsSet() && AddUser_UsernameArray[0].access_token) {
        AddCode_Channel_id = Main_values.Main_selectedChannel_id;
        AddCode_CheckSub();
    } else PlayVod_WarnEnd(STR_IS_SUB_ONLY + STR_IS_SUB_NOOAUTH);
}

function PlayVod_NotSub() {
    PlayVod_WarnEnd(STR_IS_SUB_ONLY + STR_IS_SUB_NOT_SUB);
}

//TODO revise this
function PlayVod_isSub() {
    PlayVod_WarnEnd(STR_IS_SUB_ONLY + STR_IS_SUB_IS_SUB + STR_410_FEATURING);
}

var PlayVod_WarnEndId;
function PlayVod_WarnEnd(text) {
    Play_HideBufferDialog();
    Play_showWarningDialog(text);

    PlayVod_WarnEndId = Main_setTimeout(
        function() {
            if (PlayVod_isOn) {
                Play_HideBufferDialog();
                Play_PlayEndStart(2);
            }
        },
        4000,
        PlayVod_WarnEndId
    );
}

function PlayVod_qualityChanged() {
    PlayVod_qualityIndex = 1;

    for (var i = 0; i < PlayVod_getQualitiesCount(); i++) {
        if (PlayVod_qualities[i].id === PlayVod_quality) {
            PlayVod_qualityIndex = i;
            break;
        } else if (Main_A_includes_B(PlayVod_qualities[i].id, PlayVod_quality)) { //make shore to set a value before break out
            PlayVod_qualityIndex = i;
        }
    }

    PlayVod_quality = PlayVod_qualities[PlayVod_qualityIndex].id;
    PlayVod_qualityPlaying = PlayVod_quality;

    PlayVod_SetHtmlQuality('stream_quality');
    if (Main_IsOn_OSInterface) OSInterface_SetQuality(PlayVod_qualityIndex - 1);
    else PlayVod_onPlayer();
    //Play_PannelEndStart(2);
}

function PlayVod_onPlayer() {
    //Main_Log('PlayVod_onPlayer');
    if (Main_IsOn_OSInterface) {
        if (Main_vodOffset) {
            PlayVod_onPlayerStartPlay(Main_vodOffset * 1000);

            Chat_offset = Main_vodOffset;
            Chat_Init();
            Main_vodOffset = 0;
        } else {
            PlayVod_onPlayerStartPlay(OSInterface_gettime());
        }
    }

    PlayVod_replay = false;
    if (Play_ChatEnable && !Play_isChatShown()) Play_showChat();
    Play_SetFullScreen(Play_isFullScreen);
}

function PlayVod_onPlayerStartPlay(time) {
    if (Main_IsOn_OSInterface && PlayVod_isOn) {
        OSInterface_StartAuto(PlayVod_autoUrl, PlayVod_playlist, 2, PlayVod_replay ? -1 : time, 0);
    }
}

function PlayVod_shutdownStream() {
    //Main_Log('PlayVod_shutdownStream ' + PlayVod_isOn);

    if (PlayVod_isOn) {
        PlayVod_PreshutdownStream(true);
        PlayVod_qualities = [];
        PlayVod_playlist = null;
        Play_exitMain();
    }
}

function PlayVod_PreshutdownStream(saveOffset) {
    //Main_Log('PlayVod_PreshutdownStream');

    if (saveOffset && Main_IsOn_OSInterface) {
        var time = parseInt(OSInterface_gettime() / 1000);
        if (time > 0 && (Play_DurationSeconds - 300) > time) {
            PlayVod_SaveVodIds(time);
        }
    }
    if (Main_IsOn_OSInterface && !Play_PreviewId) OSInterface_stopVideo();
    Main_ShowElementWithEle(Play_Controls_Holder);
    Main_ShowElement('progress_pause_holder');
    PlayVod_isOn = false;
    PlayClip_OpenAVod = true;
    Main_clearInterval(PlayVod_SaveOffsetId);
    Main_clearTimeout(PlayVod_WarnEndId);
    Main_values.Play_WasPlaying = 0;
    Chat_Clear();

    if (!Play_PreviewId) UserLiveFeed_Hide();
    else UserLiveFeed_HideAfter();

    Play_ClearPlayer();
    PlayVod_ClearVod();
}

function PlayVod_ClearVod() {
    //Main_Log('PlayVod_ClearVod');

    Main_removeEventListener("keydown", PlayVod_handleKeyDown);
    Main_removeEventListener("keyup", PlayVod_SeekClear);
    Main_vodOffset = 0;
    Play_DurationSeconds = 0;
}

function PlayVod_hidePanel() {
    //return;//return;
    PlayVod_jumpCount = Settings_value.vod_seek_min.defaultValue;
    PlayVod_IsJumping = false;
    PlayVod_addToJump = 0;
    Play_clearHidePanel();
    Play_ForceHidePannel();
    PlayVod_ProgresBarrUpdate((OSInterface_gettime() / 1000), Play_DurationSeconds, true);
    Main_innerHTMLWithEle(Play_BottonIcons_Progress_JumpTo, STR_SPACE);
    Play_BottonIcons_Progress_Steps.style.display = 'none';
    PlayVod_previews_hide();
    PlayVod_quality = PlayVod_qualityPlaying;
    Main_clearInterval(PlayVod_RefreshProgressBarrID);
    PlayVod_jumpStepsIncreaseLock = false;
}

function PlayVod_showPanel(autoHide) {
    if (Play_getQualitiesFail) Play_getQualities(2, true);

    if (!Play_StayDialogVisible()) {
        PlayVod_SetChapters();
        PlayVod_RefreshProgressBarr(autoHide);
        PlayVod_RefreshProgressBarrID = Main_setInterval(
            function() {
                PlayVod_RefreshProgressBarr(autoHide);
            },
            1000,
            PlayVod_RefreshProgressBarrID
        );
    }

    Play_CleanHideExit();

    if (autoHide) {
        Play_BottonIconsResetFocus();
        PlayVod_qualityIndexReset();
        Play_qualityDisplay(PlayVod_getQualitiesCount, PlayVod_qualityIndex, PlayVod_SetHtmlQuality, Play_controlsQuality);
        if (!Main_A_includes_B(PlayVod_qualityPlaying, 'Auto')) PlayVod_SetHtmlQuality('stream_quality');
        Play_clearHidePanel();
        PlayExtra_ResetSpeed();
        PlayVod_setHidePanel();
    }
    Play_ForceShowPannel();
    if (PlayVod_muted_segments_warn && autoHide) PlayVod_muted_WarningDialog();
}

function PlayVod_RefreshProgressBarr(show) {

    if (!Settings_Obj_default("keep_panel_info_visible")) {
        if (Main_IsOn_OSInterface && Main_A_includes_B(PlayVod_qualityPlaying, 'Auto') && show)
            OSInterface_getVideoQuality(1);

        if (Main_IsOn_OSInterface) OSInterface_getVideoStatus(false);
        else Play_VideoStatusTest();
    }
}

function PlayVod_setHidePanel() {
    Play_PanelHideID = Main_setTimeout(PlayVod_hidePanel, (5000 + PlayVod_ProgressBaroffset), Play_PanelHideID); // time in ms
}

function PlayVod_qualityIndexReset() {
    PlayVod_qualityIndex = 0;
    for (var i = 0; i < PlayVod_getQualitiesCount(); i++) {
        if (PlayVod_qualities[i].id === PlayVod_quality) {
            PlayVod_qualityIndex = i;
            break;
        } else if (Main_A_includes_B(PlayVod_qualities[i].id, PlayVod_qualities[i].id)) { //make shore to set a value before break out
            PlayVod_qualityIndex = i;
        }
    }
}

function PlayVod_SetHtmlQuality(element) {
    if (!PlayVod_qualities[PlayVod_qualityIndex] || !PlayVod_qualities[PlayVod_qualityIndex].hasOwnProperty('id')) return;

    PlayVod_quality = PlayVod_qualities[PlayVod_qualityIndex].id;

    var quality_string = '';
    if (Main_A_includes_B(PlayVod_quality, 'source')) quality_string = PlayVod_quality.replace("source", STR_SOURCE);
    else quality_string = PlayVod_quality;

    quality_string += !Main_A_includes_B(PlayVod_quality, 'Auto') ? PlayVod_qualities[PlayVod_qualityIndex].band + PlayVod_qualities[PlayVod_qualityIndex].codec : "";

    Main_textContent(element, quality_string);
}

function PlayVod_getQualitiesCount() {
    return PlayVod_qualities.length;
}

function PlayVod_ProgresBarrUpdate(current_time_seconds, duration_seconds, update_bar) {
    Main_textContent('progress_bar_current_time', Play_timeS(current_time_seconds));
    Play_ProgresBarrBufferElm.style.width = Math.ceil(((current_time_seconds + Play_BufferSize) / duration_seconds) * 100.0) + '%';

    if (update_bar) Play_ProgresBarrElm.style.width = ((current_time_seconds / duration_seconds) * 100) + '%';
}

function PlayVod_jump() {
    if (!Play_isEndDialogVisible()) {

        if (PlayVod_isOn) {

            Chat_Pause();
            Chat_offset = PlayVod_TimeToJump;
            Main_setItem('Main_vodOffset', PlayVod_TimeToJump);
            PlayVod_SaveVodIds(PlayVod_TimeToJump);
            PlayVod_ChaptersSetGame(PlayVod_TimeToJump * 1000);

        } else Chat_offset = ChannelVod_vodOffset;

        if (Main_IsOn_OSInterface) {
            OSInterface_mseekTo(PlayVod_TimeToJump > 0 ? (PlayVod_TimeToJump * 1000) : 0);
        }

        if (PlayClip_HasVOD) Chat_Init();
    }
    Main_innerHTMLWithEle(Play_BottonIcons_Progress_JumpTo, STR_SPACE);
    Play_BottonIcons_Progress_Steps.style.display = 'none';
    Main_innerHTMLWithEle(Play_BottonIcons_Pause, '<div ><i class="pause_button3d icon-pause"></i> </div>');
    PlayVod_jumpCount = Settings_value.vod_seek_min.defaultValue;
    PlayVod_IsJumping = false;
    Play_BufferSize = Play_BufferSize - PlayVod_addToJump;
    PlayVod_addToJump = 0;
    if (PlayVod_isOn) PlayVod_ProgresBarrUpdate(PlayVod_TimeToJump, Play_DurationSeconds, true);
    PlayVod_TimeToJump = 0;
}

function PlayVod_SizeClear() {
    PlayVod_jumpCount = Settings_value.vod_seek_min.defaultValue;
    PlayVod_OldTime = 0;
    PlayVod_last_multiplier = '';
    PlayVod_jumpSteps(Settings_value.vod_seek_min.defaultValue);
    Main_removeEventListener("keyup", PlayVod_SeekClear);
}

var PlayVod_last_multiplier = '';
function PlayVod_jumpSteps(pos, signal) {
    if (PlayVod_addToJump && !PlayVod_PanelY) Play_BottonIcons_Progress_Steps.style.display = 'inline-block';

    Main_innerHTMLWithEle(
        Play_BottonIcons_Progress_Steps,
        STR_JUMPING_STEP + (signal ? signal : '') + Settings_jumpTimers_String[pos] +
        (PlayVod_isOn ? STR_BR + (PlayVod_jumpStepsIncreaseLock ? STR_LOCKED : STR_UP_LOCKED) : '')
    );

    PlayVod_last_multiplier = signal;
}

var PlayVod_jumpStepsIncreaseLock = false;

function PlayVod_jumpStepsIncrease() {
    Main_clearTimeout(PlayVod_SizeClearID);

    if (PlayVod_jumpStepsIncreaseLock) {
        if (PlayVod_jumpCount < (Play_DefaultjumpTimers.length - 1)) {

            PlayVod_jumpCount++;

        } else PlayVod_jumpCount = 0;
    }

    PlayVod_jumpStepsIncreaseLock = true;
    PlayVod_jumpSteps(PlayVod_jumpCount, PlayVod_last_multiplier);
}

function PlayVod_jumpTime() {
    Main_textContentWithEle(
        Play_BottonIcons_Progress_JumpTo,
        STR_JUMP_TIME + ' (' + (PlayVod_addToJump < 0 ? '-' : '') + Play_timeS(Math.abs(PlayVod_addToJump)) + ')' +
        STR_JUMP_T0 + Play_timeS(PlayVod_TimeToJump)
    );
}

function PlayVod_SeekClear() {
    PlayVod_OldTime = 0;
}

function PlayVod_jumpStart(multiplier, duration_seconds) {
    var currentTime = OSInterface_gettime() / 1000;

    Main_addEventListener("keyup", PlayVod_SeekClear);
    Main_clearTimeout(PlayVod_SizeClearID);
    PlayVod_IsJumping = true;

    var timeNow = new Date().getTime();

    if (!PlayVod_jumpStepsIncreaseLock && PlayVod_jumpCount < PlayVod_jump_max_step && PlayVod_OldTime && timeNow > PlayVod_OldTime) {

        PlayVod_jumpCount++;
        PlayVod_OldTime = timeNow + Settings_Time[Settings_value.vod_seek_time.defaultValue];

    } else if (!PlayVod_OldTime) {

        PlayVod_OldTime = timeNow;

    }

    PlayVod_addToJump += Play_DefaultjumpTimers[PlayVod_jumpCount] * multiplier;
    PlayVod_TimeToJump = currentTime + PlayVod_addToJump;

    if (PlayVod_TimeToJump > (duration_seconds - 1)) {

        PlayVod_addToJump = duration_seconds - currentTime - 1;
        PlayVod_TimeToJump = currentTime + PlayVod_addToJump;
        PlayVod_OldTime = 0;
        if (!PlayVod_jumpStepsIncreaseLock)
            PlayVod_jumpCount = Settings_value.vod_seek_min.defaultValue;

    } else if (PlayVod_TimeToJump < 0) {

        PlayVod_addToJump = 0 - currentTime;
        PlayVod_OldTime = 0;
        PlayVod_TimeToJump = 0;
        if (!PlayVod_jumpStepsIncreaseLock)
            PlayVod_jumpCount = Settings_value.vod_seek_min.defaultValue;

    }

    PlayVod_jumpTime();
    var position = (PlayVod_TimeToJump / duration_seconds);
    Play_ProgresBarrElm.style.width = (position * 100) + '%';

    PlayVod_previews_move(position);

    PlayVod_jumpSteps(PlayVod_jumpCount, (multiplier < 0 ? '-' : ''));

    if (!PlayVod_jumpStepsIncreaseLock) {

        PlayVod_SizeClearID = Main_setTimeout(PlayVod_SizeClear, 1000, PlayVod_SizeClearID);

    }
}

function PlayVod_SaveVodIds(time) {
    if (time > 0) Main_history_UpdateVodClip(Main_values.ChannelVod_vodId, time, 'vod');
}

var Play_HideVodDialogId;
function Play_HideVodDialog() {
    PlayVod_hidePanel();
    Main_HideElement('dialog_vod_start');
    PlayVod_IconsResetFocus();
    Play_HideVodDialogId = Main_setTimeout(
        function() {
            Main_ShowElementWithEle(Play_Controls_Holder);
        },
        1000,
        Play_HideVodDialogId
    );
}

function Play_isVodDialogVisible() {
    return Main_isElementShowing('dialog_vod_start');
}

function PlayVod_IconsResetFocus() {
    PlayVod_IconsRemoveFocus();
    PlayVod_VodPositions = 0;
    PlayVod_IconsAddFocus();
}

function PlayVod_IconsAddFocus() {
    Main_AddClass('dialog_vod_' + PlayVod_VodPositions, 'dialog_end_icons_focus');
}

function PlayVod_IconsRemoveFocus() {
    Main_RemoveClass('dialog_vod_' + PlayVod_VodPositions, 'dialog_end_icons_focus');
}

function PlayVod_DialogPressed(fromStart) {
    Play_HideVodDialog();
    Play_showBufferDialog();
    Main_ready(function() {
        if (!fromStart) PlayVod_DialogPressedClick(PlayVod_VodOffset);
        else {
            if (!ScreenObj[Main_HistoryVod].histPosX[1]) {
                Main_history_UpdateVodClip(Main_values.ChannelVod_vodId, 0.001, 'vod');
                Main_vodOffset = 0;
                PlayVod_Start();
            } else PlayVod_DialogPressedClick(0);
        }
    });
}

function PlayVod_DialogPressedClick(time) {
    Main_vodOffset = time;
    PlayVod_currentTime = Main_vodOffset * 1000;
    PlayVod_ProgresBarrUpdate(Main_vodOffset, Play_DurationSeconds, true);
    PlayVod_PosStart();
}

//When update this check PlayClip_CheckIfIsLiveResult
function PlayVod_CheckIfIsLiveResult(response) {

    Play_CheckIfIsLiveResultEnd(response, PlayVod_isOn, PlayVod_OpenLiveStream);

}

function PlayVod_CheckIfIsLiveStart() {

    if (!Main_IsOn_OSInterface || Play_PreviewId) PlayVod_OpenLiveStream();
    else if (Play_CheckLiveThumb()) Play_CheckIfIsLiveStart('PlayVod_CheckIfIsLiveResult');

}

function PlayVod_OpenLiveStream() {
    PlayVod_PreshutdownStream(true);
    Play_OpenFeed(PlayVod_handleKeyDown);
}

function PlayVod_CheckPreview() {
    if (PlayVod_isOn && Settings_Obj_default('show_vod_player') && Main_values.Main_Go !== Main_ChannelContent &&
        (ScreenObj[Main_values.Main_Go].screenType === 1 || ScreenObj[Main_values.Main_Go].screen === Main_HistoryLive) &&
        !Play_isEndDialogVisible() && !Sidepannel_isShowing() &&
        !Main_ThumbOpenIsNull(ScreenObj[Main_values.Main_Go].posY + '_' + ScreenObj[Main_values.Main_Go].posX, ScreenObj[Main_values.Main_Go].ids[0])) {

        if (PlayVod_CheckPreviewVod()) PlayVod_SetPreview();
    }
}

function PlayVod_CheckPreviewVod() {
    var restorePreview = false;

    var doc =
        Main_getElementById(
            ScreenObj[Main_values.Main_Go].ids[3] + ScreenObj[Main_values.Main_Go].posY + '_' + ScreenObj[Main_values.Main_Go].posX
        );

    if (doc) {
        var obj = JSON.parse(doc.getAttribute(Main_DataAttribute));

        if (ScreenObj[Main_values.Main_Go].screen === Main_HistoryLive) {

            var index = AddUser_UserIsSet() ? Main_history_Exist('live', obj[7]) : -1;

            if (index > -1) {

                if ((Main_values_History_data[AddUser_UsernameArray[0].id].live[index].forceVod ||
                    Main_A_includes_B(Main_getElementById(ScreenObj[Main_values.Main_Go].ids[1] + ScreenObj[Main_values.Main_Go].posY + '_' + ScreenObj[Main_values.Main_Go].posX).src, 's3_vods')) &&
                    Main_A_equals_B(Main_values_History_data[AddUser_UsernameArray[0].id].live[index].vodid, Main_values.ChannelVod_vodId)) {

                    restorePreview = true;

                }

            }

        } else if (Main_A_equals_B(obj[7], Main_values.ChannelVod_vodId)) {

            restorePreview = true;
        }

    }

    //The content may have refreshed so re-check
    if (Play_PreviewVideoEnded) Play_PreviewVideoEnded = restorePreview;

    return restorePreview;
}

function PlayVod_SetPreview() {
    Play_PreviewURL = PlayVod_autoUrl;
    Play_PreviewResponseText = PlayVod_playlist;
    Play_PreviewId = Main_values.ChannelVod_vodId;
}

function PlayVod_handleKeyDown(e) {
    if (PlayVod_state !== Play_STATE_PLAYING && !Play_isVodDialogVisible()) {
        switch (e.keyCode) {
            case KEY_STOP:
                Play_CleanHideExit();
                PlayVod_shutdownStream();
                break;
            case KEY_KEYBOARD_BACKSPACE:
            case KEY_RETURN:
                if (Play_ExitDialogVisible() || Settings_Obj_default("single_click_exit")) {
                    Play_CleanHideExit();
                    PlayVod_shutdownStream();
                } else {
                    Play_showExitDialog();
                }
                break;
            default:
                break;
        }
    } else {
        switch (e.keyCode) {
            case KEY_LEFT:
                if (UserLiveFeed_isFeedShow() && (!Play_EndFocus || !Play_isEndDialogVisible())) UserLiveFeed_KeyRightLeft(-1);
                else if (Play_isPanelShown() && !Play_isVodDialogVisible()) {
                    Play_clearHidePanel();
                    if (PlayVod_PanelY === 2) Play_BottomLeftRigt(2, -1);
                    else if (!PlayVod_PanelY) {
                        PlayVod_jumpStart(-1, Play_DurationSeconds);
                        PlayVod_ProgressBaroffset = 2500;
                    }
                    PlayVod_setHidePanel();
                } else if (Play_isVodDialogVisible()) {
                    PlayVod_IconsRemoveFocus();
                    if (PlayVod_VodPositions) PlayVod_VodPositions--;
                    else PlayVod_VodPositions++;
                    PlayVod_IconsAddFocus();
                } else if (Play_isEndDialogVisible()) {
                    Play_EndTextClear();
                    Play_EndIconsRemoveFocus();
                    Play_Endcounter--;
                    if (Play_Endcounter < 0) Play_Endcounter = 3;
                    if (Play_Endcounter === 1) Play_Endcounter = 0;
                    Play_EndIconsAddFocus();
                } else PlayVod_FastBackForward(-1);
                break;
            case KEY_RIGHT:
                if (UserLiveFeed_isFeedShow() && (!Play_EndFocus || !Play_isEndDialogVisible())) UserLiveFeed_KeyRightLeft(1);
                else if (Play_isPanelShown() && !Play_isVodDialogVisible()) {
                    Play_clearHidePanel();
                    if (PlayVod_PanelY === 2) Play_BottomLeftRigt(2, 1);
                    else if (!PlayVod_PanelY) {
                        PlayVod_jumpStart(1, Play_DurationSeconds);
                        PlayVod_ProgressBaroffset = 2500;
                    }
                    PlayVod_setHidePanel();
                } else if (Play_isVodDialogVisible()) {
                    PlayVod_IconsRemoveFocus();
                    if (PlayVod_VodPositions) PlayVod_VodPositions--;
                    else PlayVod_VodPositions++;
                    PlayVod_IconsAddFocus();
                } else if (Play_isEndDialogVisible()) {
                    Play_EndTextClear();
                    Play_EndIconsRemoveFocus();
                    Play_Endcounter++;
                    if (Play_Endcounter > 3) Play_Endcounter = 0;
                    if (Play_Endcounter === 1) Play_Endcounter = 2;
                    Play_EndIconsAddFocus();
                } else PlayVod_FastBackForward(1);
                break;
            case KEY_UP:
                if (Play_isEndDialogVisible() || UserLiveFeed_isFeedShow()) {
                    Play_EndTextClear();
                    Main_removeEventListener("keydown", PlayVod_handleKeyDown);
                    Main_addEventListener("keyup", Play_handleKeyUp);
                    Play_EndUpclear = false;
                    Play_EndUpclearCalback = PlayVod_handleKeyDown;
                    Play_EndUpclearID = Main_setTimeout(Play_keyUpEnd, Screens_KeyUptimeout, Play_EndUpclearID);
                } else if (Play_isPanelShown() && !Play_isVodDialogVisible()) {
                    Play_clearHidePanel();

                    if (!PlayVod_PanelY) {

                        PlayVod_jumpStepsIncrease();
                        PlayVod_ProgressBaroffset = 2500;

                    } else if (PlayVod_PanelY < 2) {

                        PlayVod_PanelY--;
                        Play_BottonIconsFocus();

                    } else {

                        Play_BottomUpDown(2, 1);

                    }

                    PlayVod_setHidePanel();
                } else if (!UserLiveFeed_isFeedShow() && !Play_isVodDialogVisible()) UserLiveFeed_ShowFeed();
                else if (!Play_isVodDialogVisible()) PlayVod_showPanel(true);
                break;
            case KEY_DOWN:
                if (Play_isEndDialogVisible()) Play_EndDialogUpDown(1);
                else if (Play_isPanelShown() && !Play_isVodDialogVisible()) {
                    Play_clearHidePanel();
                    if (PlayVod_PanelY < 2) {
                        PlayVod_PanelY++;
                        Play_BottonIconsFocus();
                        PlayVod_previews_hide();
                    } else Play_BottomUpDown(2, -1);
                    PlayVod_setHidePanel();
                } else if (UserLiveFeed_isFeedShow()) UserLiveFeed_KeyUpDown(1);
                else if (Play_isFullScreen && !Play_isPanelShown()) Play_controls[Play_controlsChat].enterKey(2);
                else if (!Play_isVodDialogVisible()) PlayVod_showPanel(true);
                break;
            case KEY_ENTER:
                if (Play_isVodDialogVisible()) PlayVod_DialogPressed(PlayVod_VodPositions);
                else if (Play_isEndDialogVisible()) {
                    if (Play_EndFocus) Play_EndDialogPressed(2);
                    else {
                        if (UserLiveFeed_obj[UserLiveFeed_FeedPosX].IsGame) UserLiveFeed_KeyEnter(UserLiveFeed_FeedPosX);
                        else {
                            Play_EndDialogEnter = 2;
                            Play_EndUpclearCalback = PlayVod_handleKeyDown;
                            Play_SavePlayData();
                            Play_OpenLiveStream(PlayVod_handleKeyDown);
                        }
                    }
                } else if (Play_isPanelShown()) {
                    Play_clearHidePanel();
                    if (!PlayVod_PanelY) {
                        if (PlayVod_IsJumping) PlayVod_jump();
                    } else if (PlayVod_PanelY === 1) {
                        if (Main_IsOn_OSInterface && !Play_isEndDialogVisible()) OSInterface_PlayPauseChange();
                    } else Play_BottomOptionsPressed(2);
                    PlayVod_setHidePanel();
                } else if (UserLiveFeed_isFeedShow()) {
                    if (UserLiveFeed_obj[UserLiveFeed_FeedPosX].IsGame) UserLiveFeed_KeyEnter(UserLiveFeed_FeedPosX);
                    else PlayVod_CheckIfIsLiveStart();
                }
                else PlayVod_showPanel(true);
                break;
            case KEY_STOP:
                PlayVod_CheckPreview();
                Play_CleanHideExit();
                PlayVod_shutdownStream();
                break;
            case KEY_KEYBOARD_BACKSPACE:
            case KEY_RETURN:
                Play_KeyReturn(true);
                break;
            case KEY_PLAY:
            case KEY_PLAYPAUSE:
            case KEY_KEYBOARD_SPACE:
                if (Main_IsOn_OSInterface && !Play_isEndDialogVisible()) OSInterface_PlayPauseChange();
                break;
            case KEY_1:
                if (UserLiveFeed_isFeedShow()) {
                    if (UserLiveFeed_obj[UserLiveFeed_FeedPosX].IsGame) UserLiveFeed_KeyEnter(UserLiveFeed_FeedPosX);
                    else PlayVod_CheckIfIsLiveStart();
                }
                break;
            case KEY_REFRESH:
                if (UserLiveFeed_isFeedShow()) UserLiveFeed_FeedRefresh();
                else if (!Play_isEndDialogVisible() && !Play_isPanelShown() &&
                    !Play_MultiDialogVisible() && !Play_isVodDialogVisible()) Play_controls[Play_controlsChatSide].enterKey();
                break;
            case KEY_CHAT:
                Play_controls[Play_controlsChat].enterKey(2);
                break;
            case KEY_MEDIA_REWIND:
            case KEY_PG_UP:
                if (UserLiveFeed_isFeedShow()) UserLiveFeed_KeyUpDown(-1);
                else if (Play_isFullScreen && Play_isChatShown()) Play_KeyChatPosChage();
                else UserLiveFeed_ShowFeed();
                break;
            case KEY_PG_DOWN:
                if (UserLiveFeed_isFeedShow()) UserLiveFeed_KeyUpDown(1);
                else if (Play_isFullScreen && Play_isChatShown()) Play_KeyChatSizeChage();
                else UserLiveFeed_ShowFeed();
                break;
            case KEY_MEDIA_FAST_FORWARD:
                if (Play_isEndDialogVisible()) break;

                if (UserLiveFeed_isFeedShow()) UserLiveFeed_FeedRefresh();
                else Play_controls[Play_controlsChatSide].enterKey();

                break;
            case KEY_MEDIA_NEXT:
            case KEY_MEDIA_PREVIOUS:
                if (Play_isPanelShown()) PlayVod_hidePanel();
                else PlayVod_showPanel(true);
                break;
            default:
                break;
        }
    }
}

function PlayVod_FastBackForward(position) {
    if (!Play_isPanelShown()) PlayVod_showPanel(true);
    Play_clearHidePanel();
    PlayVod_PanelY = 0;
    Play_BottonIconsFocus();

    PlayVod_jumpStart(position, Play_DurationSeconds);
    PlayVod_ProgressBaroffset = 2500;
    PlayVod_setHidePanel();
}

var PlayVod_previews_url;
var PlayVod_previewsId;

function PlayVod_previews_pre_start(seek_previews_url) {
    if (!seek_previews_url) return;

    PlayVod_previews_url = seek_previews_url;
    PlayVod_previews_clear();

    if (Main_IsOn_OSInterface) {

        PlayVod_previewsId = new Date().getTime();

        OSInterface_GetMethodUrlHeadersAsync(
            PlayVod_previews_url,//urlString
            DefaultHttpGetTimeout * 2,//timeout
            null,//postMessage, null for get
            null,//Method, null for get
            '[]',//JsonString
            'PlayVod_previews_success',//callback
            PlayVod_previewsId,//checkResult
            0,//key
            2//thread
        );
    }
    //else PlayVod_previews_start_test();
}

function PlayVod_previews_clear() {
    PlayVod_previews_hide();
    PlayVod_previews_obj.images = [];
    PlayVod_previews_images_pos = -1;
}

var PlayVod_previews_obj = {};
PlayVod_previews_obj.images = [];

var PlayVod_previews_images_pos = -1;
var PlayVod_previews_images_load = false;
var PlayVod_previews_tmp_images = [];

var PlayVod_previews_scale = 1.55;

function PlayVod_previews_hide() {
    Play_seek_previews.classList.add('hideimp');
    PlayVod_previews_images_load = false;
}

function PlayVod_previews_show() {
    PlayVod_previews_images_load = true;
    Play_seek_previews.classList.remove('hideimp');
}

function PlayVod_previews_success(result) {

    if (PlayVod_isOn && result) {

        var resultObj = JSON.parse(result);

        if (resultObj.checkResult > 0 && resultObj.checkResult === PlayVod_previewsId) {

            if (resultObj.status === 200) {

                resultObj = JSON.parse(resultObj.responseText);

                if (resultObj.length) {
                    PlayVod_previews_obj = resultObj[resultObj.length - 1];

                    if (PlayVod_previews_obj.images.length && Main_A_includes_B(PlayVod_previews_obj.images[0], Main_values.ChannelVod_vodId)) {
                        PlayVod_previews_success_end();
                    } else PlayVod_previews_clear();

                }
            } else {
                PlayVod_previews_hide();
            }

        }

    } else PlayVod_previews_hide();

}

function PlayVod_previews_success_end() {
    PlayVod_previews_obj.width = PlayVod_previews_obj.width * scaleFactor * PlayVod_previews_scale;
    PlayVod_previews_obj.height = PlayVod_previews_obj.height * scaleFactor * PlayVod_previews_scale;

    Play_seek_previews.style.width = PlayVod_previews_obj.width + 'px';
    Play_seek_previews.style.height = PlayVod_previews_obj.height + 'px';

    Play_seek_previews.style.backgroundSize = (PlayVod_previews_obj.cols * PlayVod_previews_obj.width) + "px";

    var base_url = PlayVod_previews_url.split(Main_values.ChannelVod_vodId)[0];
    PlayVod_previews_tmp_images = [];

    var i = 0, len = PlayVod_previews_obj.images.length;
    for (i; i < len; i++) {
        PlayVod_previews_obj.images[i] = base_url + PlayVod_previews_obj.images[i];

        PlayVod_previews_tmp_images[i] = new Image();

        PlayVod_previews_tmp_images[i].src = PlayVod_previews_obj.images[i];

    }

}

function PlayVod_previews_move(position) {
    if (!PlayVod_previews_obj.images.length) {
        PlayVod_previews_hide();
        return;
    }

    position = parseInt(position * PlayVod_previews_obj.count);
    var imagePos = parseInt(position / (PlayVod_previews_obj.cols * PlayVod_previews_obj.rows)) % PlayVod_previews_obj.images.length;

    // //Main_Log('position ' + position + ' w ' + (position % PlayVod_previews_obj.cols) + ' h ' + parseInt(position / PlayVod_previews_obj.cols) + ' p ' + imagePos);

    if (!PlayVod_previews_images_load || imagePos !== PlayVod_previews_images_pos) {

        PlayVod_previews_images_pos = imagePos;
        PlayVod_previews_images_load = false;

        var imgurl = PlayVod_previews_obj.images[imagePos];

        Play_seek_previews_img.onload = function() {

            this.onload = null;
            Play_seek_previews.style.backgroundImage = "url('" + imgurl + "')";
            PlayVod_previews_show();

        };

        Play_seek_previews_img.onerror = function() {

            this.onerror = null;
            PlayVod_previews_hide();

        };

        Play_seek_previews_img.src = imgurl;

    }

    Play_seek_previews.style.backgroundPosition = (-PlayVod_previews_obj.width * (position % PlayVod_previews_obj.cols)) + "px " +
        (-PlayVod_previews_obj.height * (parseInt(position / PlayVod_previews_obj.cols) % PlayVod_previews_obj.rows)) + "px";
}

// function PlayVod_previews_start_test() {
//     PlayVod_previews_clear();
//     //Main_Log(PlayVod_previews_url);

//     PlayVod_previews_hide();
//     if (!PlayVod_previews_url) return;

//     PlayVod_previews_obj = {
//         "count": 200,
//         "width": 220,
//         "rows": 10,
//         "images": [Main_values.ChannelVod_vodId + "-high-0.jpg", Main_values.ChannelVod_vodId + "-high-1.jpg", Main_values.ChannelVod_vodId + "-high-2.jpg", Main_values.ChannelVod_vodId + "-high-3.jpg"],
//         "interval": 55,
//         "quality": "high",
//         "cols": 5,
//         "height": 124
//     };

//     PlayVod_previews_success_end();
// }

var PlayVod_muted_segments_warn = false;
var PlayVod_muted_segments_value = null;
function PlayVod_muted_segments(muted_segments, skipwarning) {
    if (muted_segments && muted_segments.length) {

        var doc = Main_getElementById('inner_progress_bar_muted'), div;
        Main_emptyWithEle(doc);

        var i = 0, len = muted_segments.length;
        for (i; i < len; i++) {

            div = document.createElement('div');
            div.classList.add('inner_progress_bar_muted_segment');
            div.style.left = ((muted_segments[i].offset / Play_DurationSeconds) * 100) + '%';
            div.style.width = ((muted_segments[i].duration / Play_DurationSeconds) * 100) + '%';

            doc.appendChild(div);
        }
        if (!skipwarning) PlayVod_muted_segments_warn = true;
    } else {
        PlayVod_muted_segments_warn = false;
        Main_empty('inner_progress_bar_muted');
    }
}

var PlayVod_muted_WarningDialogId;
function PlayVod_muted_WarningDialog() {
    PlayVod_muted_segments_warn = false;
    Main_innerHTML("dialog_warning_muted_text", STR_VOD_MUTED);
    Main_ShowElement('dialog_warning_muted');

    PlayVod_muted_WarningDialogId = Main_setTimeout(
        function() {
            Main_HideElement('dialog_warning_muted');
        },
        5000,
        PlayVod_muted_WarningDialogId
    );
}

var PlayVod_updateChaptersId;
function PlayVod_updateChapters() {

    if (Main_IsOn_OSInterface) {

        PlayVod_updateChaptersId = (new Date().getTime());

        OSInterface_GetMethodUrlHeadersAsync(
            PlayClip_BaseUrl,//urlString
            DefaultHttpGetTimeout,//timeout
            PlayVod_postChapters.replace('%x', Main_values.ChannelVod_vodId),//postMessage, null for get
            'POST',//Method, null for get
            Play_base_back_headers,//JsonString
            'PlayVod_updateChaptersResult',//callback
            PlayVod_updateChaptersId,//checkResult
            0,//key
            3//thread
        );

    } else PlayVod_ProcessChaptersFake();

}

function PlayVod_updateChaptersResult(response) {
    if (PlayVod_isOn && response) {

        var responseObj = JSON.parse(response);

        if (responseObj.checkResult > 0 && responseObj.checkResult === PlayVod_updateChaptersId) {

            if (responseObj.status === 200) {
                PlayVod_ProcessChapters(JSON.parse(responseObj.responseText));
            }
        }

    }

}

function PlayVod_ProcessChapters(obj) {
    obj = obj.data.video.moments.edges;

    var i = 0,
        len = obj.length,
        game,
        name;

    PlayVod_ChaptersArray = [];
    Play_controls[Play_controlsChapters].values = [];
    Play_controls[Play_controlsChapters].defaultValue = 0;

    for (i; i < len; i++) {
        if (obj[i].node.type === "GAME_CHANGE") {

            game = obj[i].node.details.game ? obj[i].node.details.game.displayName : obj[i].node.description;
            name = STR_PLAYED + game + ' ' + STR_FOR + Play_timeMs(obj[i].node.durationMilliseconds) +
                STR_FROM_SIMPLE + Play_timeMs(obj[i].node.positionMilliseconds);

            PlayVod_ChaptersArray.push(
                {
                    name: name,
                    posMs: obj[i].node.positionMilliseconds,
                    gameId: obj[i].node.details.game ? obj[i].node.details.game.id : null,
                    game: game
                }
            );

            Play_controls[Play_controlsChapters].values.push(name);
        }
    }

    len = PlayVod_ChaptersArray.length;


    if (len) {
        Play_BottomShow(Play_controlsChapters);
        Play_controls[Play_controlsChapters].setLable();
        Play_controls[Play_controlsChapters].bottomArrows();
        PlayVod_SetChapters();
    }
}

function PlayVod_SetChapters() {
    var timeMs = 0;//Chane the time to test diferent position on browser
    if (Main_IsOn_OSInterface) timeMs = OSInterface_gettime();
    PlayVod_ChaptersSetGame(timeMs);
}

function PlayVod_ChaptersSetGame(timeMs) {

    var len = PlayVod_ChaptersArray.length;

    if (len) {

        while (len--) {

            if (timeMs >= PlayVod_ChaptersArray[len].posMs) {

                if (PlayVod_ChaptersArray[len].game) {
                    Main_innerHTML(
                        "stream_info_game",
                        STR_PLAYING + PlayVod_ChaptersArray[len].game);

                    Play_data.data[3] = PlayVod_ChaptersArray[len].game;
                    Play_controls[Play_controlsGameCont].setLable(Play_data.data[3]);

                    if (!Play_isPanelShown() || Play_Panelcounter !== Play_controlsChapters) {
                        Play_controls[Play_controlsChapters].defaultValue = len;
                        Play_controls[Play_controlsChapters].setLable();
                        Play_controls[Play_controlsChapters].bottomArrows();
                    }
                }

                break;

            }

        }

    }
}

function PlayVod_ProcessChaptersFake() {
    var obj = {
        "data": {
            "video": {
                "moments": {
                    "edges": [{
                        "node": {
                            "durationMilliseconds": 67000,
                            "positionMilliseconds": 0,
                            "type": "GAME_CHANGE",
                            "description": "Barotrauma",
                            "details": {
                                "game": {
                                    "id": "496735",
                                    "displayName": "Barotrauma"
                                }
                            }
                        }
                    }, {
                        "node": {
                            "durationMilliseconds": 5422000,
                            "positionMilliseconds": 67000,
                            "type": "GAME_CHANGE",
                            "description": "Just Chatting",
                            "details": {
                                "game": {
                                    "id": "509658",
                                    "displayName": "Just Chatting"
                                }
                            }
                        }
                    }, {
                        "node": {
                            "durationMilliseconds": 3658000,
                            "positionMilliseconds": 5489000,
                            "type": "GAME_CHANGE",
                            "description": "Bad Guys at School",
                            "details": {
                                "game": null
                            }
                        }
                    }, {
                        "node": {
                            "durationMilliseconds": 5505000,
                            "positionMilliseconds": 9147000,
                            "type": "GAME_CHANGE",
                            "description": "Grounded",
                            "details": {
                                "game": {
                                    "id": "516086",
                                    "displayName": "Grounded"
                                }
                            }
                        }
                    }]
                }
            }
        }
    };
    PlayVod_ProcessChapters(obj);
}