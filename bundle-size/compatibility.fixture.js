import { createKeyborg, disposeKeyborg } from "keyborg";
import { enableKeyborgCompatibility } from "keyborg/compatibility";

console.log(createKeyborg, disposeKeyborg, enableKeyborgCompatibility);

export default {
  name: "Compatibility opt-in",
};
