# extensions

## Implementation

### For the app/package providing an **extension facility**

**For a package**

Add a new instance to your globally exported object, e.g.:

```js
Extensions = new ExtensionFacility('packageName');  // can be private
Bubblez.Extension = Extensions.Extension;           // public export
```

**For an app:**

No action required, `Extension` and `Extensions` globals are provided
automatically (allowing app extensions to be initialized before Meteor.startup).

### For the package *providing* the extension

You need to know the global being provided (see the docs of the app you're
trying to extend), e.g.:

```js
var ext = new Package.Extension(extName, version, shortDesc)
```

## Logging

Logger.setLevel('extensions', 'trace');
