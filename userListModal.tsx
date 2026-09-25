/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { RenderModalProps } from '@vencord/discord-types';
import { findStoreLazy } from '@webpack';
import { Button, Constants, Forms, Modal, openModal, React, RestAPI, TextInput, UserStore } from '@webpack/common';

import { HistoryEntry, useHistory } from './history';
import { settings } from './settings';

const GuildStore = findStoreLazy('GuildStore') as {
	getGuilds(): Record<string, { id: string }>;
};

type ManagedUser = {
	id: string;
	username: string;
	displayName: string;
	avatarUrl?: string;
};

type DiscordUser = {
	id: string;
	username: string;
	global_name?: string;
	avatar?: string | null;
};

type DiscordMember = {
	user?: DiscordUser;
	nick?: string | null;
};

export function openUserListModal() {
	openModal((modalProps) => <UserListModal {...modalProps} />);
}

function getIds(setting: 'userIds' | 'watchlistUserIds') {
	return settings.store[setting]
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);
}

function getManagedUsers(ids: string[], history: HistoryEntry[]) {
	return ids.map((id) => {
		const user = UserStore.getUser(id);
		const historyEntry = history.find((entry) => entry.userId === id);
		return {
			id,
			username: user?.username ?? historyEntry?.username ?? 'Unknown user',
			displayName: user?.globalName ?? historyEntry?.displayName ?? 'Unknown user',
			avatarUrl: user?.getAvatarURL(void 0, 64, true) ?? historyEntry?.avatarUrl,
		};
	});
}

