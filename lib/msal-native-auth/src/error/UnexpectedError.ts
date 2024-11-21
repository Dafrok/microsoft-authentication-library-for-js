/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { NativeAuthError } from "./NativeAuthError.js";

export class UnexpectedError extends NativeAuthError {
    constructor(errorData: unknown, correlationId?: string) {
        let errorDescription: string;

        if (errorData instanceof Error) {
            errorDescription = errorData.message;
        } else if (typeof errorData === "string") {
            errorDescription = errorData;
        } else if (typeof errorData === "object" && errorData !== null) {
            errorDescription = JSON.stringify(errorData);
        } else {
            errorDescription = "An unexpected error occurred.";
        }

        super("unexpected_error", errorDescription, correlationId);
        Object.setPrototypeOf(this, UnexpectedError.prototype);
    }
}