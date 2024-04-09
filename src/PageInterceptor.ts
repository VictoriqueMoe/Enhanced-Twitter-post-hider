import { singleton } from "tsyringe";
import { TwitterMutator } from "./TwitterMutator.js";

@singleton()
export class PageInterceptor {
    public constructor(private _twitterProxy: TwitterMutator) {}

    public pageChange(callBack: (mutation: MutationRecord) => void): void {
        window.addEventListener(
            "load",
            () => {
                let oldHref = document.location.href;
                const body = document.querySelector("body");
                if (!body) {
                    return;
                }
                const observer = new MutationObserver(async mutations => {
                    for (const mutation of mutations) {
                        if (oldHref !== document.location.href) {
                            oldHref = document.location.href;
                            await this._twitterProxy.init();
                            callBack(mutation);
                        }
                    }
                });
                observer.observe(body, { childList: true, subtree: true });
            },
            true,
        );
    }

    public waitForPage(url: string, callBack: (doc: typeof document) => void): void {
        window.addEventListener(
            "load",
            () => {
                const body = document.querySelector("body");
                if (!body) {
                    return;
                }
                const observer = new MutationObserver(mutations => {
                    const page = window.location.pathname.split("/").pop();
                    for (const mutation of mutations) {
                        if (url === page) {
                            callBack(document);
                            return;
                        }
                    }
                });
                observer.observe(body, { childList: true, subtree: true });
            },
            true,
        );
    }
}
