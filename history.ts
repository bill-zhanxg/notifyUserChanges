/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { nanoid } from 'nanoid';

import * as DataStore from '@api/DataStore';
import { findStoreLazy } from '@webpack';
import { useEffect, useReducer, useState } from '@webpack/common';

import { settings } from './settings';
import { PresenceUpdate } from './types';

const ChannelStore = findStoreLazy('ChannelStore') as {
	getChannel(channelId: string):
		| {
				id: string;
				guild_id?: string;
				name?: string;
				type?: number;
		  }
		| undefined;
};

const GuildStore = findStoreLazy('GuildStore') as {
	getGuild(guildId: string):
		| {
				id: string;
				name?: string;
				icon?: string | null;
		  }
		| undefined;
};

export const HISTORY_KEY = 'notify-user-changes-history';

export type NotificationKind = 'voice-join' | 'voice-leave' | 'status' | 'game';

export type PlatformSnapshot = {
	platform: string;
	status: string;
};

export type VoiceContext = {
	channelId: string;
	channelName?: string;
	guildId?: string;
	guildName?: string;
	channelType?: number;
};

export type ActivitySnapshot = PresenceUpdate['activities'][number] & {
	application_id?: string;
	url?: string;
	flags?: number;
	timestamps?: {
		start?: number;
		end?: number;
	};
	assets?: {
		large_image?: string;
		large_text?: string;
		large_url?: string;
		small_image?: string;
		small_text?: string;
		small_url?: string;
	};
	party?: {
		id?: string;
		size?: [number, number];
	};
	buttons?: string[];
	metadata?: {
		button_urls?: string[];
	};
	emoji?: {
		id?: string;
		name?: string;
		animated?: boolean;
	};
};

export type HistoryEntry = HistoryEntryStatus | HistoryEntryVoice | HistoryEntryGame;

type HistoryEntryInput =
	| Omit<HistoryEntryStatus, 'id' | 'timestamp'>
	| Omit<HistoryEntryVoice, 'id' | 'timestamp'>
	| Omit<HistoryEntryGame, 'id' | 'timestamp'>;

interface HistoryEntryBase {
	id: string;
	timestamp: number;
	kind: NotificationKind;
	userId: string;
	username: string;
	displayName: string;
	avatarUrl: string;
}

export interface HistoryEntryStatus extends HistoryEntryBase {
	kind: 'status';
	previous?: string | null;
	current: string;
	platformSnapshot: PlatformSnapshot[];
}

export interface HistoryEntryVoice extends HistoryEntryBase {
	kind: 'voice-join' | 'voice-leave';
	previous?: string | null;
	current?: string | null;
	voice?: VoiceContext;
}

export interface HistoryEntryGame extends HistoryEntryBase {
	kind: 'game';
	previous?: string | null;
	current?: string | null;
	activity: ActivitySnapshot;
}

function safeDate(value: number | string | null | undefined) {
	if (value == null) return null;

	const parsed = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(parsed)) return null;

	const date = new Date(parsed);
	return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatClock(date: Date) {
	return date.toLocaleTimeString('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
	});
}

function sanitizeActivity(activity: ActivitySnapshot | undefined) {
	if (!activity) return undefined;

	const start = safeDate(activity.timestamps?.start);
	const end = safeDate(activity.timestamps?.end);

	return {
		...activity,
		timestamps:
			start || end ?
				{
					...(start ? { start: start.getTime() } : {}),
					...(end ? { end: end.getTime() } : {}),
				}
			:	undefined,
	};
}

export function sanitizeHistoryEntry(entry: HistoryEntry): HistoryEntry | null {
	const timestamp = safeDate(entry.timestamp);
	if (!timestamp) return null;

	return {
		...entry,
		timestamp: timestamp.getTime(),
		...(entry.kind === 'game' ?
			{
				activity: sanitizeActivity(entry.activity),
			}
		:	{}),
	};
}

export function formatHistoryTimestamp(value: number | string | null | undefined) {
	const date = safeDate(value);
	if (!date) return 'Unknown time';

	const now = new Date();
	const nowStart = startOfDay(now).getTime();
	const dateStart = startOfDay(date).getTime();
	const dayDiff = Math.floor((nowStart - dateStart) / 86400000);
	const clock = formatClock(date);

	if (dayDiff === 0) {
		return clock;
	}

	if (dayDiff === 1) {
		return `Yesterday at ${clock}`;
	}

	if (dayDiff > 1 && dayDiff < 7) {
		return `${date.toLocaleDateString([], { weekday: 'short' })} at ${clock}`;
	}

	if (date.getFullYear() === now.getFullYear()) {
		return `${date.toLocaleDateString([], { day: 'numeric', month: 'short' })} at ${clock}`;
	}

	return `${date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })} at ${clock}`;
}

