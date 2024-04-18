import { Action } from "./typings.js";

export class PageInterceptor {
    private static instance: PageInterceptor;

    private constructor() {}

    public static getInstance(): PageInterceptor {
        if (!PageInterceptor.instance) {
            PageInterceptor.instance = new PageInterceptor();
            PageInterceptor.instance.init();
        }

        return PageInterceptor.instance;
    }

    private readonly actions: Action[] = [];

    private init(): void {
        window.addEventListener(
            "load",
            () => {
                let oldHref = document.location.href;
                const body = document.querySelector("body");
                if (!body) {
                    return;
                }
                const observer = new MutationObserver(() => {
                    if (oldHref !== document.location.href) {
                        oldHref = document.location.href;
                        for (const action of this.actions) {
                            action();
                        }
                    }
                });
                observer.observe(body, { childList: true, subtree: true });
            },
            true,
        );
    }

    public addAction(action: Action): void {
        this.actions.push(action);
    }
}
