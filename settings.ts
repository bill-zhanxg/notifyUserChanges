/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from '@api/Settings';
import { OptionType } from '@utils/types';

export const settings = definePluginSettings({
	notifyStatus: {
		type: OptionType.BOOLEAN,
		description: 'Notify on status changes',
		restartNeeded: false,
		default: true,
	},
	notifyVoice: {
		type: OptionType.BOOLEAN,
		description: 'Notify on voice channel changes',
		restartNeeded: false,
		default: false,
	},
	persistNotifications: {
		type: OptionType.BOOLEAN,
		description: 'Persist notifications',
		restartNeeded: false,
		default: false,
	},
	notifyGameActivityChange: {
		type: OptionType.BOOLEAN,
		description: 'Notify on game activity changes',
		restartNeeded: false,
		default: true,
	},
	showGameActivityChangeNotification: {
		type: OptionType.BOOLEAN,
		description: 'Show a notification for game activity changes',
		restartNeeded: false,
		default: true,
	},
	historyLimit: {
		type: OptionType.NUMBER,
		description: 'Maximum stored history items',
		restartNeeded: false,
		default: 500,
	},
	eventsPerPage: {
		type: OptionType.NUMBER,
		description: 'Status logger events per page',
		restartNeeded: false,
		default: 100,
	},
	userIds: {
		type: OptionType.STRING,
		description: 'User IDs (comma separated)',
		restartNeeded: false,
		default: '',
	},
	watchlistUserIds: {
		type: OptionType.STRING,
		description: 'Watchlist user IDs (comma separated)',
		restartNeeded: false,
		default: '',
	},
});
