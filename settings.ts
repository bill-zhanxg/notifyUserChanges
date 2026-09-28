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
		description: 'Show notifications when followed users change status or connected platforms',
		restartNeeded: false,
		default: true,
	},
	notifyVoice: {
		type: OptionType.BOOLEAN,
		description: 'Show notifications when followed users join or leave voice channels',
		restartNeeded: false,
		default: false,
	},
	logPlaying: {
		type: OptionType.BOOLEAN,
		description: 'Record Playing activity changes in the status logger',
		restartNeeded: false,
		default: true,
	},
	logStreaming: {
		type: OptionType.BOOLEAN,
		description: 'Record Streaming activity changes in the status logger',
		restartNeeded: false,
		default: true,
	},
	logListening: {
		type: OptionType.BOOLEAN,
		description: 'Record Listening activity changes in the status logger',
		restartNeeded: false,
		default: true,
	},
	logWatching: {
		type: OptionType.BOOLEAN,
		description: 'Record Watching activity changes in the status logger',
		restartNeeded: false,
		default: true,
	},
	logCompeting: {
		type: OptionType.BOOLEAN,
		description: 'Record Competing activity changes in the status logger',
		restartNeeded: false,
		default: true,
	},
	notifyPlaying: {
		type: OptionType.BOOLEAN,
		description: 'Show notifications when followed users start or stop Playing activities',
		restartNeeded: false,
		default: true,
	},
	notifyStreaming: {
		type: OptionType.BOOLEAN,
		description: 'Show notifications when followed users start or stop Streaming activities',
		restartNeeded: false,
		default: true,
	},
	notifyListening: {
		type: OptionType.BOOLEAN,
		description: 'Show notifications when followed users start or stop Listening activities',
		restartNeeded: false,
		default: true,
	},
	notifyWatching: {
		type: OptionType.BOOLEAN,
		description: 'Show notifications when followed users start or stop Watching activities',
		restartNeeded: false,
		default: true,
	},
	notifyCompeting: {
		type: OptionType.BOOLEAN,
		description: 'Show notifications when followed users start or stop Competing activities',
		restartNeeded: false,
		default: true,
	},
	persistNotifications: {
		type: OptionType.BOOLEAN,
		description: 'Keep these notifications in Discord after they are dismissed',
		restartNeeded: false,
		default: false,
	},
	historyLimit: {
		type: OptionType.NUMBER,
		description: 'Maximum number of changes kept in the status logger',
		restartNeeded: false,
		default: 500,
	},
	eventsPerPage: {
		type: OptionType.NUMBER,
		description: 'Number of changes shown on each status logger page',
		restartNeeded: false,
		default: 100,
	},
	userIds: {
		type: OptionType.STRING,
		description: 'User IDs (comma separated)',
		hidden: true,
		restartNeeded: false,
		default: '',
	},
	watchlistUserIds: {
		type: OptionType.STRING,
		description: 'Watchlist user IDs (comma separated)',
		hidden: true,
		restartNeeded: false,
		default: '',
	},
});
