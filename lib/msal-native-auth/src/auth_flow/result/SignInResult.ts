/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    SignInCodeRequiredState,
    SignInPasswordRequiredState,
} from "../state/SignInState.js";
import { AccountInfo } from "../data/AccountInfo.js";
import { ResultBase } from "./ResultBase.js";

/*
 * Result of a sign-in operation.
 */
export class SignInResult extends ResultBase<
    AccountInfo,
    SignInCodeRequiredState | SignInPasswordRequiredState
> {}

/*
 * Result of a sign-in operation that requires a code.
 */
export class SignInSubmitCodeResult extends ResultBase<AccountInfo> {
    constructor(resultData?: AccountInfo) {
        super(resultData);
    }
}

/*
 * Result of a sign-in operation that requires a password.
 */
export class SignInSubmitPasswordResult extends ResultBase<AccountInfo> {
    constructor(resultData?: AccountInfo) {
        super(resultData);
    }
}

/*
 * Result of resending code in a sign-in operation.
 */
export class SignInResendCodeResult extends ResultBase<
    void,
    SignInCodeRequiredState
> {
    constructor(nextStateHandler?: SignInCodeRequiredState) {
        super(undefined, nextStateHandler);
    }
}