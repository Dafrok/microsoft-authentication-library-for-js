/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { SignOutState } from "./AuthFlowState.js";
import { ResultBase } from "./ResultBase.js";

/*
 * Result of a sign-out operation.
 */
export class SignOutResult extends ResultBase<SignOutState, void, void> {
    constructor() {
        super(undefined, undefined);
    }

    get state(): SignOutState {
        if (this.error) {
            return SignOutState.Error;
        }

        return SignOutState.Completed;
    }
}
