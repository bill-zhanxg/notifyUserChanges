/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import './style.css';

import { Card } from '@components/Card';
import { copyToClipboard } from '@utils/clipboard';
import { classes } from '@utils/misc';
import { RenderModalProps } from '@vencord/discord-types';
import {
	ApplicationAssetUtils,
	Button,
	ConfirmModal,
	Forms,
	Modal,
	openModal,
	React,
	Select,
	TextInput,
	Tooltip,
} from '@webpack/common';

import {
	clearHistory,
	formatHistoryTimestamp,
	formatHistoryTimestampTooltip,
	getKindLabel,
	getKindTone,
	HistoryEntry,
	HistoryEntryGame,
	HistoryEntryStatus,
	HistoryEntryVoice,
	NotificationKind,
	useHistory,
} from './history';
import { HistoryPlatformIndicators } from './historyPlatformIndicators';
import { settings } from './settings';

const DEFAULT_EVENTS_PER_PAGE = 100;

function sanitizeEventsPerPage(value: number) {
	const parsed = Number.isFinite(value) ? Math.floor(value) : DEFAULT_EVENTS_PER_PAGE;
	return Math.max(1, Math.min(500, parsed));
}

function FilterSelect<T extends string | number>({
	value,
	onChange,
	options,
	placeholder,
}: {
	value: T;
	onChange(value: T): void;
	options: { label: string; value: T }[];
	placeholder: string;
}) {
	return (
		<Select
			placeholder={placeholder}
			options={options}
			maxVisibleItems={6}
			closeOnSelect={true}
			select={onChange}
			isSelected={(option) => option === value}
			serialize={(option) => String(option)}
		/>
	);
}

export function openStatusLoggerModal() {
	openModal((modalProps) => <HistoryModal {...modalProps} />);
}

export function StatusLoggerSettingsButton() {
	const history = useHistory();

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
			<Forms.FormText>
				Open the status logger to browse, search, filter, and clear the locally stored notification database.
			</Forms.FormText>
			<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
				<Button onClick={openStatusLoggerModal}>Open status logger</Button>
				<Button color={Button.Colors.RED} disabled={!history.length} onClick={clearHistory}>
					Clear history
				</Button>
			</div>
			<Forms.FormText>Current stored entries: {history.length}</Forms.FormText>
		</div>
	);
}

