import "reflect-metadata";
import { container, singleton } from "tsyringe";
import { UiBuilder } from "./UiBuilder.js";
import { LocalStoreManager } from "./managers/LocalStoreManager.js";
import { BlockedWordEntry } from "./typings.js";
import { TwitterPostEvent, TwitterPostType } from "./decorators/TwitterPostEvent.js";
import { PostConstruct } from "./decorators/PostConstruct.js";
import { PageInterceptor } from "./PageInterceptor.js";
import { DomUtil, timelineWrapperSelector, waitForElm } from "./Utils.js";
import { TwitterMutator } from "./TwitterMutator.js";
import "./css/modal.css";

@singleton()
class TwitterPostObserver {
    public constructor(
        private uiBuilder: UiBuilder,
        private localStoreManager: LocalStoreManager,
        private twitterMutator: TwitterMutator,
    ) {
        uiBuilder.injectContent();
    }

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

    private async shouldRemove(el: HTMLElement): Promise<boolean> {
        const allBlockedWords = await this.localStoreManager.getAllStoredWords();
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

    @TwitterPostEvent(TwitterPostType.TIMELINE)
    public async processTimelinePost(mutationList: MutationRecord[], observer: MutationObserver): Promise<void> {
        const elmsToRemovePArray = mutationList.map(async mutationRecord => {
            const retArr: Element[] = [];
            for (let i = 0; i < mutationRecord.addedNodes.length; i++) {
                const newTimelinePost = mutationRecord.addedNodes[i] as HTMLElement;
                if (await this.shouldRemove(newTimelinePost)) {
                    retArr.push(newTimelinePost);
                }
            }
            return retArr;
        });
        const elmsToRemove = await Promise.all(elmsToRemovePArray);
        this.removeElm(elmsToRemove.flat());
    }

    @PostConstruct
    private async init(): Promise<void> {
        const location = window.location.pathname.split("/").pop();
        const pageInterceptor = container.resolve(PageInterceptor);

        pageInterceptor.addAction(async () => {
            const location = window.location.pathname.split("/").pop();
            await this.twitterMutator.init();
            if (location === "home") {
                await this.loadPage();
            }
        });

        if (location === "home") {
            await this.loadPage();
        }
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
            const container = insertAfter.parentElement!;
            insertAfter.after(anchor);
            const modal = await this.buildModal();
            anchor.addEventListener("click", () => {
                DomUtil.openModal(modal);
            });
        });
    }

    private async buildModal(): Promise<HTMLElement> {
        const [modal, exists] = await this.uiBuilder.getEditor();
        if (!exists) {
            const el: HTMLElement = document.body;
            el.insertAdjacentElement("beforeend", modal);
        }
        return modal;
    }

    private async loadPage(): Promise<void> {
        const timelineContainer = await waitForElm(timelineWrapperSelector);
        if (!timelineContainer.children) {
            return;
        }
        const toRemove: Element[] = [];
        for (let i = 0; i < timelineContainer.children.length; i++) {
            const chatItem = timelineContainer.children[i] as HTMLElement;
            if (await this.shouldRemove(chatItem)) {
                toRemove.push(chatItem);
            }
        }
        this.removeElm(toRemove);
    }
}

container.resolve(TwitterPostObserver);
