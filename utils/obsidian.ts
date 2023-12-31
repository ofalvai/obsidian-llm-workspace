import { createContext, useContext } from "react";
import { App } from "obsidian";
import { LlmPluginSettings } from "main";

export const AppContext = createContext<App | undefined>(undefined);

export const useApp = (): App | undefined => {
	return useContext(AppContext);
};

export const PluginSettingsContext = createContext<LlmPluginSettings | undefined>(undefined);

export const usePluginSettings = (): LlmPluginSettings | undefined => {
	return useContext(PluginSettingsContext);
};
 