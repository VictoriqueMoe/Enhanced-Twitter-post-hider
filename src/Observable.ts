export interface Observable {
    /**
     * Trigger this method when a discord message is sent
     * @param {MutationRecord[]} mutationList
     * @param {MutationObserver} observer
     */
    observe(mutationList: MutationRecord[], observer: MutationObserver): void;
}
