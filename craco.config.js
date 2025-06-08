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
    configure: (webpackConfig) => {
      // Adicionar fallbacks para resolver erros de dependências
      webpackConfig.resolve = {
        ...webpackConfig.resolve,
        fallback: {
          ...webpackConfig.resolve.fallback,
          buffer: false,
          crypto: false,
          stream: false,
          util: false,
          assert: false,
          http: false,
          https: false,
          os: false,
          url: false,
          fs: false,
          path: false,
        },
      };

      // Adicionar define plugin para variáveis globais
      const webpack = require("webpack");
      webpackConfig.plugins.push(
        new webpack.DefinePlugin({
          global: "window",
          "process.env.NODE_ENV": JSON.stringify(
            process.env.NODE_ENV || "development"
          ),
        })
      );

      return webpackConfig;
    },
  },
  devServer: {
    setupMiddlewares: (middlewares, devServer) => {
      // Substitui onAfterSetupMiddleware
      return middlewares;
    },
  },
};
