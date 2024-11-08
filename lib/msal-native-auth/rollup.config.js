/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import typescript from "@rollup/plugin-typescript";
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
        treeshake: {
            moduleSideEffects: false,
            propertyReadSideEffects: false
        },
        external: [
            ...Object.keys(pkg.dependencies || {}),
        ],
        plugins: [
            typescript({
                typescript: require("typescript"),
                tsconfig: "tsconfig.build.json",
                compilerOptions: { outDir: "lib/types" },
                sourceMap: true
            }),
            createPackageJson({ libPath: __dirname})
        ]
    }
];
