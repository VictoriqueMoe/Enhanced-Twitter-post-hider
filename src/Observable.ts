export interface Observable {
    /**
     * Trigger this method when a new post is show on the timeline
     * @param {MutationRecord[]} mutationList
     * @param {MutationObserver} observer
     */
    observe(mutationList: MutationRecord[], observer: MutationObserver): void;
}
