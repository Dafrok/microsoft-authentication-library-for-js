/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ICrypto, PkceCodes, SignedHttpRequest, SignedHttpRequestParameters, CryptoKeyTypes, Logger, BoundServerAuthorizationTokenResponse, BaseAuthRequest, ServerAuthorizationTokenResponse } from "@azure/msal-common";
import { GuidGenerator } from "./GuidGenerator";
import { Base64Encode } from "../encode/Base64Encode";
import { Base64Decode } from "../encode/Base64Decode";
import { PkceGenerator } from "./PkceGenerator";
import { BrowserCrypto, CryptoKeyOptions } from "./BrowserCrypto";
import { BrowserStringUtils } from "../utils/BrowserStringUtils";
import { CryptoKeyFormats, CryptoKeyConfig } from "../utils/CryptoConstants";
import { BrowserAuthError } from "../error/BrowserAuthError";
import { AsyncMemoryStorage } from "../cache/AsyncMemoryStorage";
import { BoundTokenResponse } from "./BoundTokenResponse";

export type CachedKeyPair = {
    publicKey: CryptoKey,
    privateKey: CryptoKey,
    requestMethod?: string,
    requestUri?: string
};

/**
 * MSAL CryptoKeyStore DB Version 2
 */
export type CryptoKeyStore = {
    asymmetricKeys: AsyncMemoryStorage<CachedKeyPair>;
    symmetricKeys: AsyncMemoryStorage<CryptoKey>;
};

/**
 * This class implements MSAL's crypto interface, which allows it to perform base64 encoding and decoding, generating cryptographically random GUIDs and 
 * implementing Proof Key for Code Exchange specs for the OAuth Authorization Code Flow using PKCE (rfc here: https://tools.ietf.org/html/rfc7636).
 */
export class CryptoOps implements ICrypto {

    private browserCrypto: BrowserCrypto;
    private guidGenerator: GuidGenerator;
    private b64Encode: Base64Encode;
    private b64Decode: Base64Decode;
    private pkceGenerator: PkceGenerator;
    private logger: Logger;

    private static EXTRACTABLE: boolean = true;
    private cache: CryptoKeyStore;

    constructor(logger: Logger) {
        this.logger = logger;
        // Browser crypto needs to be validated first before any other classes can be set.
        this.browserCrypto = new BrowserCrypto(this.logger);
        this.b64Encode = new Base64Encode();
        this.b64Decode = new Base64Decode();
        this.guidGenerator = new GuidGenerator(this.browserCrypto);
        this.pkceGenerator = new PkceGenerator(this.browserCrypto);
        this.cache = {
            asymmetricKeys: new AsyncMemoryStorage<CachedKeyPair>(this.logger),
            symmetricKeys: new AsyncMemoryStorage<CryptoKey>(this.logger)
        };
    }

    /**
     * Creates a new random GUID - used to populate state and nonce.
     * @returns string (GUID)
     */
    createNewGuid(): string {
        return this.guidGenerator.generateGuid();
    }

    /**
     * Encodes input string to base64.
     * @param input 
     */
    base64Encode(input: string): string {
        return this.b64Encode.encode(input);
    }    
    
    /**
     * Decodes input string from base64.
     * @param input 
     */
    base64Decode(input: string): string {
        return this.b64Decode.decode(input);
    }

    /**
     * Generates PKCE codes used in Authorization Code Flow.
     */
    async generatePkceCodes(): Promise<PkceCodes> {
        return this.pkceGenerator.generateCodes();
    }

    /**
     * Helper method that wraps a generateKeyPair call in a try/catch block
     * so errors thrown inside generate key pair can be handled upstream
     * @param keyOptions
     */
    private async generateKeyPairHelper(keyOptions: CryptoKeyOptions): Promise<CryptoKeyPair> {
        // Attempt to generate Keypair
        try {
            return await this.browserCrypto.generateKeyPair(keyOptions, CryptoOps.EXTRACTABLE);
        } catch (error) {
            // Throw if key could not be generated
            const errorMessage = (error instanceof Error) ? error.message : undefined;
            throw BrowserAuthError.createKeyGenerationFailedError(errorMessage);
        }
    }

