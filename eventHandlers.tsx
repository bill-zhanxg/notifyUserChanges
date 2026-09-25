/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from '@api/ContextMenu';
import { showNotification } from '@api/Notifications';
import { Menu, React, SelectedChannelStore, UserStore } from '@webpack/common';

import { NotificationsOffIcon } from './components/NotificationsOffIcon';
import { NotificationsOnIcon } from './components/NotificationsOnIcon';
import { WatchlistAddIcon, WatchlistRemoveIcon } from './components/WatchlistIcons';
import { getStatusColor, recordGameEntry, recordStatusEntry, recordVoiceEntry, resolveVoiceContext } from './history';
import { PlatformIndicator } from './platformIndicators';
import { settings } from './settings';
import { PresenceUpdate, VoiceState } from './types';

import type { Channel, User } from '@vencord/discord-types';
function getUserIdList() {
	try {
		return settings.store.userIds.split(',').filter(Boolean);
	} catch {
		settings.store.userIds = '';
		return [];
	}
}

function getWatchlistUserIdList() {
	try {
		return settings.store.watchlistUserIds.split(',').filter(Boolean);
	} catch {
		settings.store.watchlistUserIds = '';
		return [];
	}
}

function toggleUserNotify(userId: string) {
	const userIds = getUserIdList();
	if (userIds.includes(userId)) {
		userIds.splice(userIds.indexOf(userId), 1);
	} else {
		userIds.push(userId);
		const watchlistUserIds = getWatchlistUserIdList();
		const watchlistIndex = watchlistUserIds.indexOf(userId);
		if (watchlistIndex !== -1) {
			watchlistUserIds.splice(watchlistIndex, 1);
			settings.store.watchlistUserIds = watchlistUserIds.join(',');
		}
	}
	settings.store.userIds = userIds.join(',');
}

function toggleUserWatchlist(userId: string) {
	const watchlistUserIds = getWatchlistUserIdList();
	if (watchlistUserIds.includes(userId)) {
		watchlistUserIds.splice(watchlistUserIds.indexOf(userId), 1);
	} else {
		watchlistUserIds.push(userId);
		const userIds = getUserIdList();
		const userIndex = userIds.indexOf(userId);
		if (userIndex !== -1) {
			userIds.splice(userIndex, 1);
			settings.store.userIds = userIds.join(',');
		}
	}
	settings.store.watchlistUserIds = watchlistUserIds.join(',');
}

function getRichBody(user: User, text: string | React.ReactNode) {
	return (
		<div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
			<span>{text}</span>
			<div style={{ position: 'relative' }}>
				<PlatformIndicator user={user} style={{ position: 'absolute', top: '-8px', right: '-10px' }} />
			</div>
		</div>
	);
}

function triggerVoiceNotification(userId: string, userChannelId: string | null, watchOnly = false) {
	const user = UserStore.getUser(userId);
	const myChanId = SelectedChannelStore.getVoiceChannelId();
	const displayName = user.globalName ?? user.username;
	const title = `${displayName} changed voice status`;

	if (userChannelId) {
		if (userChannelId !== myChanId) {
			const voice = resolveVoiceContext(userChannelId);
			const body =
				voice?.channelName ?
					voice.guildName ?
						`Joined ${voice.channelName} in ${voice.guildName}`
					:	`Joined ${voice.channelName}`
				:	'Joined a voice channel';

			recordVoiceEntry({
				kind: 'voice-join',
				userId,
				username: user.username ?? userId,
				displayName,
				avatarUrl: user.getAvatarURL(void 0, 80, true),
				current: voice?.channelName ?? userChannelId,
				previous: null,
				voice,
				watchOnly,
			});

			if (!watchOnly)
				showNotification({
					title,
					body,
					noPersist: !settings.store.persistNotifications,
					richBody: getRichBody(user, body),
					icon: user.getAvatarURL(void 0, 80, true),
					color: '#43b581',
				});
		}
	} else {
		const voice = resolveVoiceContext(myChanId ?? null);
		const body =
			voice?.channelName ?
				voice.guildName ?
					`Left ${voice.channelName} in ${voice.guildName}`
				:	`Left ${voice.channelName}`
			:	'Left a voice channel';

		recordVoiceEntry({
			kind: 'voice-leave',
			userId,
			username: user.username ?? userId,
			displayName,
			avatarUrl: user.getAvatarURL(void 0, 80, true),
			current: null,
			previous: voice?.channelName ?? myChanId,
			voice,
			watchOnly,
		});

		if (!watchOnly)
			showNotification({
				title,
				body,
				noPersist: !settings.store.persistNotifications,
				richBody: getRichBody(user, body),
				icon: user.getAvatarURL(void 0, 80, true),
				color: '#f04747',
			});
	}
}

interface UserContextProps {
	channel?: Channel;
	guildId?: string;
	user: User;
}

