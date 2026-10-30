/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // files read from disk at render time; ship them with every function so ISR
  // revalidation still finds them — notes (e.g. the home page's Writing
  // section) and worklog entries (src/lib/worklog.ts)
  outputFileTracingIncludes: {
    "/**/*": ["./content/notes/**/*"],
    "/**": ["./src/data/worklog/**"],
  },
};

export default nextConfig;
