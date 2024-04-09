import { container, InjectionToken } from "tsyringe";

/**
 * Spring-like post construction executor, this will fire after a dependency is resolved and constructed
 * @param target
 * @param propertyKey
 * @param descriptor
 * @constructor
 */
export function PostConstruct<T extends object>(target: T, propertyKey: string, descriptor: PropertyDescriptor): void {
    container.afterResolution(
        target.constructor as InjectionToken<T>,
        (token, result) => {
            descriptor.value.call(result);
        },
        {
            frequency: "Once",
        },
    );
}
