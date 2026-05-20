const detoxDevice = process.env.DETOX_DEVICE || 'iPhone 17';

/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  behavior: {
    init: {
      exposeGlobals: true,
    },
  },
  artifacts: {
    rootDir: 'artifacts',
    plugins: {
      log: { enabled: true },
      screenshot: {
        enabled: true,
        shouldTakeAutomaticSnapshots: true,
        keepOnlyFailedTestsArtifacts: false,
        takeWhen: {
          testStart: false,
          testDone: true,
          appNotReady: true,
          testFailure: true,
        },
      },
      video: {
        enabled: true,
        keepOnlyFailedTestsArtifacts: true,
      },
      uiHierarchy: 'enabled',
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/Toki.app',
      build: `xcodebuild -workspace ios/Toki.xcworkspace -scheme Toki -configuration Debug -sdk iphonesimulator -destination "platform=iOS Simulator,name=${detoxDevice}" -derivedDataPath ios/build ONLY_ACTIVE_ARCH=YES ARCHS=arm64`,
    },
    'ios.release': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/Toki.app',
      build: `xcodebuild -workspace ios/Toki.xcworkspace -scheme Toki -configuration Release -sdk iphonesimulator -destination "platform=iOS Simulator,name=${detoxDevice}" -derivedDataPath ios/build ONLY_ACTIVE_ARCH=YES ARCHS=arm64`,
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: detoxDevice,
      },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    'ios.sim.release': {
      device: 'simulator',
      app: 'ios.release',
    },
  },
};
