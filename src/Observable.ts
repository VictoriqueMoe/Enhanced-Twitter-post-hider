export interface Observable {
    /**
     * Trigger this method when a tweet is detected
     * @param {MutationRecord[]} mutationList
     * @param {MutationObserver} observer
     */
    observe(mutationList: MutationRecord[], observer: MutationObserver): void;
}
