import "reflect-metadata";
import { container, singleton } from "tsyringe";
import { UiBuilder } from "./UiBuilder.js";
import { LocalStoreManager } from "./managers/LocalStoreManager.js";
import { BlockedWordEntry } from "./typings.js";
import { TwitterPostEvent } from "./decorators/TwitterPostEvent.js";
import { PostConstruct } from "./decorators/PostConstruct.js";
import { PageInterceptor } from "./PageInterceptor.js";
import { DomUtil, getSelectorForPage, waitForElm } from "./Utils.js";
import { TwitterMutator } from "./TwitterMutator.js";
import "./css/modal.css";
import "./css/switch.css";
import "./css/main.css";
import { Observable } from "./Observable.js";

@singleton()
class TwitterPostObserver implements Observable {
    public constructor(
        private uiBuilder: UiBuilder,
        private localStoreManager: LocalStoreManager,
        private twitterMutator: TwitterMutator,
    ) {}

    private removeElm(elms: Element[]): void {
        for (const elm of elms) {
            (elm as HTMLElement).style.display = "none";
        }
    }

    private async processMuteMap(muteMap: Map<string, Element[]>): Promise<void> {
        const pArr: Promise<void>[] = [];
        for (const [phrase, elements] of muteMap) {
            this.removeElm(elements);
            pArr.push(this.localStoreManager.incrementBlockedWordAudit(phrase));
        }
        await Promise.all(pArr);
    }

    private findMatchingBlockPhrase(tweetText: string, allBlockedWords: BlockedWordEntry[]): string | null {
        for (const blockedWord of allBlockedWords) {
            const { phrase, options } = blockedWord;
            const { useRegex } = options;
            if (useRegex) {
                const regEx = new RegExp(phrase, "gm");
                if (regEx.test(tweetText)) {
                    return phrase;
                }
            } else if (tweetText.includes(phrase)) {
                return phrase;
            }
        }
        return null;
    }

    private shouldRemove(el: HTMLElement, allBlockedWords: BlockedWordEntry[]): [boolean, string | null] {
        if (!allBlockedWords || allBlockedWords.length === 0) {
            return [false, null];
        }
        const tweetTexts = el.querySelectorAll("[data-testid='tweetText']");
        for (const tweet of Array.from(tweetTexts)) {
            const tweetText = tweet.textContent;
            if (tweetText) {
                const matchedPhrase = this.findMatchingBlockPhrase(tweetText, allBlockedWords);
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
        const muteMap: Map<string, Element[]> = new Map();
        for (const mutationRecord of mutationList) {
            if (mutationRecord.type === "childList") {
                for (let i = 0; i < mutationRecord.removedNodes.length; i++) {
                    const removedNode = mutationRecord.removedNodes[i] as HTMLElement;
                    this.populateMuteMap(removedNode, allBlockedWords, muteMap);
                }
            }
        }
        await this.processMuteMap(muteMap);
    }

    private populateMuteMap(
        removedNode: HTMLElement,
        allBlockedWords: BlockedWordEntry[],
        muteMap: Map<string, Element[]>,
    ): void {
        const [shouldRemove, phrase] = this.shouldRemove(removedNode, allBlockedWords);
        if (shouldRemove) {
            const elements = muteMap.get(phrase!) ?? [];
            elements.push(removedNode);
            muteMap.set(phrase!, elements);
        }
    }

    @PostConstruct
    private async init(): Promise<void> {
        const location = window.location.pathname.split("/").pop();
        const pageInterceptor = container.resolve(PageInterceptor);

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
        const muteMap: Map<string, Element[]> = new Map();
        for (let i = 0; i < timelineContainer.children.length; i++) {
            const chatItem = timelineContainer.children[i] as HTMLElement;
            this.populateMuteMap(chatItem, allBlockedWords, muteMap);
        }
        await this.processMuteMap(muteMap);
    }
}

container.resolve(TwitterPostObserver);
