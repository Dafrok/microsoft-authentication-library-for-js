/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { PublicClientApplication } from "@azure/msal-browser";
import { GetAccountResult } from "./auth_flow/result/GetAccountResult.js";
import { ResetPasswordStartResult } from "./auth_flow/result/ResetPasswordResult.js";
import { SignInResult } from "./auth_flow/result/SignInResult.js";
import { SignUpResult } from "./auth_flow/result/SignUpResult.js";
import { INativeAuthStardardController } from "./controller/INativeAuthStandardController.js";
import { NativeAuthStandardController } from "./controller/NativeAuthStandardController.js";
import { INativeAuthPublicClientApplication } from "./INativeAuthPublicClientApplication.js";
import {
    GetAccountInputs,
    SignInInputs,
    SignUpInputs,
    ResetPasswordInputs,
} from "./NativeAuthActionInputs.js";
import { NativeAuthConfiguration } from "./NativeAuthConfiguration.js";
import { NativeAuthOperatingContext } from "./operating_context/NativeAuthOperatingContext.js";

export class NativeAuthPublicClientApplication
    extends PublicClientApplication
    implements INativeAuthPublicClientApplication
{
    private readonly nativeAuthController: NativeAuthStandardController;

    /*
     * Creates a new instance of a PublicClientApplication with the given configuration.
     * @param config - A configuration object for the PublicClientApplication instance
     */
    static create(
        config: NativeAuthConfiguration
    ): NativeAuthPublicClientApplication {
        return new NativeAuthPublicClientApplication(config);
    }

    /*
     * Creates a new instance of a PublicClientApplication with the given configuration and controller.
     * @param config - A configuration object for the PublicClientApplication instance
     * @param controller - A controller object for the PublicClientApplication instance
     */
    constructor(
        config: NativeAuthConfiguration,
        controller?: INativeAuthStardardController
    ) {
        const nativeAuthController = new NativeAuthStandardController(
            new NativeAuthOperatingContext(config)
        );

        super(config, controller || nativeAuthController);

        this.nativeAuthController = nativeAuthController;
    }

    /*
     * Gets the current account from the cache.
     * @param getAccountOptions - Options for getting the current cached account
     * @returns - A promise that resolves to GetAccountResult
     */
    getCurrentAccount(
        getAccountOptions: GetAccountInputs
    ): Promise<GetAccountResult> {
        throw new Error(
            `Method not implemented with parameter ${getAccountOptions}`
        );
    }

    /*
     * Initiates the sign-in flow.
     * @param signInOptions - Options for the sign-in flow
     * @returns - A promise that resolves to SignInResult
     */
    signIn(signInOptions: SignInInputs): Promise<SignInResult> {
        return this.nativeAuthController.signIn(signInOptions);
    }

    /*
     * Initiates the sign-up flow.
     * @param signUpOptions - Options for the sign-up flow
     * @returns - A promise that resolves to SignUpResult
     */
    signUp(signUpOptions: SignUpInputs): Promise<SignUpResult> {
        throw new Error(
            `Method not implemented with parameter ${signUpOptions}`
        );
    }

    /*
     * Initiates the reset password flow.
     * @param resetPasswordOptions - Options for the reset password flow
     * @returns - A promise that resolves to ResetPasswordStartResult
     */
    resetPassword(
        resetPasswordOptions: ResetPasswordInputs
    ): Promise<ResetPasswordStartResult> {
        throw new Error(
            `Method not implemented with parameter ${resetPasswordOptions}`
        );
    }
}