export function formatHistoryTimestampTooltip(value: number | string | null | undefined) {
	const date = safeDate(value);
	if (!date) return 'Unknown time';

	return date.toLocaleString([], {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		second: '2-digit',
		hour12: true,
	});
}

const historySignals = new Set<() => void>();

export async function getHistory() {
	const raw = (await DataStore.get(HISTORY_KEY)) as HistoryEntry[] | undefined;
	const sanitized = (raw ?? []).map(sanitizeHistoryEntry).filter(Boolean) as HistoryEntry[];

	if ((raw ?? []).length !== sanitized.length || sanitized.some((entry, index) => entry !== raw?.[index])) {
		await DataStore.set(HISTORY_KEY, sanitized);
	}

	return sanitized;
}

async function persistHistoryEntry(entry: HistoryEntryInput) {
	const limit = Math.max(1, settings.store.historyLimit);

	await DataStore.update(HISTORY_KEY, (old: HistoryEntry[] | undefined) => {
		const history = old ?? [];

		history.unshift({
			...entry,
			id: nanoid(),
			timestamp: Date.now(),
		});

		if (history.length > limit) {
			history.length = limit;
		}

		return history;
	});

	historySignals.forEach((signal) => signal());
}

export async function clearHistory() {
	await DataStore.set(HISTORY_KEY, []);
	historySignals.forEach((signal) => signal());
}

export function useHistory() {
	const [signal, bump] = useReducer((value) => value + 1, 0);

	useEffect(() => {
		historySignals.add(bump);
		return () => void historySignals.delete(bump);
	}, []);

	const [history, setHistory] = useState<HistoryEntry[]>([]);

	useEffect(() => {
		let alive = true;
		getHistory().then((entries) => {
			if (alive) {
				setHistory(entries ?? []);
			}
		});

		return () => {
			alive = false;
		};
	}, [signal]);

	return history;
}

export function getKindLabel(kind: NotificationKind) {
	switch (kind) {
		case 'voice-join':
			return 'Voice join';
		case 'voice-leave':
			return 'Voice leave';
		case 'status':
			return 'Status';
		case 'game':
			return 'Game';
	}
}

export function getKindTone(kind: NotificationKind) {
	switch (kind) {
		case 'voice-join':
			return 'success';
		case 'voice-leave':
			return 'danger';
		case 'status':
			return 'info';
		case 'game':
			return 'warning';
	}
}

export function getStatusColor(status: string) {
	switch (status) {
		case 'online':
			return '#43b581';
		case 'idle':
			return '#faa61a';
		case 'dnd':
			return '#f04747';
		default:
			return '#747f8d';
	}
}

export function resolveVoiceContext(channelId: string | null): VoiceContext | undefined {
	if (!channelId) return undefined;

	const channel = ChannelStore.getChannel(channelId);
	const guild = channel?.guild_id ? GuildStore.getGuild(channel.guild_id) : undefined;

	return {
		channelId,
		channelName: channel?.name,
		guildId: channel?.guild_id,
		guildName: guild?.name,
		channelType: channel?.type,
	};
}

export function getActivitySummary(activity: ActivitySnapshot) {
	const summary = activity.state ?? activity.details;
	if (summary) return summary;

	if (activity.type === 0) return `Playing ${activity.name}`;
	return activity.name;
}

export function getActivityTitle(activity: ActivitySnapshot) {
	return activity.name || getActivitySummary(activity) || 'Game activity';
}

export function recordStatusEntry(
	userId: string,
	username: string,
	displayName: string,
	status: string,
	previousStatus: string | null,
	avatarUrl: string,
	platformSnapshot: PlatformSnapshot[],
) {
	void persistHistoryEntry({
		kind: 'status',
		userId,
		username,
		displayName,
		avatarUrl,
		previous: previousStatus,
		current: status,
		platformSnapshot,
	});
}

export function recordVoiceEntry(entry: HistoryEntryInput) {
	void persistHistoryEntry(entry);
}

export function recordGameEntry(
	userId: string,
	username: string,
	displayName: string,
	activity: ActivitySnapshot | null,
	previousActivity: ActivitySnapshot | null,
	avatarUrl: string,
) {
	const storedActivity = activity ?? previousActivity;
	if (!storedActivity) return;

	const activityTitle = getActivityTitle(storedActivity);
	const activitySummary =
		activity ? getActivitySummary(activity)
		: previousActivity ? getActivitySummary(previousActivity)
		: getActivitySummary(storedActivity);

	void persistHistoryEntry({
		kind: 'game',
		userId,
		username,
		displayName,
		avatarUrl,
		previous:
			previousActivity ? getActivitySummary(previousActivity)
			: activity ? null
			: activitySummary,
		current: activity ? activitySummary : null,
		activity: storedActivity,
	});
}
