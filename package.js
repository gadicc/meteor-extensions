Package.describe({
    summary: "Add support for extensions (hooks, plugins) to your app"
});

Package.on_use(function (api) {
	api.use('underscore', ['client', 'server']);
    api.add_files('extensions.js', ['client', 'server']);
    if (api.export)
    	api.export('Extensions', ['client', 'server']);
});
