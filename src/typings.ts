export type storeKeys = "blockedWords" | "audit" | "globalSettings";

export enum SETTING {
    USERNAME = "username",
}

export type GlobalSettings = Record<storeKeys, Record<SETTING, string>>;

export type BlockedWordEntry = {
    phrase: string;
    options: {
        useRegex: boolean;
        useOverlay: boolean;
        filterUsername: boolean;
    };
};

export type BlockedWordAudit = Record<string, number>;

export type Action = () => void;

export type ModalOptions = {
    title: string;
    body: () => Promise<string> | string;
    footer?: string;
    modalBodyStyle?: { [style: string]: string };
    modalContentStyle?: { [style: string]: string };
    id?: string;
};

export type Constructor<T> = {
    new (...args: unknown[]): T;
};
