/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { SVGProps } from 'react';

export function WatchlistAddIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 16 16" fill="#000000">
			<path fill="currentColor" d="M16 2h-2V0h-2v2h-2v2h2v2h2V4h2z" />
			<path
				fill="currentColor"
				d="M13.498 6.969c.288.32.55.665.782 1.031a7.594 7.594 0 0 1-2.335 2.348a7.326 7.326 0 0 1-7.889 0A7.626 7.626 0 0 1 1.721 8a7.594 7.594 0 0 1 2.52-2.462A4 4 0 1 0 12 6.907v-.032a4.002 4.002 0 0 1-2.999-3.817A8.94 8.94 0 0 0 8 3.001c-3.489 0-6.514 2.032-8 5c1.486 2.968 4.511 5 8 5s6.514-2.032 8-5a9.217 9.217 0 0 0-.979-1.548a3.973 3.973 0 0 1-1.523.517zM6.5 5a1.5 1.5 0 1 1-.001 3.001A1.5 1.5 0 0 1 6.5 5z"
			/>
		</svg>
	);
}

export function WatchlistRemoveIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 16 16">
			<path fill="currentColor" d="M10 2h6v2h-6V2z" />
			<path
				fill="currentColor"
				d="M13.599 5H9V3.056A8.923 8.923 0 0 0 8 3C4.511 3 1.486 5.032 0 8c1.486 2.968 4.511 5 8 5s6.514-2.032 8-5a9.173 9.173 0 0 0-2.401-3zM6.5 5a1.5 1.5 0 1 1-.001 3.001A1.5 1.5 0 0 1 6.5 5zm5.444 5.348a7.326 7.326 0 0 1-7.889 0A7.626 7.626 0 0 1 1.72 8a7.594 7.594 0 0 1 2.52-2.462a4 4 0 1 0 7.518 0A7.615 7.615 0 0 1 14.278 8a7.594 7.594 0 0 1-2.335 2.348z"
			/>
		</svg>
	);
}
