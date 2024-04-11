import { container, singleton } from "tsyringe";
import { PostConstruct } from "./decorators/PostConstruct.js";
import { timelineWrapperSelector, waitForElm } from "./Utils.js";
import type { constructor } from "tsyringe/dist/typings/types/index.js";
import { Observable, ObserverRunnable } from "./typings.js";
import { TwitterPostType } from "./decorators/TwitterPostEvent.js";

@singleton()
export class TwitterMutator {
    private observerProxy: MutationObserver | null = null;

    private readonly observerList: Map<TwitterPostType, ObserverRunnable[]> = new Map();

    @PostConstruct
    public async init(): Promise<void> {
        const location = window.location.pathname.split("/").pop();
        switch (location) {
            case "home":
                await this.onTimelinePost();
        }
    }

    public addObserver(context: constructor<unknown>, type: TwitterPostType, method: Observable): void {
        const obj: ObserverRunnable = {
            method,
            context,
        };
        if (this.observerList.has(type)) {
            this.observerList.get(type)?.push(obj);
        } else {
            this.observerList.set(type, [obj]);
        }
    }

    private async onTimelinePost(): Promise<void> {
        const elm = await waitForElm(timelineWrapperSelector);
        if (this.observerProxy) {
            this.observerProxy.disconnect();
        }
        this.observerProxy = new MutationObserver((mutations, observer) => {
            const observables = this.observerList.get(TwitterPostType.TIMELINE);
            if (!observables) {
                return;
            }
            for (const observable of observables) {
                const instance = container.resolve(observable.context);
                observable.method.call(instance, mutations, observer);
            }
        });
        this.observerProxy.observe(elm, {
            childList: true,
        });
    }

    public closeMutators(): void {
        this.observerProxy?.disconnect();
    }

    public async openMutators(): Promise<void> {
        await this.init();
    }
}
