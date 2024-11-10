/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import pkg from "./package.json";
import { createPackageJson } from "rollup-msal";

const libraryHeader = `/*! ${pkg.name} v${pkg.version} ${new Date().toISOString().split("T")[0]} */`;
const useStrictHeader = "'use strict';";
const fileHeader = `${libraryHeader}\n${useStrictHeader}`;

export default [
    {
        // for es build
        input: "src/index.ts",
        output: {
            dir: "dist",
            preserveModules: true,
            preserveModulesRoot: "src",
            format: "es",
            entryFileNames: "[name].mjs",
            banner: fileHeader,
            sourcemap: true,
        },
        treeshake: {
            moduleSideEffects: false,
            propertyReadSideEffects: false
        },
        external: [
            ...Object.keys(pkg.dependencies || {})
        ],
        plugins: [
            typescript({
                typescript: require("typescript"),
                tsconfig: "tsconfig.build.json"
            })
        ]
    },
    {
        input: "src/index.ts",
        output: {
            dir: "lib",
            format: "cjs",
            entryFileNames: "msal-native-auth.cjs",
            banner: fileHeader,
            sourcemap: true,
            inlineDynamicImports: true,
        },
        external: [
            ...Object.keys(pkg.dependencies || {}),
        ],
        plugins: [
            nodeResolve({
                browser: true,
                resolveOnly: ["@azure/msal-browser", "tslib"],
            }),
            typescript({
                typescript: require("typescript"),
                tsconfig: "tsconfig.build.json",
                compilerOptions: { outDir: "lib/types" },
                sourceMap: true
            }),
            createPackageJson({ libPath: __dirname})
        ]
    },
    {
        input: "src/index.ts",
        output: [
            {
                dir: "lib",
                format: "umd",
                name: "msal",
                banner: fileHeader,
                inlineDynamicImports: true,
                sourcemap: true,
                entryFileNames: "msal-native-auth.js",
                globals: {
                    '@azure/msal-common/browser': 'browser',
                }
            },
        ],
        plugins: [
            nodeResolve({
                browser: true,
                resolveOnly: ["@azure/msal-browser", "tslib"],
            }),
            typescript({
                typescript: require("typescript"),
                tsconfig: "tsconfig.build.json",
                sourceMap: true,
                compilerOptions: { outDir: "lib/types", declaration: false, declarationMap: false },
            }),
        ],
    },
    {
        // Minified version of msal
        input: "src/index.ts",
        output: [
            {
                dir: "lib",
                format: "umd",
                name: "msal",
                entryFileNames: "msal-native-auth.min.js",
                banner: useStrictHeader,
                inlineDynamicImports: true,
                sourcemap: false,
                globals: {
                    '@azure/msal-common/browser': 'browser',
                }
            },
        ],
        plugins: [
            nodeResolve({
                browser: true,
                resolveOnly: ["@azure/msal-browser", "tslib"],
            }),
            typescript({
                typescript: require("typescript"),
                tsconfig: "tsconfig.build.json",
                sourceMap: false,
                compilerOptions: { outDir: "lib/types", declaration: false, declarationMap: false },
            }),
            terser({
                output: {
                    preamble: libraryHeader,
                },
            }),
        ],
    },
    {
        // sample
        input: "samples/index.ts",
        output: [
            {
                dir: "samples/lib",
                format: "umd",
                name: "msal",
                entryFileNames: "msal-native-auth.samples.js",
                banner: useStrictHeader,
                inlineDynamicImports: true,
                sourcemap: false,
            },
        ],
        plugins: [
            typescript({
                typescript: require("typescript"),
                tsconfig: "tsconfig.samples.json",
                sourceMap: false,
                compilerOptions: { outDir: "samples/lib/types", declaration: false, declarationMap: false },
            }),
        ],
    },
];
