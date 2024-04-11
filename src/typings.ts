import { constructor } from "tsyringe/dist/typings/types/index.js";

export type BlockedWordEntry = {
    phrase: string;
    options: {
        useRegex: boolean;
    };
};

export type Observable = (mutationList: MutationRecord[], observer: MutationObserver) => void;

export type ObserverRunnable = {
    method: Observable;
    context: constructor<unknown>;
};

export type Action = () => void;

export type ModalOptions = {
    title: string;
    body: () => Promise<string> | string;
    footer?: string;
    modalBodyStyle?: { [style: string]: string };
    modalContentStyle?: { [style: string]: string };
    id?: string;
};
