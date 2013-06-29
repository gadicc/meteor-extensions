Package.describe({
    summary: "Add support for extensions (hooks, plugins) to your app"
});

Package.on_use(function (api) {
    api.add_files('extensions.js', ['client', 'server']);
});
