import { BlockedWordAudit, BlockedWordEntry, storeKeys } from "../typings.js";

export class LocalStoreManager {
    private static instance: LocalStoreManager;

    private constructor() {}

    public static getInstance(): LocalStoreManager {
        if (!LocalStoreManager.instance) {
            LocalStoreManager.instance = new LocalStoreManager();
        }

        return LocalStoreManager.instance;
    }

    private readonly KEY = "TWITTER_POST_HIDER_MANAGER";

    public async addBlockedWord(entry: BlockedWordEntry): Promise<void> {
        const storedWords = await this.getAllStoredWords();
        const idx = storedWords.findIndex(value => value.phrase === entry.phrase);
        if (idx > -1) {
            storedWords[idx] = entry;
        } else {
            storedWords.push(entry);
        }
        await this.setBlockedWords(storedWords);
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

    public async getAllStoredWords(): Promise<BlockedWordEntry[]> {
        const itmJson = await GM.getValue(this.KEY, `{"blockedWords": []}`);
        const json: Record<storeKeys, BlockedWordEntry[]> = JSON.parse(itmJson);
        return json.blockedWords as BlockedWordEntry[];
    }

    public async setBlockedWords(blockedWordEntries: BlockedWordEntry[]): Promise<void> {
        const itmJson = (await GM.getValue(this.KEY, `{"blockedWords": []}`)) as string;
        const gmJson: Record<storeKeys, BlockedWordEntry[]> = JSON.parse(itmJson);
        gmJson.blockedWords = blockedWordEntries;
        await GM.setValue(this.KEY, JSON.stringify(gmJson));
    }

    public async incrementBlockedWordAudit(key: string): Promise<void> {
        const itmJson = (await GM.getValue(this.KEY, `{"audit": {}}`)) as string;
        const gmJson: Record<storeKeys, BlockedWordAudit> = JSON.parse(itmJson);
        const auditEntries = gmJson.audit ?? {};
        auditEntries[key] = auditEntries[key] ? auditEntries[key] + 1 : 1;
        gmJson.audit = auditEntries;
        await GM.setValue(this.KEY, JSON.stringify(gmJson));
    }

    public async getAuditEntries(): Promise<BlockedWordAudit> {
        const itmJson = (await GM.getValue(this.KEY, `{"audit": []}`)) as string;
        const json: Record<storeKeys, BlockedWordAudit> = JSON.parse(itmJson);
        return json.audit as BlockedWordAudit;
    }
}
