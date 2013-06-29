Extensions = {
	hooks: {}, hookApis: {}, plugins: {}, pluginApis: {}, extensions: []
};

Extensions.registerHookType = function(hookName, apiVersion) {
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
Extensions.registerPluginType = function(hookName, apiVersion) {
	if (this.plugins[hookName]) {

		if (this.pluginApis[hookName] && this.pluginApis[hookName] != apiVersion)
			console.log('Error: Attempt to reregister plugin type "' + hookName
				+ '" with different API version (was: ' + this.hookApis[hookName]
				+ ', attempted: ' + apiVersion);

		for (key in this.plugins[hookName])
			if (!this.versionCheck(apiVersion, this.plugins[hookName][key]))
				this.plugins[hookName][key].state = 'disabled-api';

	} else {

		this.pluginApis[hookName] = apiVersion;
	}
}

Extensions.stateFromVersion = function(hookApiObj, extensionApi) {
	if (hookApiObj) {
		return this.versionCheck(hookApiObj, extensionApi)
			? 'enabled' : 'disabled-api';
	} else {
		// the hook hasn't been registered yet.  add now, check hook registered.
		return 'enabled';
	}
}

Extensions.addHook = function(hookName, extName, extObj) {
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

	this.extensions.push({
		name: extObj.name,
		author: extObj.author,
		version: extObj.version,
		description: extObj.description
	});
}

Extensions.registerPlugin = function(hookName, extName, extObj, key) {
	// we don't REQUIRE the hook to exist first, to allow for flexible page load order
	if (!this.plugins[type])
		this.plugins[type] = {};

	this.plugins[type][key] = {
		extName: extName,
		func: extObj.func,
		api: extObj.api,
		state: this.stateFromVersion(this.hookApis[hookName], extObj.api)
	};

	this.extensions.push({
		name: extObj.name,
		author: extObj.author,
		version: extObj.version,
		description: extObj.description
	});
}


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
		if (this.hooks[hookName][i].state == 'enabled')
			initial = this.hooks[hookName][i].func(initial);
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
		hookData = this.hooks[hookName][i].func(hookData);
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
		if (this.hooks[hookName][i].state == 'enabled')
			this.hooks[hookName][i].func(data);
	}

}

/**
  * Runs the KEY plugin of the TYPE hook.
  * @param {String} hookName - e.g. 'tag'
  * @param {String} pluginName - e.g. 'h1'
  * @param {Object} args - any other data needed by the function
  * @return - return value of the function, false if it didn't exist
  */
Extensions.runPlugin = function(hookName, pluginName, args) {
	if (this.plugins[hookName] && this.plugins[hookName][pluginName]
			&& this.plugins[hookName][pluginName].state == 'enabled')
		return this.plugins[hookName][pluginName].func(args);
	else
		return false;
}
