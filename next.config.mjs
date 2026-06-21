/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // r3f + AnimationMixer double-mounts oddly under StrictMode in dev
  webpack: (config) => {
    // allow importing GLSL-ish / binary model assets if ever needed
    config.module.rules.push({
      test: /\.(glb|gltf|fbx)$/,
      type: "asset/resource",
    });
    return config;
  },
};

export default nextConfig;
