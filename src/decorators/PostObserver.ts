import { Observable } from "../Observable.js";
import { Constructor } from "../typings.js";
import { TwitterMutator } from "../TwitterMutator.js";

export function PostObserver(target: Constructor<Observable>): void {
    TwitterMutator.getInstance().then(mutatorProxy => {
        mutatorProxy.addObserver(target);
    });
}
