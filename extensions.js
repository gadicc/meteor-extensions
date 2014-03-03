Extensions = {
	hooks: {}, hookApis: {}, plugins: {}, pluginApis: {}, extensions: {}
};

Extensions.declareHook = function(hookName, apiVersion) {
	if (this.hooks[hookName]) {

		if (this.hookApis[hookName] && this.hookApis[hookName] != apiVersion)
			console.log('Error: Attempt to reregister hook "' + hookName
				+ '" with different API version (was: ' + this.hookApis[hookName]
				+ ', attempted: ' + apiVersion);

		for (var i=0; i < this.hooks[hookName].length; i++)
			if (!this.versionCheck(apiVersion, this.hooks[hookName][i].api))
				this.hooks[hookName][i].state = 'disabled-api';

	} else {

		this.hookApis[hookName] = apiVersion;
	}
}
// deprecated
Extensions.registerHookType = Extensions.declareHook;

Extensions.declarePlugin = function(hookName, apiVersion) {
	if (this.plugins[hookName]) {

		if (this.pluginApis[hookName] && this.pluginApis[hookName] != apiVersion)
			console.log('Error: Attempt to reregister plugin type "' + hookName
				+ '" with different API version (was: ' + this.hookApis[hookName]
				+ ', attempted: ' + apiVersion);

		for (key in this.plugins[hookName]) {
			if (!this.versionCheck(apiVersion, this.plugins[hookName][key].api))
				this.plugins[hookName][key].state = 'disabled-api';
		}

	} else {

		this.pluginApis[hookName] = apiVersion;
	}
}
// deprecated
Extensions.registerPluginType = Extensions.declarePlugin;

Extensions.stateFromVersion = function(hookApiObj, extensionApi) {
	if (hookApiObj) {
		return this.versionCheck(hookApiObj, extensionApi)
			? 'enabled' : 'disabled-api';
	} else {
		// the hook hasn't been registered yet.  add now, check hook registered.
		return 'enabled';
	}
}

Extensions.on = function(hookName, extName, extObj) {
	// we don't REQUIRE the hook to exist first, to allow for flexible page load order
	if (!this.hooks[hookName]) {
		this.hooks[hookName] = [];
	}

	var hookObj = {
		extName: extName,
		func: extObj.func,
		api: extObj.api,
		priority: extObj.priority ? extObj.priority : 0,
		state: this.stateFromVersion(this.hookApis[hookName], extObj.api)
	};

	/* TODO: insert into correct place based on _priority_ and _requires_ clauses */
	if (extObj.priority == -1)
		this.hooks[hookName] = _.union([hookObj], this.hooks[hookName]);
	else
		this.hooks[hookName].push(hookObj);
}
// deprecated
Extensions.addHook = Extensions.on;

Extensions.plugin = function(hookName, extName, extObj, pluginName) {
	// we don't REQUIRE the hook to exist first, to allow for flexible page load order
	if (!this.plugins[hookName])
		this.plugins[hookName] = {};

	this.plugins[hookName][pluginName] = {
		extName: extName,
		func: extObj.func,
		api: extObj.api,
		state: this.stateFromVersion(this.hookApis[hookName], extObj.api)
	};
}
// deprecated
Extensions.registerPlugin = Extensions.plugin;

Extensions.versionCheck = function(hookApi, extensionApi) {
	var matches;

	matches = /v{0,1}([0-9]+)\.([0-9]+)\.([0-9])+/.exec(hookApi);
	hookApi = { major: matches[1], minor: matches[2], revision: matches[3]};

	matches = /v{0,1}([0-9]+)\.([0-9]+)\.([0-9])+/.exec(extensionApi);
	extensionApi = { major: matches[1], minor: matches[2], revision: matches[3]};

	if (hookApi.major != extensionApi.major)
		return false;
	if (hookApi.minor < extensionApi.minor)
		return false;

	return true;
}

/* Public Functions */

/**
 * Main public function to add a new extension to the wiki.  See extensions/README.md
 */
Extensions.add = function(extData) {
	if (this.extensions[extData.name]) {
		console.log('An extension called "' + extData.name + "' already exists.");
		return;
	}

	this.extensions[extData.name] = {
		name: extData.name,
		author: extData.author,
		version: extData.version,
		description: extData.description
	};

	if (extData.hooks)
	for (hookName in extData.hooks) {
		this.addHook(hookName, extData.name, extData.hooks[hookName]);
	}

	if (extData.plugins)
	for (type in extData.plugins)
		for (key in extData.plugins[type])
			this.registerPlugin(type, extData.name, extData.plugins[type][key], key);
}

