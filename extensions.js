var log = new Logger('extensions');
Logger.setLevel('extensions', 'trace');

ExtensionFacility = function(_name) {
  var name = _name;
  var extensions = {};
  var hooks = {};
  var hookCallbacks = {};
  var Extensions = this;

  Extensions.Extension = function Extension(name, version, desc) {
    var Extension = this;
    Extension.name = name;
    Extension.version = version;
    Extension.desc = desc;

    extensions[name] = Extension;

    Extension.onHook = function(hook, api, func) {
      var vc;

      if (!hooks[hook])
        throw new Error('[extensions] No such hook "' + hook + '"');


      vc = versionCompare(hooks[hook], semver(api));
      if (vc > 0)
        log.warn('Extension "' + Extension.name + '" is too new');
      else if (vc < 0)
        log.warn('Extension "' + Extension.name + '" is too old');
      else
        hookCallbacks[hook].push({ api: api, func: func, extName: Extension.name });
    }
  };

  Extensions.registerHook = function(hook, api) {
    hooks[hook] = semver(api);
    hookCallbacks[hook] = [];
  };

  //Extensions.legacyHook = function(hookName, api, thisObj, )

  Extensions.runHook = function(hookName, thisObj /*, arguments */) {
    log.trace('Running hook: ' + hookName);

    var i, args = Array.prototype.slice.call(arguments, 2);
    var callbacks = hookCallbacks[hookName];

    for (i=0; i < callbacks.length; i++) {
      log.trace('* from ext ' + callbacks[i].extName);
      try {
        callbacks[i].func.apply(thisObj, args);
      } catch (err) {
        log.error(callbacks[i].extName + ' is erroring on hook ' + hookName, err);
      }
    }
  };

  Extensions.getExtensions = function(name, version, desc) {
    return _.clone(extensions);
  };

  // XXX debug
  Extensions.showPrivates = function() {
    return {
      hooks: hooks,
      hookCallbacks: hookCallbacks
    }
  }
};

function semver(str) {
  str = str.split('.');
  return {
    major: parseInt(str[0]),
    minor: parseInt(str[1]),
    patch: parseInt(str[2])
  };
}

// See README.  return 1 = ext too new, 0 is ok, -1 ext too old
function versionCompare(provider, extension) {
  var res;
  res = extension.major - provider.major;
  if (res) return res;
  res = extension.minor - provider.minor;
  return (res <= 0) ? 0 : 1;
}

// For app-level extensions (so packages can register before Meteor.startup)
Extensions = new ExtensionFacility('app');
Extension = Extensions.Extension;

Extensions.registerHook('speak', '1.0.0');
ext = new Extension('moo');
ext.onHook('speak', '1.0.0', function() {
  console.log('moo');
});
Extensions.runHook('speak');
