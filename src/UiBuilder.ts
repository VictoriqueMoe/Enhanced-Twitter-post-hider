import { singleton } from "tsyringe";
import { LocalStoreManager } from "./managers/LocalStoreManager.js";
import { DomUtil } from "./Utils.js";
import { BlockedWordEntry } from "./typings.js";

@singleton()
export class UiBuilder {
    public constructor(private localStoreManager: LocalStoreManager) {}

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
        a.addEventListener("mouseenter", evt => {
            (evt.target as HTMLElement).classList.add("r-g2wdr4");
        });
        a.addEventListener("mouseleave", evt => {
            (evt.target as HTMLElement).classList.remove("r-g2wdr4");
        });
        return a;
    }

    public async getEditor(
        onSave?: (blockedWords: BlockedWordEntry[]) => void | Promise<void>,
    ): Promise<[HTMLElement, boolean]> {
        function createTableBodyRows(allBlockedWords: BlockedWordEntry[]): string {
            let tableBodyRows = "";
            for (const blockedWord of allBlockedWords) {
                tableBodyRows += `
                <tr>
                    <td contenteditable="true">${blockedWord.phrase}</td>
                    <td>
                        <select>
                            <option value="true" ${blockedWord.options.useRegex ? "selected" : ""}>true</option>
                            <option value="false" ${blockedWord.options.useRegex ? "" : "selected"}>false</option>
                        </select>
                    </td>
                    <td><button data-id="removeRow">Remove</button></td>
                </tr>
            `;
            }
            return tableBodyRows;
        }

        function createHtmlTable(allBlockedWords: BlockedWordEntry[]): string {
            return `
                <div id='currentBlockedWordsTableWrapper'></div>
                <table id='currentBlockedWordsTable'>
                    <thead>
                        <tr>
                            <th scope="col">Phrase</th>
                            <th scope="col">Regex</th>
                        </tr>
                    </thead>
                <tbody id="currentBlockedWordsTableBody">
                    ${createTableBodyRows(allBlockedWords)}
                </tbody>
                </table>
            `;
        }

        function bindRemoveButtons(): void {
            modal.querySelectorAll("button[data-id='removeRow']").forEach(e => {
                DomUtil.offOn(e, "click", e => {
                    const target = e!.target as HTMLButtonElement;
                    target.closest("tr")?.remove();
                });
            });
        }

        const existingModel = document.getElementById("#enhancedMutedWordsDialog");
        if (existingModel) {
            return [existingModel, true];
        }
        const allBlockedWords = await this.localStoreManager.getAllStoredWords();
        const modal = await DomUtil.createModal({
            id: "enhancedMutedWordsDialog",
            body: () => createHtmlTable(allBlockedWords),
            title: "Enhanced Muted words",
            modalBodyStyle: {
                height: "auto",
                overflow: "auto",
            },
            footer: `
                <button id="AddRowButton" class="button blackButton">Add row</button>
                <button id="applyEnhancedMutedWords" class="button blackButton apply">Save</button>
            `,
        });
        modal.querySelector("#applyEnhancedMutedWords")?.addEventListener("click", async () => {
            const table = modal.querySelector("#currentBlockedWordsTable")! as HTMLTableElement;
            const tableRows = Array.from(table.querySelectorAll("#currentBlockedWordsTableBody tr"));
            const blockedWords: BlockedWordEntry[] = [];
            for (const row of tableRows) {
                const tableTextContent = row.querySelector("td:first-child")?.textContent;
                if (!tableTextContent) {
                    alert("Unable to set blank phrase");
                    return;
                }
                const phrase = tableTextContent;
                const useRegex = row.querySelector("select")!.value === "true";
                if (useRegex) {
                    try {
                        new RegExp(phrase);
                    } catch (e) {
                        alert(`Regex ${phrase} is not valid: ${(e as Error).message}`);
                        return;
                    }
                }
                blockedWords.push({ phrase, options: { useRegex } });
            }
            await this.localStoreManager.setBlockedWords(blockedWords);
            if (onSave) {
                await onSave(blockedWords);
            }
            alert("Saved successfully.");
        });
        bindRemoveButtons();
        modal.querySelector("#AddRowButton")?.addEventListener("click", () => {
            const table = modal.querySelector("#currentBlockedWordsTable")! as HTMLTableElement;
            const newRow = document.createElement("tr");
            newRow.innerHTML = `
                <td contenteditable="true"></td>
                <td>
                    <select>
                        <option value="true">true</option>
                        <option value="false">false</option>
                    </select>
                </td>
                <td><button data-id="removeRow">Remove</button></td>
            `;
            table.querySelector("#currentBlockedWordsTableBody")?.appendChild(newRow);
            bindRemoveButtons();
        });
        return [modal, false];
    }
}
