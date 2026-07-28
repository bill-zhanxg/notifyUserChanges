/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface PresenceUpdate {
    user: {
        id: string;
        username?: string;
        global_name?: string;
    };
    clientStatus: {
        desktop?: string;
        web?: string;
        mobile?: string;
        console?: string;
    };
    guildId?: string;
    status: string;
    broadcast?: any; // what's this?
    activities: Array<{
        session_id: string;
        created_at: number;
        id: string;
        name: string;
        details?: string;
        state?: string;
        type: number;
    }>;
}

export interface VoiceState {
    userId: string;
    channelId?: string;
    oldChannelId?: string;
    deaf: boolean;
    mute: boolean;
    selfDeaf: boolean;
    selfMute: boolean;
    selfStream: boolean;
    selfVideo: boolean;
    sessionId: string;
    suppress: boolean;
    requestToSpeakTimestamp: string | null;
}
