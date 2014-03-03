## Extensions

Encourage other developers to write extensions for your project by providing easy and responsible access to hooks inside your code.

## Initial release information

This code is still very immature, but it works, and we will try avoid changes to the API.  Be in touch early if you disagree with choices for names, approaches, etc.  In this early stage, all functions and data are public, but this behaviour is not guaranteed for the future.  If you need to access "internal" information, please let us know what you're doing and why, so we can add a proper function to handle this scenario.  It is my hope that we can collaboratively make this a very useful smart package for everyone.

## Hooks vs Plugins

### Hooks

Hooks are generally used for lower level extensions, that sit in the middle of the existing work flow of an application to do extra things (act on or change information).  A single hook may end up invoking any number of functions from various different extensions.

```js
{
	hooks: {
		'render': { api: '0.1.0', func: sanitize }
	}
}
```

### Plugins

Plugins are generally used for higher level extensions, and rely on a unique keyword to call it.  Calling a plugin is guaranteed to execute at most 1 function (or none).  Note that the JSON used to register a plugin includes TWO keys, both the name of the hook it's plugging into AND the unique keyword it wants to be registered with.

```js
{
	plugins: {
		tag: {
			'b': { api: '0.1.0', func: bold },
			'img': { api: '0.1.0', func: img }
		}
	}
}
```

### Example of the difference

An example extension uses a hook to process all output an provide support for
{{functions}} in user input.  In addition to it's own functionality, it would like to allow other extensions to "plug in" to this lower level code.  e.g. {{#func: data}} could be used to call a plugin that has registered itself with the name 'func' with the original 'parser' extension (see the smart package meteorpedia-mediawiki for this particular
example).


## Implementing extensions support

### Writing a new extension

To register your extension, use something like this:

```js
Extensions.add({
	name: "cite",
	version: "0.1.0",
	author: "Gadi Cohen <dragon@wastelands.net>",
	description: "<ref>url</ref>, <references />, like in mediawiki",
	hooks: {
		mwRenderInit: { api: '0.1.0', func: function() { refs = []; }}
	},
	plugins: {
		tag: {
			'ref': { api: '0.1.0', func: citeRef },
			'references': { api: '0.1.0', func: citeReferences }
		}
	}
});
```

**See the documentation of the app or package you're writing an extension for to see which regular hooks and which plugin hooks are available for your use, what arguments will be
provided to them, and what return result is expected.**  These details will differ by API version, hence the importance of specifying which version of the API for that particular
hook you are using.

### Adding extension support to your project

**Extensions.runHookChain(hookName, initial)**

```js
/**
 * Runs a 'chain' of hooks (the output of each func is the input of the next)
 * @param {String} hookName - e.g. 'render'
 * @param {Object} initial - the initial string/object to pass to beginning of chain
 * @return {Object} - the "initial" object after passing through end of the chain
 */
```

Example:

Let extensions change a document object before being inserted into the database.

*App:*

```js
function newDoc(name, content) {
	var doc = { name: name, content: content }
	doc = Extensions.runHookChain('storyInsert', doc);
	collection.insert(doc);
}
Extensions.registerHookTtpe('storyInsert', '0.1.0', legacyWrapperFunc*);
```

* coming soon / TODO.  can be ommitted for none.

*Extension:*
```js
Extensions.add({
	// ...
	  hooks: {
	  	'storyInsert': { api: '0.1.0', func: addTags_storyInsert }
	  }
	// ...
});
function addTags_storyInsert(doc) {
	doc.tags = findTagsInContent(doc.content);
	return doc;
}
```

**Extensions.runFirstTrueHook = function(hookName, data)**

```js
/**
 * Run the first matching hook function for the given data, usually used to see if we
 * have any other extensions that will handle a case before we continue with the
 * defaut behaviour
 * @param {String} hookName - e.g. 'render'
 * @param {Object} data - the string/object to act on
 * @return {Object} - { data: data, ranSomething: true/false }
 */
 ```

**Extensions.runHooks = function(hookName, data)**
```js
/**
 * Run all the hookName hooks.  Use this for non-chained input.
 * @param {String} hookName - e.g. 'render'
 * @param {Object} data - the data to pass to each function
 */
 ```

**Extensions.runPlugin = function(hookName, pluginName, args)**
```js
/**
  * Runs the KEY plugin of the TYPE hook.
  * @param {String} hookName - e.g. 'tag'
  * @param {String} pluginName - e.g. 'h1'
  * @param {Object} args - any other data needed by the function
  * @return - return value of the function, false if it didn't exist
  */
```

Any of your functions that use the above code should be followed by one of the following lines to specify your API version.  See the note on Versioning below to decide when to change your API version.

```js
Extensions.registerHookType(hookName, apiVersion);
Extensions.registerPluginType(hookName, apiVersion);
```

## Object orientated way

Useful for multi file extensions, and for good readability without declaring
/ naming functions outside of the extension scope.

In first loaded file:

```js
ext = new Extension({
    name: "digitalocean",
    version: "0.1.0",
    author: "Gadi Cohen <dragon@wastelands.net>",
    description: "Digital Ocean support for WMD"
});
```

Anywhere else in your package:

```js
ext.addHook('ssh.keygen', '0.1.0', sshKeyGenCallback(args));
ext.registerPlugin('addApp', 'gitHub', '0.1.0', function(args) {
	
});
```

etc

## About Versioning

An API is a contract between developers, a promise about how a function will behave
(and what data it will return) given specific parameters.  During development, ultimately
APIs change and this can break old code that depends on them.  Meteor-extensions implements
versioning control on a per-hook / per-plugin basis.  This ensures that only code that
will work as aspected will be run.

Software version numbers often take the form of 1.2.3, where 1 is the major version, 2 is the minor version, and 3 is the revision.  The table below explains the different scenarios:

<table>
	<tr>
		<th>Version no</th>
		<th>Run Condition</th>
		<th>When to increment</th>
	</tr><tr>
		<td>Major (1.x.x)</td>
		<td>if extensionApi.minor == hookApi.minor</td>
		<td>Change the major version number if you are breaking compatibity
			with older code, e.g. removing variables that were previously
			provided, expecting a different type of return value.</td>
	</tr><tr>
		<td>Minor (x.2.x)</td>
		<td>if extensionApi.minor >= hookApi.minor</td>
		<td>Adding new features while maintaining backwards compatibility.
			Old code is guaranteed to still run without changes (even though
			more advanced features are available to extensions using the newer
			API).</td>
	</tr><tr>
		<td>Revision (x.x.3)</td>
		<td>Ignored</td>
		<td>Spelling, speed improvements, or any other change that
			has zero impact on the API (no new features).  Bug fixes
			are ok if they correct a previously documented expected
			behaviour.</td>
	</tr>
</table>

## TODO

1. funcs should be able to mark themselves as 'required', and if that particular
func fails the version check, all functions the extension provides should be
disabled.

2. allow apps to provide a legacyWrapper which will wrap/map the callling
parameters and return values of extensions not compatible with current API.

3. Extension.add should be re-runable if same extension name + version are
provided (this is useful for server/client/common code).

4. Complete priority support, to ensure that inserted hooks respect the ordering.
Better yet, provide "before:" and "after:" properties to ensure inserted hooks
are put in the right place.  (or "requires")