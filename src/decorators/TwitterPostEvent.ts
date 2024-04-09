import { container } from "tsyringe";
import { TwitterMutator } from "../TwitterMutator.js";
import type { constructor } from "tsyringe/dist/typings/types/index.js";
import { Observable } from "../typings.js";

export enum TwitterPostType {
    TIMELINE,
    POST,
}

export function TwitterPostEvent<T extends object>(
    type: TwitterPostType,
): (target: T, propertyKey: string, descriptor: PropertyDescriptor) => void {
    return function (target: T, propertyKey: string, descriptor: PropertyDescriptor) {
        const constructor = target.constructor as constructor<Observable>;
        const mutatorProxy = container.resolve(TwitterMutator);
        const method: Observable = (target as Record<string, unknown>)[propertyKey] as Observable;
        mutatorProxy.addObserver(constructor, type, method);
    };
}
