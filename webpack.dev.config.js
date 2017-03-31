const webpack = require('webpack');
const path = require('path');

module.exports = {
    entry: {
      vendors: ['react', 'react-dom', 'react-router'],
      app: "./src/main.js",
    },
    // externals: {
    //     "react": "React",
    //     "react-dom": "ReactDOM"
    // },
    resolve: {
      modules: [
        path.resolve(__dirname),
        "node_modules"
      ],
      alias: {
        'src': 'src'
      },
      extensions: ['.js', '.jsx']
    },
    output: {
        publicPath: "/build/",
        filename: "[name].js"
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: "babel-loader"
            },
            {
                test: /\.less$/,
                use: [{
                    loader: "style-loader" // creates style nodes from JS strings
                }, {
                    loader: "css-loader" // translates CSS into CommonJS
                }, {
                    loader: "less-loader" // compiles Less to CSS
                }]
            },
            {
                test: /\.css$/,
                use: [ 'style-loader', 'css-loader' ]
            },
            {
                test: /\.(png|jpg)$/,
                loader: "url-loader?limit=8192"
            }
        ]
    },
    plugins: [
        new webpack.optimize.CommonsChunkPlugin({
          name: 'vendors',
          filename: 'vendors.js'
        }),
        //
        // new webpack.DefinePlugin({
        //   'process.env': {
        //     'NODE_ENV': JSON.stringify('production')
        //   }
        // }),
        //
        // new webpack.optimize.UglifyJsPlugin({
        //     compress: {
        //         warnings: false
        //     }
        // })
    ]
};
