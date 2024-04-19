import { UiBuilder } from "./UiBuilder.js";
import { LocalStoreManager } from "./managers/LocalStoreManager.js";
import { BlockedWordEntry } from "./typings.js";
import { TwitterPostEvent } from "./decorators/TwitterPostEvent.js";
import { PageInterceptor } from "./PageInterceptor.js";
import { DomUtil, getSelectorForPage, waitForElm } from "./Utils.js";
import { TwitterMutator } from "./TwitterMutator.js";
import "./css/modal.css";
import "./css/switch.css";
import "./css/main.css";
import { Observable } from "./Observable.js";

export class TwitterPostObserver implements Observable {
    private static instance: TwitterPostObserver;
    private readonly uiBuilder: UiBuilder = UiBuilder.getInstance();
    private readonly localStoreManager: LocalStoreManager = LocalStoreManager.getInstance();
    private twitterMutator!: TwitterMutator;

    private constructor() {}

    public static async getInstance(): Promise<TwitterPostObserver> {
        if (!TwitterPostObserver.instance) {
            TwitterPostObserver.instance = new TwitterPostObserver();
            await TwitterPostObserver.instance.init();
            TwitterPostObserver.instance.twitterMutator = await TwitterMutator.getInstance();
        }
        return TwitterPostObserver.instance;
    }

    private regexPhraseCache: Map<string, RegExp> = new Map();

    private removeElm(blockedWordEntry: BlockedWordEntry, elms: Element[]): void {
        for (const elm of elms) {
            const e = elm as HTMLElement;
            if (blockedWordEntry.options.useOverlay) {
                this.uiBuilder.injectOverlay(e, blockedWordEntry.phrase);
            } else {
                e.style.display = "none";
            }
        }
    }

    private async processMuteMap(muteMap: Map<BlockedWordEntry, Element[]>): Promise<void> {
        const pArr: Promise<void>[] = [];
        for (const [entry, elements] of muteMap) {
            this.removeElm(entry, elements);
            pArr.push(this.localStoreManager.incrementBlockedWordAudit(entry.phrase));
        }
        await Promise.all(pArr);
    }

    private findMatchingBlockPhrase(
        tweetText: string,
        allBlockedWords: BlockedWordEntry[],
        testId?: string,
    ): BlockedWordEntry | null {
        for (const blockedWord of allBlockedWords) {
            const { phrase, options } = blockedWord;
            const { useRegex, filterUsername } = options;
            if (testId === "User-Name" && !filterUsername) {
                return null;
            }
            if (useRegex) {
                let regExp = this.regexPhraseCache.get(phrase);
                if (!regExp) {
                    regExp = new RegExp(phrase, "mi");
                    this.regexPhraseCache.set(phrase, regExp);
                }
                if (regExp.test(tweetText)) {
                    return blockedWord;
                }
            } else if (tweetText.includes(phrase)) {
                return blockedWord;
            }
        }
        return null;
    }

    private shouldRemove(el: HTMLElement, allBlockedWords: BlockedWordEntry[]): [boolean, BlockedWordEntry | null] {
        if (!allBlockedWords || allBlockedWords.length === 0) {
            return [false, null];
        }
        const tweetTexts = el.querySelectorAll("[data-testid='tweetText']");
        const username = el.querySelectorAll("[data-testid='User-Name']");
        const elements = Array.from(tweetTexts).concat(Array.from(username)) as HTMLElement[];
        for (const tweet of elements) {
            const dataset = tweet.dataset;
            let content: string | null;
            if (tweet.dataset.testid === "User-Name") {
                content = tweet.querySelector("a")?.href?.split("/")?.pop() ?? null;
            } else {
                content = tweet.textContent;
            }
            if (content) {
                const matchedPhrase = this.findMatchingBlockPhrase(content, allBlockedWords, dataset.testid);
                if (matchedPhrase) {
                    return [true, matchedPhrase];
                }
            }
        }
        return [false, null];
    }

    @TwitterPostEvent
    public async observe(mutationList: MutationRecord[], observer: MutationObserver): Promise<void> {
        const allBlockedWords = await this.localStoreManager.getAllStoredWords();

        // collection of how many elements a phrase muted
        const muteMap: Map<BlockedWordEntry, Element[]> = new Map();
        for (const mutationRecord of mutationList) {
            for (let i = 0; i < mutationRecord.addedNodes.length; i++) {
                const removedNode = mutationRecord.addedNodes[i] as HTMLElement;
                this.populateMuteMap(removedNode, allBlockedWords, muteMap);
            }
        }
        await this.processMuteMap(muteMap);
    }

    private populateMuteMap(
        removedNode: HTMLElement,
        allBlockedWords: BlockedWordEntry[],
        muteMap: Map<BlockedWordEntry, Element[]>,
    ): void {
        const [shouldRemove, entry] = this.shouldRemove(removedNode, allBlockedWords);
        if (shouldRemove) {
            if (muteMap.has(entry!)) {
                muteMap.get(entry!)?.push(removedNode);
            } else {
                muteMap.set(entry!, [removedNode]);
            }
        }
    }

    private async init(): Promise<void> {
        const pageInterceptor = PageInterceptor.getInstance();

        pageInterceptor.addAction(async () => {
            const allBlockedWords = await this.localStoreManager.getAllStoredWords();
            if (allBlockedWords.length === 0) {
                this.twitterMutator.closeMutators();
                return;
            }
            await this.twitterMutator.init();
            await this.loadPage();
        });

        await this.loadPage();
        pageInterceptor.addAction(async () => {
            const page = window.location.pathname.split("/").pop();
            if (page !== "mute_and_block") {
                return;
            }
            const anchor = this.uiBuilder.buildOption();
            if (!anchor) {
                return;
            }
            const insertAfter = await waitForElm("a[href='/settings/muted_keywords']");
            if (!insertAfter) {
                return;
            }
            insertAfter.after(anchor);
            const modal = await this.buildModal();
            anchor.addEventListener("click", () => {
                DomUtil.openModal(modal);
            });
        });
    }

    private async buildModal(): Promise<HTMLElement> {
        const [modal, exists] = await this.uiBuilder.getEditor(blockedWords => {
            // no point listening for mutation events if there are no words to block
            if (blockedWords.length === 0) {
                this.twitterMutator.closeMutators();
            }
        });
        if (!exists) {
            const el: HTMLElement = document.body;
            el.insertAdjacentElement("beforeend", modal);
        }
        return modal;
    }

    private async loadPage(): Promise<void> {
        const allBlockedWords = await this.localStoreManager.getAllStoredWords();
        if (allBlockedWords.length === 0) {
            return;
        }
        const selectorToLoad = getSelectorForPage();
        const timelineContainer = await waitForElm(selectorToLoad);
        if (!timelineContainer) {
            return;
        }
        if (!timelineContainer.children) {
            return;
        }
        const muteMap: Map<BlockedWordEntry, Element[]> = new Map();
        for (let i = 0; i < timelineContainer.children.length; i++) {
            const chatItem = timelineContainer.children[i] as HTMLElement;
            this.populateMuteMap(chatItem, allBlockedWords, muteMap);
        }
        await this.processMuteMap(muteMap);
    }
}

await TwitterPostObserver.getInstance();
