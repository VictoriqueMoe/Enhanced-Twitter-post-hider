import { singleton } from "tsyringe";
import { BlockedWordEntry } from "../typings.js";

@singleton()
export class LocalStoreManager {
    private readonly KEY = "TWITTER_POST_HIDER_MANAGER";

    public async addBlockedWord(entry: BlockedWordEntry): Promise<void> {
        const storedWords = await this.getItm();
        if (!storedWords) {
            await this.setItm([entry]);
        } else {
            const idx = storedWords.findIndex(value => value.phrase === entry.phrase);
            if (idx > -1) {
                storedWords[idx] = entry;
            } else {
                storedWords.push(entry);
            }
            await this.setItm(storedWords);
        }
    }

    public getAllStoredWords(): Promise<BlockedWordEntry[] | null> {
        return this.getItm();
    }

    public async getBlockedWord(phrase: string): Promise<BlockedWordEntry | null> {
        const allWords = await this.getAllStoredWords();
        if (allWords) {
            return allWords.find(value => value.phrase === phrase) ?? null;
        }
        return null;
    }

    public async hasBlockedWord(word: string): Promise<boolean> {
        const allWords = await this.getAllStoredWords();
        if (allWords) {
            return !!allWords.find(value => value.phrase === word);
        }
        return false;
    }

    private async getItm(): Promise<BlockedWordEntry[] | null> {
        const itmJson = (await GM.getValue(this.KEY)) as string;
        if (!itmJson) {
            return null;
        }
        return JSON.parse(itmJson);
    }

    private async setItm(itm: BlockedWordEntry[]): Promise<void> {
        const json = JSON.stringify(itm);
        await GM.setValue(this.KEY, json);
    }
}
