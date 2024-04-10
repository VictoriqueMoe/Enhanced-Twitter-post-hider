export function waitForElm(selector: string, node?: Element): Promise<Element> {
    return new Promise(resolve => {
        const e = node ?? document;
        if (e.querySelector(selector)) {
            return resolve(e.querySelector(selector)!);
        }

        const observer = new MutationObserver(() => {
            if (e.querySelector(selector)) {
                resolve(e.querySelector(selector)!);
                observer.disconnect();
            }
        });
        observer.observe(e, {
            childList: true,
            subtree: true,
        });
    });
}

export const timelineWrapperSelector = "[aria-label*='Home Timeline'] > div[style^='position: relative']";

export function toggleHide(hide: boolean, element: HTMLElement): void {
    hide ? element.classList.add("hidden") : element.classList.remove("hidden");
}
