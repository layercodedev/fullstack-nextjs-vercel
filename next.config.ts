import type { NextConfig } from "next";
import path from "node:path";

type NextConfigWithTurbo = NextConfig & {
  turbopack?: {
    resolveAlias?: Record<string, string>;
  };
};

const useLocalSdks = process.env.USE_LOCAL_SDKS === "true";
const workspaceRoot = path.resolve(__dirname, "..");
const layercodeSdkPath = path.join(workspaceRoot, "layercode-react-sdk");
const turboAliasTarget = "./layercode-react-sdk";

const nextConfig: NextConfigWithTurbo = {
  reactStrictMode: false,
  webpack: (config) => {
    if (useLocalSdks) {
      config.resolve ??= {};
      config.resolve.alias ??= {};
      config.resolve.alias["layercode-react-sdk"] = layercodeSdkPath;
    }
    return config;
  },
};

if (useLocalSdks) {
  nextConfig.outputFileTracingRoot = workspaceRoot;
  nextConfig.turbopack = {
    ...(nextConfig.turbopack ?? {}),
    root: workspaceRoot,
    resolveAlias: {
      ...(nextConfig.turbopack?.resolveAlias ?? {}),
      "layercode-react-sdk": turboAliasTarget,
    },
  };
} else {
  // Provide an empty config so Next doesn't warn when webpack overrides exist.
  nextConfig.turbopack = nextConfig.turbopack ?? {};
}

export default nextConfig;