function HistoryModal(props: RenderModalProps) {
	const history = useHistory();
	const [query, setQuery] = React.useState('');
	const [kindFilter, setKindFilter] = React.useState<'all' | 'voice-change' | NotificationKind>('all');
	const [audienceFilter, setAudienceFilter] = React.useState<'all' | 'normal' | 'watchlist'>('normal');
	const [sort, setSort] = React.useState<'newest' | 'oldest'>('newest');
	const [page, setPage] = React.useState(0);
	const eventsPerPage = React.useMemo(() => sanitizeEventsPerPage(settings.store.eventsPerPage), []);

	const filtered = React.useMemo(() => {
		const search = query.trim().toLowerCase();
		const rows = history.filter((entry) => {
			if (audienceFilter === 'watchlist' && !entry.watchOnly) return false;
			if (audienceFilter === 'normal' && entry.watchOnly) return false;
			if (kindFilter === 'voice-change') {
				if (entry.kind !== 'voice-join' && entry.kind !== 'voice-leave') return false;
			} else if (kindFilter !== 'all' && entry.kind !== kindFilter) {
				return false;
			}
			if (!search) return true;

			return [
				entry.username,
				entry.displayName,
				entry.previous ?? '',
				entry.current ?? '',
				getKindLabel(entry.kind),
			].some((value) => value.toLowerCase().includes(search));
		});

		rows.sort((a, b) => (sort === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp));
		return rows;
	}, [history, query, kindFilter, audienceFilter, sort]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / eventsPerPage));
	const clampedPage = Math.min(page, totalPages - 1);
	const pageStart = clampedPage * eventsPerPage;
	const pageEntries = React.useMemo(
		() => filtered.slice(pageStart, pageStart + eventsPerPage),
		[filtered, pageStart, eventsPerPage],
	);

	React.useEffect(() => {
		setPage(0);
	}, [query, kindFilter, audienceFilter, sort, eventsPerPage]);

	React.useEffect(() => {
		if (page !== clampedPage) {
			setPage(clampedPage);
		}
	}, [page, clampedPage]);

	return (
		<Modal
			{...props}
			size="xl"
			title="Status Logger"
			actions={[
				{
					text: 'Clear history',
					variant: 'critical-primary',
					disabled: !history.length,
					onClick() {
						openModal((modalProps) => (
							<ConfirmModal
								{...modalProps}
								title="Clear history?"
								subtitle={`This removes all ${history.length} stored events from the custom database.`}
								confirmText="Clear"
								onConfirm={clearHistory}
							/>
						));
					},
				},
			]}
		>
			<div className="notify-history-root">
				<div className="notify-history-hero">
					<div>
						<Forms.FormText className="notify-history-kicker">Local status database</Forms.FormText>
						<h3 className="notify-history-heading">Notify User History Logs</h3>
						<Forms.FormText className="notify-history-description">
							Every notification is stored locally with the activity snapshot, channel context, and platform state so
							you can review it later without relying on toast history.
						</Forms.FormText>
					</div>
				</div>

				<div className="notify-history-filters">
					<div className="notify-history-search">
						<TextInput
							value={query}
							onChange={setQuery}
							placeholder="Search users, statuses, games, servers, or channels..."
						/>
					</div>
					<div className="notify-history-select">
						<FilterSelect
							value={audienceFilter}
							onChange={(value) => setAudienceFilter(value as typeof audienceFilter)}
							placeholder="User list"
							options={[
								{ label: 'Normal', value: 'normal' },
								{ label: 'All', value: 'all' },
								{ label: 'Watchlist', value: 'watchlist' },
							]}
						/>
					</div>
					<div className="notify-history-select">
						<FilterSelect
							value={kindFilter}
							onChange={(value) => setKindFilter(value as typeof kindFilter)}
							placeholder="Event type"
							options={[
								{ label: 'All events', value: 'all' },
								{ label: 'Status Changes', value: 'status' },
								{ label: 'Activity Changes', value: 'game' },
								{ label: 'Voice Change', value: 'voice-change' },
							]}
						/>
					</div>
					<div className="notify-history-select">
						<FilterSelect
							value={sort}
							onChange={(value) => setSort(value as typeof sort)}
							placeholder="Order"
							options={[
								{ label: 'Newest first', value: 'newest' },
								{ label: 'Oldest first', value: 'oldest' },
							]}
						/>
					</div>
				</div>

				<div className="notify-history-results-container">
					<Forms.FormText className="notify-history-results">
						Showing {filtered.length ? pageStart + 1 : 0}-{Math.min(pageStart + eventsPerPage, filtered.length)} of{' '}
						{filtered.length} filtered events ({history.length} total).
					</Forms.FormText>

					{filtered.length > eventsPerPage ?
						<div className="notify-history-pagination" role="group" aria-label="History pagination">
							<Button
								className="notify-history-page-button"
								disabled={clampedPage === 0}
								onClick={() => setPage((prev) => Math.max(0, prev - 1))}
							>
								&#60;
							</Button>
							<Forms.FormText className="notify-history-page-indicator">
								Page {clampedPage + 1} / {totalPages}
							</Forms.FormText>
							<Button
								className="notify-history-page-button"
								disabled={clampedPage >= totalPages - 1}
								onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
							>
								&#62;
							</Button>
						</div>
					:	null}
				</div>

				{filtered.length ?
					<div className="notify-history-list">
						{pageEntries.map((entry) => (
							<HistoryCard key={entry.id} entry={entry} />
						))}
					</div>
				:	<Forms.FormText>No matching history entries.</Forms.FormText>}
			</div>
		</Modal>
	);
}

function KindBadge({ kind }: { kind: NotificationKind }) {
	return (
		<span className={classes('notify-history-badge', `notify-history-badge-${getKindTone(kind)}`)}>
			{getKindLabel(kind)}
		</span>
	);
}

