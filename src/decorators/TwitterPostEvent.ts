import { Observable } from "../Observable.js";
import { constructor } from "../typings.js";
import { TwitterMutator } from "../TwitterMutator.js";

export function TwitterPostEvent<T extends Observable>(
    target: T,
    propertyKey: string,
    descriptor: PropertyDescriptor,
): void {
    const constructor = target.constructor as constructor<Observable>;
    TwitterMutator.getInstance().then(mutatorProxy => {
        mutatorProxy.addObserver(constructor);
    });
}
