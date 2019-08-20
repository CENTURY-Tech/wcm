# Web Components Manager

[![npm](https://img.shields.io/npm/v/wcm.svg?style=flat-square)][1]
[![prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)][2]

## Description

This project is an attempt to unify how vanilla Web Components are bundled, distributed, imported, and generally managed as a whole. We're targeting HTML first Web Components, and currently support TypeScript and JavaScript (potentially more languages will be supported in future releases).

WCM gives you an incredible level of control over which dependencies are imported by your application, and at what versions.

## Legacy Mode

Not every browser supports Service Workers in all cases, some restrict this feature in private tabs, some are just plain old. If you need to support these cases, WCM can run in legacy mode, allowing the browser to import your dependencies as if WCM wasn't there at all, but does require an extra build step when deploying.

## Installation

You can install the CLI from [NPM][1], it should be saved as a development dependency, but you could install it globally if required.

```bash
npm i wcm -D
```

To configure WCM in your project, you have a number of options thanks to the use of [cosmiconfig][3] internally. You can choose between any of the following.

1. A `wcm` property in your projects `package.json`
2. A `.wcmrc` file written in either JSON or YAML format
3. A `wcm.config.js` file exporting a JS object

## Development

Running the following will install this projects dependencies, and build WCM for the first time.

```bash
npm ci
```

After you've installed the projects dependencies, you can build this project by running the following command.

```bash
npm run prepare
```

[1]: https://www.npmjs.com/package/wcm
[2]: https://github.com/prettier/prettier
[3]: https://www.npmjs.com/package/cosmiconfig
