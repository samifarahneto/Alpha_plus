const path = require("path");

module.exports = {
  style: {
    postcss: {
      plugins: [require("tailwindcss"), require("autoprefixer")],
      loaderOptions: (postcssLoaderOptions) => {
        postcssLoaderOptions.postcssOptions.plugins = [
          require("tailwindcss"),
          require("autoprefixer"),
        ];
        return postcssLoaderOptions;
      },
    },
  },
  webpack: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  devServer: {
    setupMiddlewares: (middlewares, devServer) => {
      // Substitui onAfterSetupMiddleware
      return middlewares;
    },
  },
};
