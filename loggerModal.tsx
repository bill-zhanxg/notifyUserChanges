/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import './style.css';

import { Card } from '@components/Card';
import { classes } from '@utils/misc';
import { RenderModalProps } from '@vencord/discord-types';
import { Button, ConfirmModal, Forms, Modal, openModal, React, Select, TextInput, Tooltip } from '@webpack/common';

import {
	clearHistory,
	formatHistoryTimestamp,
	getKindLabel,
	getKindTone,
	HistoryEntry,
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

function KindBadge({ kind }: { kind: NotificationKind }) {
	return (
		<span className={classes('notify-history-badge', `notify-history-badge-${getKindTone(kind)}`)}>
			{getKindLabel(kind)}
		</span>
	);
}

function renderCompactMeta(entry: HistoryEntry) {
	const hiddenMeta = [
		entry.previous ? `Previous: ${entry.previous}` : null,
		entry.current ? `Current: ${entry.current}` : null,
		entry.voice?.channelId ? `Channel ID: ${entry.voice.channelId}` : null,
		entry.voice?.guildId ? `Server ID: ${entry.voice.guildId}` : null,
	]
		.filter(Boolean)
		.join('\n');

	if (!hiddenMeta) return null;

	return (
		<Tooltip text={hiddenMeta}>
			{(tooltipProps) => (
				<span {...tooltipProps} className="notify-history-compact-meta">
					More details
				</span>
			)}
		</Tooltip>
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
							<span className="notify-history-time">{formatHistoryTimestamp(entry.timestamp)}</span>
						</div>
						<div className="notify-history-card-subtitle">{entry.title}</div>
						<div className="notify-history-card-summary">
							<span>{entry.body}</span>
							{entry.kind === 'status' && entry.platformSnapshot?.length ?
								<div>
									<HistoryPlatformIndicators platforms={entry.platformSnapshot} />
								</div>
							:	null}
						</div>

						{entry.kind === 'voice-join' || entry.kind === 'voice-leave' ?
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
						:	null}

						{entry.kind === 'game' ?
							<div className="notify-history-game-meta">
								<div className="notify-history-game-copy">
									<span className="notify-history-game-name">
										{entry.activityTitle ?? entry.activity?.name ?? entry.displayName}
									</span>
									<span className="notify-history-game-summary">{entry.activitySummary ?? entry.body}</span>
									<div className="notify-history-game-flags">
										{entry.activity?.details ?
											<span>{entry.activity.details}</span>
										:	null}
										{entry.activity?.state ?
											<span>{entry.activity.state}</span>
										:	null}
										{entry.activity?.timestamps?.start ?
											<span>Started {formatHistoryTimestamp(entry.activity.timestamps.start)}</span>
										:	null}
									</div>
								</div>
								{entry.activityThumbnail ?
									<img src={entry.activityThumbnail} alt="" className="notify-history-game-thumb" />
								:	null}
							</div>
						:	null}

						{renderCompactMeta(entry)}
					</div>
				</div>
			</div>
		</Card>
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
	const [kindFilter, setKindFilter] = React.useState<'all' | NotificationKind>('all');
	const [sort, setSort] = React.useState<'newest' | 'oldest'>('newest');
	const [page, setPage] = React.useState(0);
	const [eventsPerPage, setEventsPerPage] = React.useState(() => sanitizeEventsPerPage(settings.store.eventsPerPage));

	const filtered = React.useMemo(() => {
		const search = query.trim().toLowerCase();
		const rows = history.filter((entry) => {
			if (kindFilter !== 'all' && entry.kind !== kindFilter) return false;
			if (!search) return true;

			return [
				entry.username,
				entry.displayName,
				entry.title,
				entry.body,
				entry.previous ?? '',
				entry.current ?? '',
				getKindLabel(entry.kind),
			].some((value) => value.toLowerCase().includes(search));
		});

		rows.sort((a, b) => (sort === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp));
		return rows;
	}, [history, query, kindFilter, sort]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / eventsPerPage));
	const clampedPage = Math.min(page, totalPages - 1);
	const pageStart = clampedPage * eventsPerPage;
	const pageEntries = React.useMemo(
		() => filtered.slice(pageStart, pageStart + eventsPerPage),
		[filtered, pageStart, eventsPerPage],
	);

	React.useEffect(() => {
		setPage(0);
	}, [query, kindFilter, sort, eventsPerPage]);

	React.useEffect(() => {
		if (page !== clampedPage) {
			setPage(clampedPage);
		}
	}, [page, clampedPage]);

	const setEventsPerPageSetting = React.useCallback((value: number) => {
		const next = sanitizeEventsPerPage(value);
		settings.store.eventsPerPage = next;
		setEventsPerPage(next);
	}, []);

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
						<h3 className="notify-history-heading">Searchable history with visual event cards</h3>
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
							value={kindFilter}
							onChange={(value) => setKindFilter(value as typeof kindFilter)}
							placeholder="Event type"
							options={[
								{ label: 'All events', value: 'all' },
								{ label: 'Status changes', value: 'status' },
								{ label: 'Game activity', value: 'game' },
								{ label: 'Voice joins', value: 'voice-join' },
								{ label: 'Voice leaves', value: 'voice-leave' },
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
Button;
