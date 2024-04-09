import { container } from "tsyringe";
import { Observable } from "../Observable.js";
import { TwitterMutator } from "../TwitterMutator.js";
import type { constructor } from "tsyringe/dist/typings/types/index.js";

export function TwitterPostEvent(target: object, propertyKey: string, descriptor: PropertyDescriptor): void {
    const constructor = target.constructor as constructor<Observable>;
    const mutatorProxy = container.resolve(TwitterMutator);
    mutatorProxy.addObserver(constructor);
}
