const path = require('path');
const pkg = require('../package.json');
const { configureProjects } = require('react-native-test-app');

// Disable automatic Gradle wrapper configuration because we need Gradle 8.11.1 for AGP 8.9.1
// react-native-test-app would force Gradle 8.8 for React Native 0.75
process.env.RNTA_CONFIGURE_GRADLE_WRAPPER = '0';

module.exports = {
  project: configureProjects({
    android: {
      sourceDir: 'android',
    },
    ios: {
      sourceDir: 'ios',
      automaticPodsInstallation: true,
    },
  }),
  dependencies: {
    [pkg.name]: {
      root: path.join(__dirname, '..'),
    },
  },
};