function HistoryCard({ entry }: { entry: HistoryEntry }) {
	return (
		<Card className={classes('notify-history-card', `notify-history-card-${entry.kind}`)} defaultPadding={false}>
			<div className="notify-history-card-inner">
				<div className="notify-history-card-hero">
					<img src={entry.avatarUrl} alt="" className="notify-history-avatar" />
					<div className="notify-history-card-body">
						<div className="notify-history-card-topline">
							<strong className="notify-history-title">{entry.displayName}</strong>
							<KindBadge kind={entry.kind} />
							<Tooltip text="Copy Raw">
								{(tooltipProps) => (
									<button
										{...tooltipProps}
										className="notify-history-copy-raw"
										onClick={() => void copyToClipboard(JSON.stringify(entry, null, 2))}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="24"
											height="24"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											className="lucide lucide-copy-icon lucide-copy"
										>
											<rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
											<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
										</svg>
									</button>
								)}
							</Tooltip>
							<Tooltip text={formatHistoryTimestampTooltip(entry.timestamp)}>
								{(tooltipProps) => (
									<span {...tooltipProps} className="notify-history-time">
										{formatHistoryTimestamp(entry.timestamp)}
									</span>
								)}
							</Tooltip>
						</div>

						{entry.kind === 'status' ?
							<StatusChangeDisplay entry={entry} />
						:	null}
						{entry.kind === 'voice-join' || entry.kind === 'voice-leave' ?
							<VoiceChangeDisplay entry={entry} />
						:	null}
						{entry.kind === 'game' ?
							<ActivityChangeDisplay entry={entry} />
						:	null}
					</div>
				</div>
			</div>
		</Card>
	);
}

function StatusChangeDisplay({ entry }: { entry: HistoryEntryStatus }) {
	const isPlatformChange = entry.previous === entry.current;
	const getStatusColor = (status: string | null) => {
		if (!status) return 'notify-history-status-unknown';
		const lowerStatus = status.toLowerCase();
		if (lowerStatus === 'online') return 'notify-history-status-online';
		if (lowerStatus === 'idle') return 'notify-history-status-idle';
		if (lowerStatus === 'dnd') return 'notify-history-status-dnd';
		if (lowerStatus === 'invisible' || lowerStatus === 'offline') return 'notify-history-status-offline';
		return 'notify-history-status-unknown';
	};

	return (
		<div className="notify-history-status-container">
			<span className="notify-history-status-text">
				{entry.displayName} changed their {isPlatformChange ? 'platform' : 'status'}
				{!isPlatformChange ?
					<>
						{entry.previous ?
							<>
								{' '}
								from{' '}
								<span className={`notify-history-status-value ${getStatusColor(entry.previous)}`}>
									{entry.previous}
								</span>
							</>
						:	null}{' '}
						to <span className={`notify-history-status-value ${getStatusColor(entry.current)}`}>{entry.current}</span>
					</>
				:	null}
			</span>
			<div className="notify-history-status-platforms">
				<HistoryPlatformIndicators platforms={entry.platformSnapshot} />
			</div>
		</div>
	);
}

