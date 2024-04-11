import { ModalOptions } from "./typings.js";

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

export class DomUtil {
    private static guid(): string {
        function s4(): string {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }

        return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
    }

    /**
     * Create a modal with the given options
     * @param options
     */
    public static async createModal(options: ModalOptions): Promise<HTMLElement> {
        function getStyle(styleObj?: { [style: string]: string }): string {
            let styleStr = "";
            if (styleObj) {
                for (const key in styleObj) {
                    styleStr += `${key}: ${styleObj[key]}; `;
                }
            }
            return styleStr;
        }

        let id = null;
        if (options.id) {
            id = options.id;
        } else {
            id = this.guid();
        }

        const bodyStyle = getStyle(options.modalContentStyle);
        const styleStr = getStyle(options.modalBodyStyle);
        const body = await options.body();
        let html = `<div class="Modal" id="${id}"> 
                        <div class="FSmodalContent" style="${bodyStyle}"> 
                            <div class="FSmodalHeader"> 
                                <span class="FSclose">&times;</span> 
                                <h5 class="FSmodalTitle">${options.title}</h5> 
                            </div> 
                            <div class="FSModalBody" style="${styleStr}">${body}</div>`;
        if (options.footer) {
            html += ` <div class="FSModalFooter"> 
                         ${options.footer} 
                       </div>`;
        }
        html += `</div></div>`;
        const modal = DomUtil.createElementFromHTML(html);
        window.onclick = (event: Event): void => {
            if (event.target == modal) {
                DomUtil.closeModal(modal);
            }
        };
        DomUtil.offOn(DomUtil.bySelector(".FSclose", modal), "click", e => {
            DomUtil.closeModal(modal);
        });

        return modal;
    }

    private static bySelector(selector: string, el?: ParentNode): HTMLElement | null {
        if (el) {
            return el.querySelector(selector);
        }
        return document.querySelector(selector);
    }

    private static offOn(
        el: Element | string | null,
        event: string,
        callBack: (e?: Event) => void,
        fireImmediately = false,
    ): void {
        if (!el) {
            return;
        }
        let toTrigger: Element | undefined | null;
        if (el instanceof Element) {
            toTrigger = el;
        } else {
            toTrigger = document.querySelector(el);
        }
        if (!toTrigger) {
            return;
        }
        toTrigger = DomUtil.off(toTrigger);
        DomUtil.on(toTrigger, event, callBack, fireImmediately);
    }

    private static off(el: Element): Element | undefined {
        if (!el) {
            return;
        }
        const newEl: Node = el.cloneNode(false);
        while (el.hasChildNodes()) {
            if (el.firstChild) {
                newEl.appendChild(el.firstChild);
            }
        }
        el?.parentNode?.replaceChild(newEl, el);
        return newEl as Element;
    }

    private static on(
        el: Element | string | undefined,
        event: string,
        callBack: (e?: Event) => void,
        fireImmediately = false,
    ): void {
        if (!el) {
            return;
        }
        let toTrigger: Element | null;
        if (el instanceof Element) {
            toTrigger = el;
        } else {
            toTrigger = document.querySelector(el);
        }
        if (!toTrigger) {
            return;
        }
        toTrigger.addEventListener(event, callBack);
        if (fireImmediately) {
            toTrigger.dispatchEvent(new Event(event));
        }
    }

    public static openModal(modal: HTMLElement): void {
        modal.style.display = "block";
    }

    public static createElementFromHTML(htmlString: string): HTMLElement {
        const div = document.createElement("div");
        div.innerHTML = htmlString.trim();
        return div.firstChild as HTMLElement;
    }

    public static closeModal(modal: HTMLElement): void {
        modal.style.display = "none";
    }
}

export const timelineWrapperSelector = "[aria-label*='Home Timeline'] > div[style^='position: relative']";

export function toggleHide(hide: boolean, element: HTMLElement): void {
    hide ? element.classList.add("hidden") : element.classList.remove("hidden");
}
