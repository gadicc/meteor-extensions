Package.describe({
  name: 'gadicohen:extensions',
  version: '1.0.0',
  summary: 'Hooks to offer and use extensions and plugins',
  git: 'https://github.com/gadicc/meteor-extensions',
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0.3.2');
  api.use('jag:pince@0.0.6');
  api.addFiles('extensions.js');
  api.export(['ExtensionFacility', 'Extension', 'Extensions']);
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('gadicohen:extensions');
//  api.addFiles('x-tests.js');
});
