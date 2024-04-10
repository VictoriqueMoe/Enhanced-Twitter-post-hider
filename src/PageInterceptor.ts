import { singleton } from "tsyringe";
import { Action } from "./typings.js";
import { PostConstruct } from "./decorators/PostConstruct.js";

@singleton()
export class PageInterceptor {
    public constructor() {}

    private readonly actions: Action[] = [];

    @PostConstruct
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
