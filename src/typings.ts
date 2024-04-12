export type storeKeys = "blockedWords" | "audit";

export type BlockedWordEntry = {
    phrase: string;
    options: {
        useRegex: boolean;
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
