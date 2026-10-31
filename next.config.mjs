/** Keep test compilations separate from the user's running development server. */
const config = {
  distDir: process.env.COMMONPLACE_DIST_DIR || '.next',
  outputFileTracingRoot: process.cwd(),
};
export default config;
