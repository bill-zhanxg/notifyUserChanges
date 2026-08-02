/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Tooltip } from "@webpack/common";
import desktopIcon from "file://platformIndicators/icons/desktopIcon.svg?minify";
import embeddedIcon from "file://platformIndicators/icons/embeddedIcon.svg?minify";
import mobileIcon from "file://platformIndicators/icons/mobileIcon.svg?minify";
import webIcon from "file://platformIndicators/icons/webIcon.svg?minify";

import { getStatusColor, PlatformSnapshot } from "./history";

const platformIcons = {
    desktop: desktopIcon,
    web: webIcon,
    mobile: mobileIcon,
    embedded: embeddedIcon,
    console: embeddedIcon,
};

function getPlatformLabel(platform: string) {
    if (platform === "embedded" || platform === "console") return "Console";
    return platform[0].toUpperCase() + platform.slice(1);
}

export function HistoryPlatformIndicators({ platforms }: { platforms: NonNullable<PlatformSnapshot[]>; }) {
    if (!platforms.length) return null;

    return (
        <div className="notify-history-platforms">
            {platforms.map(({ platform, status }) => {
                const icon = platformIcons[platform as keyof typeof platformIcons] ?? desktopIcon;

                return (
                    <Tooltip key={platform} text={`${getPlatformLabel(platform)} • ${status}`}>
                        {tooltipProps => (
                            <span {...tooltipProps} className="notify-history-platform-pill" style={{ borderColor: getStatusColor(status) }}>
                                <img
                                    className="notify-history-platform-icon"
                                    src={"data:image/svg+xml;utf8," + encodeURIComponent(icon.replace("#123456", getStatusColor(status)))}
                                    alt=""
                                />
                                <span>{getPlatformLabel(platform)}</span>
                                <span className="notify-history-platform-status">{status}</span>
                            </span>
                        )}
                    </Tooltip>
                );
            })}
        </div>
    );
}
