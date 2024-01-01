import "obsidian"

declare module "obsidian" {
    interface App {
        appId?: string;
    }
}
