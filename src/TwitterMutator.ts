import { getSelectorForPage, waitForElm } from "./Utils.js";
import { Observable } from "./Observable.js";
import { Constructor } from "./typings.js";
import { TwitterPostObserver } from "./Main.js";

export class TwitterMutator {
    private static instance: TwitterMutator;

    private constructor() {}

    public static async getInstance(): Promise<TwitterMutator> {
        if (!TwitterMutator.instance) {
            TwitterMutator.instance = new TwitterMutator();
            await TwitterMutator.instance.init();
        }

        return TwitterMutator.instance;
    }

    private timelineObserverProxy: MutationObserver | null = null;

    private readonly observerList: Constructor<Observable>[] = [];

    private readonly instanceMap: Map<Constructor<Observable>, Observable> = new Map();

    public async init(): Promise<void> {
        await this.onTweet();
    }

    public addObserver(context: Constructor<Observable>): void {
        this.observerList.push(context);
    }

    private async getObserver(context: Constructor<Observable>): Promise<Observable | null> {
        let instance = this.instanceMap.get(context) ?? null;
        if (instance) {
            return instance;
        }
        if (context === (TwitterPostObserver as unknown as Constructor<Observable>)) {
            instance = await TwitterPostObserver.getInstance();
            this.instanceMap.set(context, instance);
            return instance;
        }
        return null;
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
        this.timelineObserverProxy = new MutationObserver(async (mutations, observer) => {
            const observers = (await Promise.all(this.observerList.map(observer => this.getObserver(observer)))).filter(
                observer => !!observer,
            ) as Observable[];
            observers.map(instanceObserver => {
                instanceObserver.observe(mutations, observer);
            });
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
