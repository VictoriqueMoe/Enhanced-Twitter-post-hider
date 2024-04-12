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

    private isTextBlocked(tweetText: string, allBlockedWords: BlockedWordEntry[]): boolean {
        return allBlockedWords.some(blockedWord => {
            const { phrase, options } = blockedWord;
            const { useRegex } = options;
            if (useRegex) {
                const regEx = new RegExp(phrase, "gm");
                return regEx.test(tweetText);
            }
            return tweetText.includes(phrase);
        });
    }

    private shouldRemove(el: HTMLElement, allBlockedWords: BlockedWordEntry[]): boolean {
        if (!allBlockedWords || allBlockedWords.length === 0) {
            return false;
        }

        const tweetTexts = el.querySelectorAll("[data-testid='tweetText']");
        return Array.from(tweetTexts).some(tweet => {
            const tweetText = tweet.textContent;
            if (tweetText) {
                return this.isTextBlocked(tweetText, allBlockedWords);
            }
            return false;
        });
    }

    @TwitterPostEvent
    public async observe(mutationList: MutationRecord[], observer: MutationObserver): Promise<void> {
        const allBlockedWords = await this.localStoreManager.getAllStoredWords();
        const elmsToRemove = mutationList.flatMap(mutationRecord => {
            const retArr: Element[] = [];
            for (let i = 0; i < mutationRecord.addedNodes.length; i++) {
                const newTimelinePost = mutationRecord.addedNodes[i] as HTMLElement;
                if (this.shouldRemove(newTimelinePost, allBlockedWords)) {
                    retArr.push(newTimelinePost);
                }
            }
            return retArr;
        });
        this.removeElm(elmsToRemove);
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
        const selectorToLoad = getSelectorForPage();
        const timelineContainer = await waitForElm(selectorToLoad);
        if (!timelineContainer) {
            return;
        }
        if (!timelineContainer.children) {
            return;
        }
        const allBlockedWords = await this.localStoreManager.getAllStoredWords();
        const toRemove: Element[] = [];
        for (let i = 0; i < timelineContainer.children.length; i++) {
            const chatItem = timelineContainer.children[i] as HTMLElement;
            if (this.shouldRemove(chatItem, allBlockedWords)) {
                toRemove.push(chatItem);
            }
        }
        this.removeElm(toRemove);
    }
}

container.resolve(TwitterPostObserver);
