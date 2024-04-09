import "reflect-metadata";
import { container, singleton } from "tsyringe";
import { Observable } from "./Observable.js";
import { UiBuilder } from "./UiBuilder.js";
import { LocalStoreManager } from "./managers/LocalStoreManager.js";
import { BlockedWordEntry } from "./typings.js";
import { TwitterPostEvent } from "./decorators/TwitterPostEvent.js";
import { PostConstruct } from "./decorators/PostConstruct.js";
import { PageInterceptor } from "./PageInterceptor.js";
import { waitForElm } from "./Utils.js";

@singleton()
class TwitterPostObserver implements Observable {
    public constructor(
        private uiBuilder: UiBuilder,
        private localStoreManager: LocalStoreManager,
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

    @TwitterPostEvent
    public async observe(mutationList: MutationRecord[], observer: MutationObserver): Promise<void> {
        const elmsToRemovePArray = mutationList.flatMap(async mutationRecord => {
            const retArr: Element[] = [];
            for (let i = 0; i < mutationRecord.addedNodes.length; i++) {
                const addedMessage = mutationRecord.addedNodes[i] as HTMLElement;
                if (await this.shouldRemove(addedMessage)) {
                    retArr.push(addedMessage);
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
        pageInterceptor.pageChange(async () => {
            await this.loadPage();
        });
        if (location === "home") {
            await this.loadPage();
        }
        pageInterceptor.waitForPage("mute_and_block", async doc => {
            const group = await waitForElm("section[aria-label='Section details'] > div:last-child");
            if (!group) {
                return;
            }
            const anchor = this.uiBuilder.buildOption(group);
            if (!anchor) {
                return;
            }
            const insertAfter = group.querySelector("a:nth-child(4)");
            if (!insertAfter) {
                return;
            }
            insertAfter.after(anchor);
        });
    }

    private async loadPage(): Promise<void> {
        const timelineContainer = await waitForElm(`[aria-label*='Home Timeline'] > div[style^='position: relative']`);
        if (!timelineContainer?.children) {
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
