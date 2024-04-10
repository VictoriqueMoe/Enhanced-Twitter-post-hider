import { singleton } from "tsyringe";
import { LocalStoreManager } from "./managers/LocalStoreManager.js";

@singleton()
export class UiBuilder {
    public constructor(private localStoreManager: LocalStoreManager) {}
    private contentInjected = false;

    public injectContent(): void {
        if (this.contentInjected) {
            return;
        }
        const css = this.buildCss();
        // const header = `<meta http-equiv="Content-Security-Policy" content="default-src 'self' *">`;
        document.getElementsByTagName("head")[0].appendChild(css);
        this.contentInjected = true;
    }

    private buildCss(): HTMLStyleElement {
        const style = document.createElement("style");
        style.innerHTML = `
            .hidden{
                display: none;
            }
        `;
        return style;
    }

    public buildOption(): HTMLAnchorElement | null {
        const hasEl = document.querySelector("#enhanced_muted_words") !== null;
        if (hasEl) {
            return null;
        }
        const a = document.createElement("a");
        a.className = "css-175oi2r r-1wtj0ep r-16x9es5 r-1f1sjgu r-o7ynqc r-6416eg r-1ny4l3l r-1loqt21";
        a.id = "enhanced_muted_words";
        a.setAttribute("style", "padding-right: 16px; padding-left: 16px;");
        a.innerHTML = `<div class="css-175oi2r r-1awozwy r-18u37iz r-16y2uox"><div class="css-175oi2r r-16y2uox r-1wbh5a2"><div dir="ltr" class="css-1rynq56 r-bcqeeo r-qvutc0 r-37j5jr r-a023e6 r-rjixqe r-16dba41" style="text-overflow: unset; color: rgb(231, 233, 234);"><span class="css-1qaijid r-bcqeeo r-qvutc0 r-poiln3" style="text-overflow: unset;">Enhanced muted words</span></div></div><svg viewBox="0 0 24 24" aria-hidden="true" class="r-4qtqp9 r-yyyyoo r-1xvli5t r-dnmrzs r-bnwqim r-1plcrui r-lrvibr r-1bwzh9t r-1q142lx r-f727ji"><g><path d="M14.586 12L7.543 4.96l1.414-1.42L17.414 12l-8.457 8.46-1.414-1.42L14.586 12z"></path></g></svg></div>`;
        return a;
    }

    public async getEditor(): Promise<string | null> {
        if (document.getElementById("#enhancedMutedWordsDialog")) {
            return null;
        }
        const allMutedWords = await this.localStoreManager.getAllStoredWords();
        let currentMutedWords = "";
        if (!allMutedWords || allMutedWords.length === 0) {
            currentMutedWords = "<p>No Muted Words</p>";
        } else {
            currentMutedWords = allMutedWords.map(word => `<p>${word.phrase}</p>`).join("<br />");
        }
        return `
        <dialog open id="enhancedMutedWordsDialog">
            <span>Currently muted words:</span>
            ${currentMutedWords}
            <form method="dialog">
                <button>Save</button>
            </form>
        </dialog>
        `;
    }
}
