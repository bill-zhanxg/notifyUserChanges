/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { UserContext, flux } from "./eventHandlers";
import { openStatusLoggerModal, StatusLoggerSettingsButton } from "./loggerModal";
import { settings } from "./settings";

export default definePlugin({
    name: "NotifyUserChanges",
    description: "Adds a notify option in the user context menu to get notified when a user changes voice channels, online status, or game activity",
    authors: [Devs.Bill],

    settings,

    contextMenus: {
        "user-context": UserContext as NavContextMenuPatchCallback,
    },

    toolboxActions: {
        "Open Status Logger": openStatusLoggerModal,
    },

    flux,

    settingsAboutComponent: StatusLoggerSettingsButton,
});
