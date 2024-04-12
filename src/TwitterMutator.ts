import { container, singleton } from "tsyringe";
import { PostConstruct } from "./decorators/PostConstruct.js";
import { getSelectorForPage, waitForElm } from "./Utils.js";
import type { constructor } from "tsyringe/dist/typings/types/index.js";
import { Observable } from "./Observable.js";

@singleton()
export class TwitterMutator {
    private timelineObserverProxy: MutationObserver | null = null;

    private readonly observerList: constructor<Observable>[] = [];

    @PostConstruct
    public async init(): Promise<void> {
        await this.onTweet();
    }

    public addObserver(context: constructor<Observable>): void {
        this.observerList.push(context);
    }

    private async onTweet(): Promise<void> {
        const homePageSelector = getSelectorForPage();
        const elm = await waitForElm(homePageSelector);
        if (!elm) {
            return;
        }
        const parentSection = elm.closest("section");
        if (!parentSection) {
            return;
        }
        const sectionWrapper = parentSection.parentElement;
        if (!sectionWrapper) {
            return;
        }
        if (this.timelineObserverProxy) {
            this.timelineObserverProxy.disconnect();
        }
        this.timelineObserverProxy = new MutationObserver((mutations, observer) => {
            for (const observable of this.observerList) {
                const instance = container.resolve(observable);
                instance.observe(mutations, observer);
            }
        });

        this.timelineObserverProxy.observe(sectionWrapper, {
            childList: true,
            subtree: true,
        });
    }

    public closeMutators(): void {
        this.timelineObserverProxy?.disconnect();
    }

    public async openMutators(): Promise<void> {
        await this.init();
    }
}