export const UserContext: NavContextMenuPatchCallback = (children, { user }: UserContextProps) => {
	if (!user || user.id === UserStore.getCurrentUser().id) return;
	const isNotifyOn = getUserIdList().includes(user.id);
	const isWatchlisted = getWatchlistUserIdList().includes(user.id);
	const label = isNotifyOn ? "Don't Notify on Changes" : 'Notify on Changes';
	const icon = isNotifyOn ? NotificationsOffIcon : NotificationsOnIcon;

	children.splice(
		-1,
		0,
		<Menu.MenuGroup>
			{!isWatchlisted && (
				<Menu.MenuItem
					id="toggle-notify-user"
					label={label}
					action={() => toggleUserNotify(user.id)}
					icon={icon}
					leadingAccessory={{ type: 'icon', icon: icon }}
				/>
			)}
			{!isNotifyOn && (
				<Menu.MenuItem
					id="toggle-notify-watchlist-user"
					label={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
					action={() => toggleUserWatchlist(user.id)}
					leadingAccessory={{ type: 'icon', icon: isWatchlisted ? WatchlistRemoveIcon : WatchlistAddIcon }}
				/>
			)}
		</Menu.MenuGroup>,
	);
};

const lastStatuses = new Map<string, string>();
const lastPlatformSnapshots = new Map<string, string>();
const lastGames = new Map<string, string | null>();
const lastActivities = new Map<string, PresenceUpdate['activities'][number] | null>();

function getGameActivityLabel(activities: PresenceUpdate['activities']) {
	const gameActivity = activities.find((activity) => activity.type === 0);
	if (!gameActivity) return null;

	return gameActivity.state ?? gameActivity.details ?? gameActivity.name ?? null;
}

function getPlatformSnapshot(clientStatus: NonNullable<PresenceUpdate['clientStatus']>) {
	return Object.entries(clientStatus)
		.map(([platform, platformStatus]) => ({ platform, status: platformStatus }))
		.sort((a, b) => a.platform.localeCompare(b.platform));
}

export const flux = {
	VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[] }) {
		const userIds = getUserIdList();
		const watchlistUserIds = getWatchlistUserIdList();
		if (!userIds.length && !watchlistUserIds.length) return;

		for (const { userId, channelId, oldChannelId } of voiceStates) {
			if (channelId !== oldChannelId) {
				const isWatchOnly = watchlistUserIds.includes(userId);
				const isFollowed = userIds.includes(userId) || isWatchOnly;
				if (!isFollowed || (!isWatchOnly && !settings.store.notifyVoice)) continue;

				if (channelId) {
					triggerVoiceNotification(userId, channelId, isWatchOnly);
				} else if (oldChannelId) {
					triggerVoiceNotification(userId, null, isWatchOnly);
				}
			}
		}
	},
	PRESENCE_UPDATES({ updates }: { updates: PresenceUpdate[] }) {
		const userIds = getUserIdList();
		const watchlistUserIds = getWatchlistUserIdList();
		if (!userIds.length && !watchlistUserIds.length) return;

		for (const {
			user: { id: userId, username },
			status,
			clientStatus,
			activities,
		} of updates) {
			const isWatchOnly = watchlistUserIds.includes(userId);
			const isFollowed = userIds.includes(userId) || isWatchOnly;
			if (!isFollowed) continue;

			if (!clientStatus) {
				continue;
			}
			const platformSnapshot = getPlatformSnapshot(clientStatus);
			const platformSnapshotKey = JSON.stringify(platformSnapshot);
			const statusChanged = lastStatuses.has(userId) && lastStatuses.get(userId) !== status;
			const platformChanged =
				lastPlatformSnapshots.has(userId) && lastPlatformSnapshots.get(userId) !== platformSnapshotKey;

			if ((settings.store.notifyStatus || isWatchOnly) && (statusChanged || platformChanged)) {
				const user = UserStore.getUser(userId);
				const name = user.globalName || user.username || username || user.id;

				recordStatusEntry(
					userId,
					user.username ?? username ?? user.id,
					name,
					status,
					lastStatuses.get(userId) ?? null,
					user.getAvatarURL(void 0, 80, true),
					platformSnapshot,
					isWatchOnly,
				);

				if (!isWatchOnly && statusChanged)
					showNotification({
						title: `${name} changed status`,
						body: `They are now ${status}`,
						noPersist: !settings.store.persistNotifications,
						richBody: getRichBody(user, `${name}'s status is now ${status}`),
						icon: user.getAvatarURL(void 0, 80, true),
						color: getStatusColor(status),
					});
				else if (!isWatchOnly && platformChanged)
					showNotification({
						title: `${name} changed platform`,
						body: `${name}'s connected platforms changed`,
						noPersist: !settings.store.persistNotifications,
						richBody: getRichBody(user, `${name}'s connected platforms changed`),
						icon: user.getAvatarURL(void 0, 80, true),
						color: '#5865f2',
					});
			}
			lastStatuses.set(userId, status);
			lastPlatformSnapshots.set(userId, platformSnapshotKey);

			const game = getGameActivityLabel(activities);
			const previousGame = lastGames.get(userId) ?? null;
			const currentActivity = activities.find((activity) => activity.type === 0) ?? null;
			const previousActivity = lastActivities.get(userId) ?? null;
			if ((settings.store.notifyGameActivityChange || isWatchOnly) && lastGames.has(userId) && previousGame !== game) {
				const user = UserStore.getUser(userId);
				const name = user.globalName || user.username || username || user.id;

				recordGameEntry(
					userId,
					user.username ?? username ?? user.id,
					name,
					currentActivity,
					previousActivity,
					user.getAvatarURL(void 0, 80, true),
					isWatchOnly,
				);

				if (!isWatchOnly && settings.store.showGameActivityChangeNotification) {
					showNotification({
						title: `${name} changed game activity`,
						body:
							game ? `They are now playing ${game}`
							: previousGame ? `They stopped playing ${previousGame}`
							: 'They stopped playing a game',
						noPersist: !settings.store.persistNotifications,
						richBody: getRichBody(
							user,
							game ? `${name} is now playing ${game}` : `${name} stopped playing ${previousGame ?? 'a game'}`,
						),
						icon: user.getAvatarURL(void 0, 80, true),
						color: game ? '#5865f2' : '#747f8d',
					});
				}
			}
			lastGames.set(userId, game);
			lastActivities.set(userId, currentActivity);
		}
	},
};
