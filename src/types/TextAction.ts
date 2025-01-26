export enum TextAction {
    EXPLAIN = 'explain',
    IMPROVE = 'improve',
    COPY = 'copy',
    EDIT = 'edit'
}

export type TextActionHandler = (text: string) => void;

export type TextActionConfig = {
    [key in TextAction]?: {
        label: string;
        icon?: string;
        handler: TextActionHandler;
    }
}
