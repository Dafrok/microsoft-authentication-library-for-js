/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { NativeAuthError } from "../../error/NativeAuthError.js";
import { UnexpectedError } from "../../error/UnexpectedError.js";
import { AuthFlowStateHandlerBase } from "../state_handler/AuthFlowStateHandlerBase.js";

/*
 * Base class for a result of an authentication operation.
 * @typeParam TState - The type of the result data.
 * @typeParam TStateHandler - The type of state handler.
 */
export abstract class ResultBase<
    TState,
    TData = void,
    TStateHandler extends AuthFlowStateHandlerBase | void = void
> {
    /*
     * The state of the authentication operation.
     */
    protected _state?: TState;

    /*
     *constructor for ResultBase
     * @param data - The result data.
     * @param state - The state.
     * @typeParam TData - The type of the result data.
     * @typeParam TState - The type of state.
     */
    constructor(public data?: TData, public stateHandler?: TStateHandler) {}

    /*
     * The error that occurred during the authentication operation.
     */
    error?: NativeAuthError;

    /*
     * Gets current state of the authentication operation.
     */
    abstract get state(): TState;

    /*
     * Creates a result with an error.
     * @param error - The error that occurred.
     * @returns The result.
     * @typeParam TData - The type of the result data.
     * @typeParam TState - The type of state.
     * @typeParam TActionResult - The type of the result.
     */
    static createWithError<
        TData,
        TStateHandler extends AuthFlowStateHandlerBase | void,
        TState,
        TActionResult extends ResultBase<TState, TData, TStateHandler>
    >(this: new () => TActionResult, error: unknown): TActionResult {
        let nativeAuthError: NativeAuthError;

        if (error instanceof NativeAuthError) {
            nativeAuthError = error;
        } else {
            nativeAuthError = new UnexpectedError(error);
        }

        const errorResult = new this();
        errorResult.error = nativeAuthError;
        return errorResult;
    }
}