    /**
     * Generates a keypair, stores it and returns a thumbprint
     * @param request
     */
    async getPublicKeyThumbprint(request: SignedHttpRequestParameters, keyType?: CryptoKeyTypes): Promise<string> {
        this.logger.verbose(`getPublicKeyThumbprint called to generate a cryptographic keypair of type ${keyType}`);        
        const keyOptions: CryptoKeyOptions = keyType === CryptoKeyTypes.StkJwk ? CryptoKeyConfig.RefreshTokenBinding : CryptoKeyConfig.AccessTokenBinding;
        
        // Attempt to generate keypair, helper makes sure to throw if generation fails
        const keyPair: CryptoKeyPair = await this.generateKeyPairHelper(keyOptions);
        
        /**
         * This check should never evaluate to true because the helper above handles key generation
         * errors, but TypeScript requires that the public and private key values are checked because
         * the CryptoKeyPair type lists them as optional.
         */
        if (!keyPair || !keyPair.publicKey || !keyPair.privateKey) {
            throw BrowserAuthError.createKeyGenerationFailedError("Either the public or private key component is missing from the generated CryptoKeyPair");
        }

        this.logger.verbose(`Successfully generated ${keyType} keypair`);

        // Generate Thumbprint for Public Key
        const publicKeyJwk: JsonWebKey = await this.browserCrypto.exportJwk(keyPair.publicKey);
        
        const pubKeyThumprintObj: JsonWebKey = {
            e: publicKeyJwk.e,
            kty: publicKeyJwk.kty,
            n: publicKeyJwk.n
        };

        const publicJwkString: string = BrowserCrypto.getJwkString(pubKeyThumprintObj);
        const publicJwkHash = await this.hashString(publicJwkString);

        // Generate Thumbprint for Private Key
        const privateKeyJwk: JsonWebKey = await this.browserCrypto.exportJwk(keyPair.privateKey);
        // Re-import private key to make it unextractable
        const unextractablePrivateKey: CryptoKey = await this.browserCrypto.importJwk(keyOptions, privateKeyJwk, false, keyOptions.privateKeyUsage);
        this.logger.verbose(`Caching ${keyType} keypair`);
        // Store Keypair data in keystore
        await this.cache.asymmetricKeys.setItem(
            publicJwkHash, 
            {
                privateKey: unextractablePrivateKey,
                publicKey: keyPair.publicKey,
                requestMethod: request.resourceRequestMethod,
                requestUri: request.resourceRequestUri
            }
        );
        
        return publicJwkHash;
    }

    /**
     * Removes cryptographic keypair from key store matching the keyId passed in
     * @param kid 
     */
    async removeTokenBindingKey(kid: string): Promise<boolean> {
        await this.cache.asymmetricKeys.removeItem(kid);
        const keyFound = await this.cache.asymmetricKeys.containsKey(kid);
        return !keyFound;
    }

    /**
     * Removes all cryptographic keys from IndexedDB storage
     */
    async clearKeystore(): Promise<boolean> {
        const dataStoreNames = Object.keys(this.cache);
        const databaseStorage = this.cache[dataStoreNames[0]];
        return databaseStorage ? await databaseStorage.deleteDatabase() : false;
    }

    /**
     * Signs the given object as a jwt payload with private key retrieved by given kid.
     * @param payload 
     * @param kid 
     */
    async signJwt(payload: SignedHttpRequest, kid: string): Promise<string> {
        const cachedKeyPair = await this.cache.asymmetricKeys.getItem(kid);
        
        if (!cachedKeyPair) {
            throw BrowserAuthError.createSigningKeyNotFoundInStorageError();
        }

        // Get public key as JWK
        const publicKeyJwk = await this.browserCrypto.exportJwk(cachedKeyPair.publicKey);
        const publicKeyJwkString = BrowserCrypto.getJwkString(publicKeyJwk);

        // Generate header
        const header = {
            alg: publicKeyJwk.alg,
            type: CryptoKeyFormats.jwk
        };
        const encodedHeader = this.b64Encode.urlEncode(JSON.stringify(header));

        // Generate payload
        payload.cnf = {
            jwk: JSON.parse(publicKeyJwkString)
        };
        const encodedPayload = this.b64Encode.urlEncode(JSON.stringify(payload));

        // Form token string
        const tokenString = `${encodedHeader}.${encodedPayload}`;

        // Sign token
        const tokenBuffer = BrowserStringUtils.stringToArrayBuffer(tokenString);
        const signatureBuffer = await this.browserCrypto.sign(CryptoKeyConfig.AccessTokenBinding, cachedKeyPair.privateKey, tokenBuffer);
        const encodedSignature = this.b64Encode.urlEncodeArr(new Uint8Array(signatureBuffer));

        return `${tokenString}.${encodedSignature}`;
    }

    /**
     * Returns the SHA-256 hash of an input string
     * @param plainText
     */
    async hashString(plainText: string): Promise<string> {
        const hashBuffer: ArrayBuffer = await this.browserCrypto.sha256Digest(plainText);
        const hashBytes = new Uint8Array(hashBuffer);
        return this.b64Encode.urlEncodeArr(hashBytes);
    }

    /**
     * Returns the public key from an asymmetric key pair stored in IndexedDB based on the
     * public key thumbprint parameter
     * @param keyThumbprint 
     * @returns Public Key JWK string
     */
    async getAsymmetricPublicKey(keyThumbprint: string): Promise<string> {
        this.logger.verbose("getAsymmetricPublicKey was called, retrieving requested keypair");
        const cachedKeyPair = await this.cache.asymmetricKeys.getItem(keyThumbprint);

        if (!cachedKeyPair) {
            throw BrowserAuthError.createSigningKeyNotFoundInStorageError();
        }

        this.logger.verbose("Successfully retrieved cached keypair from storage, exporting public key component");

        // Get public key as JWK
        const publicKeyJwk = await this.browserCrypto.exportJwk(cachedKeyPair.publicKey);

        this.logger.verbose("Successfully exported public key as JSON Web Key, generating JWK string");
        return BrowserCrypto.getJwkString(publicKeyJwk);
    }

    /**
     * Returns the decrypted server token response
     * @param boundServerTokenResponse 
     * @param request 
     */
    async decryptBoundTokenResponse(
        boundServerTokenResponse: BoundServerAuthorizationTokenResponse,
        request: BaseAuthRequest): Promise<ServerAuthorizationTokenResponse | null> {
        const response = new BoundTokenResponse(boundServerTokenResponse, request, this.cache);
        return await response.decrypt();
    }
}