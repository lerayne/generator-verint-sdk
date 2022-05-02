/* global __dirname */
// eslint-disable-next-line import/no-unused-modules
const path = require('path')

const fs = require('fs')

const webpack = require('webpack')
const TerserPlugin = require('terser-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')

const autoprefixer = require('autoprefixer')

const { getProjectInfo } = require('./build-scripts/getProjectInfo')

// we need variables from package.json and verint-specific widget.json that defines the widget
const PACKAGE_JSON = JSON.parse(fs.readFileSync('./package.json'))

const WIDGETS = getProjectInfo('defaultwidgets')

function generateOptions (env) {
  const PROD = env.mode !== 'development'
  const DEV = env.mode === 'development'

  return {
    DEV,
    PROD,
  }
}

function generatePlugins (widgetConfig, env) {
  const { DEV, PROD } = generateOptions(env)

  const definePluginConfig = {
    PACKAGE_NAME:     JSON.stringify(PACKAGE_JSON.name),
    PACKAGE_VERSION:  JSON.stringify(PACKAGE_JSON.version),
    WIDGET_NAME:      JSON.stringify(widgetConfig.xmlMeta.name),
    WIDGET_SAFE_NAME: JSON.stringify(widgetConfig.safeName),
  }

  console.log('define plugin =', definePluginConfig)

  const plugins = [
    new BundleAnalyzerPlugin({
      analyzerMode:   'static',
      reportFilename: path.join(__dirname, `webpack-analyzer-report_${widgetConfig.safeName}.html`),
      openAnalyzer:   false,
    }),

    // injects globally-available values into product code
    new webpack.DefinePlugin(definePluginConfig),

    new webpack.EnvironmentPlugin({
      NODE_ENV: DEV ? 'development' : 'production',
    }),

    // remove all redundant locales from moment.js (usually we only need english and russian)
    // be careful to comment that line if you're working with client that requires different
    // locales
    new webpack.ContextReplacementPlugin(/moment[/\\]locale$/u, /en-gb|en-us|ru/u),

    /* const cssLoader = ExtractTextPlugin.extract({
      fallback: 'style-loader',
      use: [...CSS_CONFIG]
    }) */

    new MiniCssExtractPlugin({ filename: 'bundle-[name].css' }),
  ]

  // in development mode
  if (DEV) {
    // don't apply source-mapping to files that have the "vendor" in their name, such as
    // "common-vendor.js" or "view-vendor.js". This is used with
    // webpack.optimize.CommonsChunkPlugin to lower the size of the file in dev mode, when
    // source map is applied. Usually, we don't need source-mapping for react or other
    // 3rd-party libraries from "node_modules"
    plugins.push(new webpack.SourceMapDevToolPlugin({
      exclude: /vendor|common/u,
    }))
  }

  // in production mode
  if (PROD) {
    // used for minification of CSS // todo: check!
    plugins.push(new webpack.LoaderOptionsPlugin({ minimize: true }))
  }

  return plugins
}

function generateBabelOptions () {
  return {
    // don't search for .babelrc file in project root. This makes possible optional babel
    // configuration depending on dev/prod and other environments, if needed
    babelrc: false,
    presets: [
      ['@babel/preset-env', {
        modules:     false,
        useBuiltIns: 'usage',
        corejs:      '3.11',
      }],
      '@babel/preset-react',
    ],
    plugins: [
      '@babel/plugin-transform-runtime', // add regenerator, Promise and Symbol
    ],
  }
}

function configureCSSLoader () {
  // CSS-loader config is defined here so that it could be modified to match build environment
  // modes
  return [
    {
      loader: MiniCssExtractPlugin.loader,
    }, {
      loader:  'css-loader',
      options: {
        modules: {
          localIdentName: '[name]__[local]___[hash:base64:5]',
          mode:           'global',
        },
      },
    }, {
      loader: 'sass-loader',
    }, {
      loader:  'postcss-loader',
      options: {
        postcssOptions: {
          plugins: [autoprefixer],
        },
      },
    },
  ]
}

module.exports = function webpackConfig (env = {}) {
  console.log('env =', env)

  const { PROD } = generateOptions(env)

  function createConfig (widgetConfig, webpackConfigExtension) {
    return {
      devtool: false,

      // todo: webpack 4 - check
      mode: PROD ? 'production' : 'development',

      optimization: {
        minimize:  PROD,
        minimizer: [
          // minify JS, remove all console.log() usages. If you want to preserve some logging in
          // production builds, please use console.info or other functions
          // todo: webpack 5 - check
          new TerserPlugin({
            terserOptions: {
              compress: {
                // eslint-disable-next-line camelcase
                pure_funcs: ['console.log'],
              },
            },
          }),
        ],
        splitChunks: {
          cacheGroups: {
            vendor: {
              chunks:  'all',
              name:    'vendor',
              minSize: 0,
              test:    /[\\/]node_modules[\\/]/u,
            },
          },
        },
      },

      resolve: {
        // new babel tries to resolve paths in symlinked (npm link) modules to the link source
        // parent dir. This makes it resolve it to the link target dir (local node_modules)
        symlinks:   false,
        // order in which source files in libraries should be prioritized
        extensions: ['.webpack.js', '.web.js', '.js', '.min.js', '.jsx'],
        alias:      {
          // some old libs use core-js explicitly. To avoid duplicate imports we make it
          // that 'core-js/library' address is imported from the same source as just 'core-js'
          'core-js/library': path.join(__dirname, 'node_modules', 'core-js'),
        },
      },

      module: {
        rules: [
          {
            test:    /\.(?:js|jsx)$/u,
            include: [path.join(__dirname, 'src')],
            use:     [{
              loader:  'babel-loader',
              options: generateBabelOptions(),
            }],
          },
          {
            test: /\.(?:jpg|jpeg|png|gif|svg)$/iu,
            use:  [{
              loader:  'url-loader',
              options: {
                name:     '[name].[ext]',
                // eslint-disable-next-line no-magic-numbers
                limit:    32 * 1024, // 32kb - data-url limit for IE
                esModule: false,
              },
            }],
          },
          {
            test: /.(?:css|sass|scss)$/iu,
            use:  configureCSSLoader(),
          },
          {
            test: /\.(?:woff|woff2|ttf|eot|otf)(?:\?v=[0-9]\.[0-9]\.[0-9])?$/u,
            use:  [{
              loader:  'file-loader',
              options: { name: '[name].[ext]' },
            }],
          },
        ],
      },

      plugins: generatePlugins(widgetConfig, env),

      externals: {
        'verint/jquery': 'jQuery',
      },

      ...webpackConfigExtension,
    }
  }

  return WIDGETS.map(widgetConfig => createConfig(widgetConfig, {
    entry: {
      view:          path.join(__dirname, 'src', widgetConfig.safeName, 'view.jsx'),
      configuration: path.join(__dirname, 'src', widgetConfig.safeName, 'configuration.jsx'),
    },
    output: {
      path:       path.join(__dirname, widgetConfig.widgetsFolder, widgetConfig.folderInstanceId),
      publicPath: '',
      filename:   'bundle-[name].js',
    },
  }))
}
