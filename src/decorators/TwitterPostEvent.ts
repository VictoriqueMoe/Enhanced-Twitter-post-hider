import { container } from "tsyringe";
import { TwitterMutator } from "../TwitterMutator.js";
import type { constructor } from "tsyringe/dist/typings/types/index.js";
import { Observable } from "../Observable.js";

export function TwitterPostEvent<T extends object>(
    target: T,
    propertyKey: string,
    descriptor: PropertyDescriptor,
): void {
    const constructor = target.constructor as constructor<Observable>;
    const mutatorProxy = container.resolve(TwitterMutator);
    mutatorProxy.addObserver(constructor);
}
