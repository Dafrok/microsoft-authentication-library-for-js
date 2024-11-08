/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthenticationResult } from "@azure/msal-browser";
import { InvalidArgumentError } from "../../error/InvalidArgumentError.js";
import {
    AuthActionResultBase,
    CodeSendResult,
    ContinuationTokenResult,
} from "./AuthActionResult.js";

export class SignInCompleteResult extends AuthActionResultBase {
    constructor(
        public authenticationResult: AuthenticationResult,
        correlationId: string
    ) {
        super(correlationId);

        if (!authenticationResult) {
            throw new InvalidArgumentError(
                "authenticationResult",
                correlationId
            );
        }
    }
}

export class SignInWithContinuationTokenResult extends ContinuationTokenResult {}

export class SignInCodeSendResult extends CodeSendResult {}
