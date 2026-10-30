/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // notes are read from disk; ship them with every function so ISR
    // revalidation (e.g. the home page's Writing section) still finds them
    outputFileTracingIncludes: { "/**/*": ["./content/notes/**/*"] },
  },
};

export default nextConfig;