function VoiceChangeDisplay({ entry }: { entry: HistoryEntryVoice }) {
	return (
		<>
			<div className="notify-history-card-summary">
				<span>
					{entry.kind === 'voice-join' ?
						entry.voice?.channelName ?
							entry.voice.guildName ?
								<>
									Joined Voice Channel{' '}
									<span className="notify-history-context-label-bold">{entry.voice.channelName}</span> in{' '}
									<span className="notify-history-context-label-bold">{entry.voice.guildName}</span>
								</>
							:	<>
									Joined <span className="notify-history-context-label-bold">{entry.voice.channelName}</span>
								</>

						:	'Joined a voice channel'
					: entry.voice?.channelName ?
						entry.voice.guildName ?
							<>
								Left <span className="notify-history-context-label-bold">{entry.voice.channelName}</span> in{' '}
								<span className="notify-history-context-label-bold">{entry.voice.guildName}</span>
							</>
						:	<>
								Left <span className="notify-history-context-label-bold">{entry.voice.channelName}</span>
							</>

					:	'Left a voice channel'}
				</span>
			</div>

			<div className="notify-history-card-context">
				<span className="notify-history-context-label">{entry.voice?.guildName ?? 'Unknown server'}</span>
				<span className="notify-history-context-separator">•</span>
				<span className="notify-history-context-label">
					{entry.voice?.channelName ?? entry.current ?? 'Unknown channel'}
				</span>
				{entry.voice?.channelId ?
					<Tooltip
						text={`Channel ID: ${entry.voice.channelId}${entry.voice.guildId ? `\nServer ID: ${entry.voice.guildId}` : ''}`}
					>
						{(tooltipProps) => (
							<span {...tooltipProps} className="notify-history-compact-meta">
								Details
							</span>
						)}
					</Tooltip>
				:	null}
			</div>
		</>
	);
}
function ActivityChangeDisplay({ entry }: { entry: HistoryEntryGame }) {
	const largeImage = resolveActivityImage(entry.activity, entry.activity.assets?.large_image);
	const smallImage = resolveActivityImage(entry.activity, entry.activity.assets?.small_image);
	const activityVerb =
		entry.activity.type === 0 ? 'Playing'
		: entry.activity.type === 1 ? 'Streaming'
		: entry.activity.type === 2 ? 'Listening'
		: entry.activity.type === 3 ? 'Watching'
		: entry.activity.type === 5 ? 'Competing'
		: 'Active';
	const smallDetails = [
		entry.activity.assets?.small_text ? `Small text: ${entry.activity.assets.small_text}` : null,
		smallImage ?
			<img key="small-image" src={smallImage} alt="Small activity asset" className="notify-history-game-small-image" />
		:	null,
	].filter(Boolean);

	return (
		<div className={`notify-history-game-meta`}>
			<div className="notify-history-game-info">
				<div className="notify-history-game-header">
					<strong className="notify-history-game-name">{entry.activity.name}</strong>
					<span
						className={`notify-history-game-status ${entry.current ? 'notify-history-game-status-playing' : 'notify-history-game-status-stopped'}`}
					>
						{entry.current ? activityVerb : 'Stopped'}
					</span>
				</div>

				<div className="notify-history-game-details">
					{entry.activity.assets?.large_text ?
						<div className="notify-history-game-detail-row">{entry.activity.assets.large_text}</div>
					:	null}
					{entry.activity.details ?
						<div className="notify-history-game-detail-row">{entry.activity.details}</div>
					:	null}
					{entry.activity.state ?
						<div className="notify-history-game-detail-row">{entry.activity.state}</div>
					:	null}
					{entry.activity.timestamps?.start ?
						<div className="notify-history-game-detail-row">
							Started {formatHistoryTimestamp(entry.activity.timestamps.start)}
						</div>
					:	null}
				</div>

				{smallDetails.length ?
					<Tooltip text={<div className="notify-history-game-tooltip">{smallDetails}</div>}>
						{(tooltipProps) => (
							<span {...tooltipProps} className="notify-history-game-extra-details">
								Extra details
							</span>
						)}
					</Tooltip>
				:	null}
			</div>

			{largeImage ?
				<img
					src={largeImage}
					alt={entry.activity.assets?.large_text ?? 'Activity asset'}
					className="notify-history-game-thumb"
				/>
			:	null}
		</div>
	);
}

function resolveActivityImage(activity: NonNullable<HistoryEntryGame['activity']>, asset: string | undefined) {
	const applicationId = activity.application_id;
	if (!applicationId || !asset) return null;

	if (asset.startsWith('http://') || asset.startsWith('https://')) return asset;
	if (asset.startsWith('mp:')) return `https://media.discordapp.net/${asset.slice(3).replace(/^\/+/, '')}`;

	try {
		return (ApplicationAssetUtils.getAssetImage as (applicationId: string, asset: string) => string | null)(
			applicationId,
			asset,
		);
	} catch {
		return null;
	}
}
