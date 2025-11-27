const path = require('path');
const pak = require('../package.json');

module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
      [
        'module-resolver',
        {
          extensions: ['.tsx', '.ts', '.js', '.json'],
          alias: {
            // Point to the built files instead of source to avoid TurboModuleRegistry issues
            [pak.name]: path.join(__dirname, '..', 'lib', 'module'),
          },
        },
      ],
    ],
  };
};
