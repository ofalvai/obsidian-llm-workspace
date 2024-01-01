import { createContext } from "preact";
import { App } from "obsidian";
import { LlmPluginSettings } from "main";

export const AppContext = createContext<App | undefined>(undefined);

export const PluginSettingsContext = createContext<
	LlmPluginSettings | undefined
>(undefined);