/**
 * Runs a 'chain' of hooks (the output of each func is the input of the next)
 * @param {String} hookName - e.g. 'render'
 * @param {Object} initial - the initial string/object to pass to beginning of chain
 * @return {Object} - the "initial" object after passing through end of the chain
 */
Extensions.runHookChain = function(hookName, initial) {
	if (this.hooks[hookName])
	for (var i=0; i < this.hooks[hookName].length; i++) {
		if (this.hooks[hookName][i].state == 'enabled') {
			try {
				initial = this.hooks[hookName][i].func(initial);
			}
			catch (error) {
				error_full(error, this.hooks[hookName][i].extName, hookName);
			}
		}
	}
	return initial;
}

/**
 * Run the first matching hook function for the given data, usually used to see if we
 * have any other extensions that will handle a case before we continue with the
 * defaut behaviour
 * @param {String} hookName - e.g. 'render'
 * @param {Object} data - the string/object to act on
 * @return {Object} - { data: data, ranSomething: true/false }
 */
Extensions.runFirstTrueHook = function(hookName, data) {
	var hookData = { data: data };
	if (this.hooks[hookName])
	for (var i=0; i < this.hooks[hookName].length; i++) {
		if (this.hooks[hookName][i].state != 'enabled')
			continue;
		try {
			hookData = this.hooks[hookName][i].func(hookData);
		}
		catch (error) {
			error_full(error, this.hooks[hookName][i].extName, hookName);
		}
		if (hookData.ranSomething) break;
	}
	return hookData;
}

/**
 * Run all the hookName hooks.  Use this for non-chained input.
 * @param {String} hookName - e.g. 'render'
 * @param {Object} data - the data to pass to each function
 */
Extensions.runHooks = function(hookName, data) {

	if (this.hooks[hookName])
	for (var i=0; i < this.hooks[hookName].length; i++) {
		if (this.hooks[hookName][i].state == 'enabled') {
			try {
				this.hooks[hookName][i].func(data);
			}
			catch (error) {
				error_full(error, this.hooks[hookName][i].extName, hookName);
			}
		}
	}

}

/**
  * Runs the KEY plugin of the TYPE hook.
  * @param {String} hookName - e.g. 'tag'
  * @param {String} pluginName - e.g. 'h1'
  * @param {Object} args - any other data needed by the function
  * @param {Boolean} required - throw an error if none exist
  * @return - return value of the function, undefined if it didn't exist
  */
Extensions.runPlugin = function(hookName, pluginName, args, required) {
	var out;
	if (this.plugins[hookName] && this.plugins[hookName][pluginName]
			&& this.plugins[hookName][pluginName].state == 'enabled') {
		try {
			out = this.plugins[hookName][pluginName].func(args);
			return out;
		}
		catch (error) {
			error_full(error, this.plugins[hookName][pluginName].extName,
				hookName + '/' + pluginName);
		}
	} else {
		if (required)
			throw new Error('Plugin "' + hookName + ':' + pluginName + '" was '
				+ 'marked as required but does not exist!');
		else
			return undefined;
	}
}

function error_full(error, extname, hookName) {
	var out = '[ERROR] Extension "' + extname + '" is breaking on hook "'
		+ hookName + '":\n'
		+ '   ' + error.toString();

	if (error && Error.captureStackTrace) {
		// https://code.google.com/p/v8/wiki/JavaScriptStackTraceApi
		// http://www.devthought.com/2011/12/22/a-string-is-not-an-error/
		var orig = Error.prepareStackTrace;
		Error.prepareStackTrace = function(error, stack) {
			return stack;
		}
		Error.captureStackTrace(error_full);

		for (var i=0; i < 1; i++)
			out += '\n   at ' + error.stack[i].getFunctionName() + ' ('
			+ error.stack[i].getFileName() + ':'
			+ error.stack[i].getLineNumber() + ':'
			+ error.stack[i].getColumnNumber() + ')';

		Error.prepareStackTrace = orig;
	}
	console.log(out);
}

Extension = function(extData) {
    Extensions.add(extData);
    this.meta = Extensions.extensions[extData.name];
}
Extension.prototype.on = function(hookName, api, func, options) {
    Extensions.on(hookName, this.meta.name, {
        func: func,
        api: api,
        priority: options && options.priority || 0
    });
}
Extension.prototype.plugin = function(hookName, pluginName, api, func, options) {
    Extensions.plugin(hookName, this.meta.name, {
        func: func,
        api: api,
        priority: options && options.priority || 0
    }, pluginName);
}
