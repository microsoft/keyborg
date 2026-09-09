# Keyborg ⌨️🤖

Keyborg is a library that tracks the state of current keyboard input on a web page through focus events.

**It does not do anything invasive to the DOM** but provides an event subscription system that allows users to choose how they want to react to changes in focus.

## Getting started

### Installation

```bash
# NPM
npm install --save keyborg
# Yarn
yarn add keyborg
```

### Usage

```js
import { createKeyborg } from "keyborg";

// initializes keyborg on the current window
const keyborg = createKeyborg(window);

// This is called every time the keyboard input state changes
const handler = (isUsingKeyboard) => {
  if (isUsingKeyboard) {
    document.body.setAttribute("data-is-keyboard", "true");
  } else {
    document.body.removeAttribute("data-is-keyboard");
  }
};

keyborg.subscribe(handler);
keyborg.unsubscribe(handler);
```

## Contributing

Use Node.js 24.x (24.11.0 or newer). Common commands:

- `yarn install --immutable` - install dependencies from the lockfile
- `yarn build` - builds the library
- `yarn format:fix` - runs prettier to format code
- `yarn lint:fix` - runs eslint and fixes issues

TypeScript remains on 6.0 until typescript-eslint supports TypeScript 7.

Versioning is handled using `release-it`. `beachball` is installed in the repo only for its secondary `beachball-auth-helper` tool which is used to acquire a GitHub App token.

(Requiring corepack is not currently feasible for reasons explained in `.yarnrc.yml`.)

### CLA

This project welcomes contributions and suggestions. Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
