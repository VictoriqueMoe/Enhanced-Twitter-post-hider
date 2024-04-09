import { container, singleton } from "tsyringe";
import { Observable } from "./Observable.js";
import { PostConstruct } from "./decorators/PostConstruct.js";
import { waitForElm } from "./Utils.js";
import type { constructor } from "tsyringe/dist/typings/types/index.js";

@singleton()
export class TwitterMutator {
    private readonly observerList: constructor<Observable>[] = [];

    private observerProxy: MutationObserver | null = null;

    @PostConstruct
    public async init(): Promise<void> {
        await this.onTimelinePost();
    }

    public addObserver(observer: constructor<Observable>): void {
        this.observerList.push(observer);
    }

    private async onTimelinePost(): Promise<void> {
        const targetElement = "[aria-label*='Home Timeline'] > div[style^='position: relative']";
        const elm = await waitForElm(targetElement);
        if (!elm) {
            return;
        }
        // TODO: collect this to timeline collection
        this.observerProxy = new MutationObserver((mutations, observer) => {
            for (const observable of this.observerList) {
                const instance = container.resolve(observable);
                instance.observe(mutations, observer);
            }
        });
        this.observerProxy.observe(elm, {
            childList: true,
        });
    }
}