function userFromDiscord(user: DiscordUser, displayName = user.global_name ?? user.username): ManagedUser {
	return {
		id: user.id,
		username: user.username,
		displayName,
		avatarUrl: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64` : undefined,
	};
}

async function searchDiscordUsers(query: string): Promise<ManagedUser[]> {
	if (/^\d{15,25}$/.test(query)) {
		const response = await RestAPI.get({ url: Constants.Endpoints.USER(query) });
		return [userFromDiscord(response.body as DiscordUser)];
	}

	const guilds = Object.values(GuildStore.getGuilds());
	if (!guilds.length) return [];

	const responses = await Promise.all(
		guilds.map(async (guild) => {
			try {
				const response = await RestAPI.get({
					url: `/guilds/${guild.id}/members/search?query=${encodeURIComponent(query)}&limit=100`,
				});
				return response.body as DiscordMember[];
			} catch {
				return [];
			}
		}),
	);

	const users = new Map<string, ManagedUser>();
	for (const member of responses.flat()) {
		if (!member.user || users.has(member.user.id)) continue;
		users.set(member.user.id, userFromDiscord(member.user, member.nick ?? undefined));
	}
	return [...users.values()];
}

function UserListModal(props: RenderModalProps) {
	const history = useHistory();

	return (
		<Modal {...props} size="xl" title="Manage notify users">
			<UserListSettings history={history} />
		</Modal>
	);
}

function UserListSettings({ history }: { history: HistoryEntry[] }) {
	const [, refresh] = React.useReducer((value) => value + 1, 0);
	const [query, setQuery] = React.useState('');
	const [searchResults, setSearchResults] = React.useState<ManagedUser[]>([]);
	const [searching, setSearching] = React.useState(false);
	const [searchError, setSearchError] = React.useState<string>();
	const [selected, setSelected] = React.useState<Set<string>>(new Set());
	const notifyIds = getIds('userIds');
	const watchlistIds = getIds('watchlistUserIds');
	const managedIds = new Set([...notifyIds, ...watchlistIds]);

	React.useEffect(() => {
		const search = query.trim();
		if (search.length < 2) {
			setSearchResults([]);
			setSearchError(undefined);
			setSearching(false);
			return;
		}

		let active = true;
		setSearching(true);
		setSearchError(undefined);
		void searchDiscordUsers(search)
			.then((users) => {
				if (!active) return;
				setSearchResults(users.filter((user) => !managedIds.has(user.id)).slice(0, 20));
				setSearching(false);
			})
			.catch(() => {
				if (!active) return;
				setSearchResults([]);
				setSearching(false);
				setSearchError('Discord search failed. Try a different query or paste a user ID.');
			});

		return () => {
			active = false;
		};
	}, [query, settings.store.userIds, settings.store.watchlistUserIds]);

	function updateList(setting: 'userIds' | 'watchlistUserIds', ids: string[]) {
		settings.store[setting] = ids.join(',');
		setSelected(new Set());
		refresh();
	}

	function addUser(userId: string, setting: 'userIds' | 'watchlistUserIds') {
		if (!/^\d{15,25}$/.test(userId) || managedIds.has(userId)) return;
		updateList(setting, [...getIds(setting), userId]);
	}

	function removeSelected(setting: 'userIds' | 'watchlistUserIds') {
		updateList(
			setting,
			getIds(setting).filter((id) => !selected.has(id)),
		);
	}

	return (
		<div className="notify-user-settings">
			<Forms.FormTitle tag="h3">Notify and watchlist users</Forms.FormTitle>
			<Forms.FormText>Search Discord members or paste a Discord user ID, then add them to one list.</Forms.FormText>
			<TextInput value={query} onChange={setQuery} placeholder="Search username or user ID..." />
			<div className="notify-user-recommendations">
				{searching ?
					<Forms.FormText>Searching Discord...</Forms.FormText>
				: searchError ?
					<Forms.FormText>{searchError}</Forms.FormText>
				: query.trim().length >= 2 && !searchResults.length ?
					<Forms.FormText>No Discord users found.</Forms.FormText>
				:	searchResults.map((user) => (
						<div className="notify-user-recommendation" key={user.id}>
							<UserRow user={user} />
							<Button size={Button.Sizes.SMALL} onClick={() => addUser(user.id, 'userIds')}>
								Notify
							</Button>
							<Button size={Button.Sizes.SMALL} onClick={() => addUser(user.id, 'watchlistUserIds')}>
								Watchlist
							</Button>
						</div>
					))
				}
			</div>
			<div className="notify-user-add-id">
				<Button
					size={Button.Sizes.SMALL}
					disabled={!/^\d{15,25}$/.test(query.trim())}
					onClick={() => addUser(query.trim(), 'userIds')}
				>
					Add ID to notify
				</Button>
				<Button
					size={Button.Sizes.SMALL}
					disabled={!/^\d{15,25}$/.test(query.trim())}
					onClick={() => addUser(query.trim(), 'watchlistUserIds')}
				>
					Add ID to watchlist
				</Button>
			</div>
			<div className="notify-user-lists">
				<UserList
					title="Notify users"
					users={getManagedUsers(notifyIds, history)}
					selected={selected}
					setSelected={setSelected}
					onRemove={() => removeSelected('userIds')}
				/>
				<UserList
					title="Watchlist users"
					users={getManagedUsers(watchlistIds, history)}
					selected={selected}
					setSelected={setSelected}
					onRemove={() => removeSelected('watchlistUserIds')}
				/>
			</div>
		</div>
	);
}

function UserRow({ user }: { user: ManagedUser }) {
	return (
		<div className="notify-user-row">
			{user.avatarUrl ?
				<img src={user.avatarUrl} alt="" className="notify-user-avatar" />
			:	<div className="notify-user-avatar notify-user-avatar-empty" />}
			<div className="notify-user-name">
				<strong>{user.displayName}</strong>
				<span>@{user.username}</span>
				<small>{user.id}</small>
			</div>
		</div>
	);
}

function UserList({
	title,
	users,
	selected,
	setSelected,
	onRemove,
}: {
	title: string;
	users: ManagedUser[];
	selected: Set<string>;
	setSelected: (value: Set<string>) => void;
	onRemove(): void;
}) {
	return (
		<section className="notify-user-list">
			<div className="notify-user-list-header">
				<Forms.FormTitle tag="h4">
					{title} ({users.length})
				</Forms.FormTitle>
				<Button
					color={Button.Colors.RED}
					size={Button.Sizes.SMALL}
					disabled={!users.some((user) => selected.has(user.id))}
					onClick={onRemove}
				>
					Remove selected
				</Button>
			</div>
			{users.length ?
				users.map((user) => (
					<label className="notify-user-list-item" key={user.id}>
						<input
							type="checkbox"
							checked={selected.has(user.id)}
							onChange={() => {
								const next = new Set(selected);
								next.has(user.id) ? next.delete(user.id) : next.add(user.id);
								setSelected(next);
							}}
						/>
						<span className="notify-user-checkbox" aria-hidden="true" />
						<UserRow user={user} />
					</label>
				))
			:	<Forms.FormText>No users added.</Forms.FormText>}
		</section>
	);
}
