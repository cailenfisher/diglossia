<script lang="ts">
  import { untrack } from 'svelte';
  import type { DictionaryInstance } from '../../lib/core/index.js';
  import { getDictionary, setDictionary } from '../../lib/svelte/index.js';
  import LocalText from '../../lib/svelte/LocalText.svelte';

  let {
    dictionary,
    onContext,
  }: {
    dictionary: DictionaryInstance;
    onContext: (contextDictionary: DictionaryInstance) => void;
  } = $props();

  // setDictionary() runs once at init by design, so capturing the initial
  // prop values is intended — untrack says so to the compiler.
  untrack(() => {
    setDictionary(dictionary);
    onContext(getDictionary());
  });
</script>

<LocalText slug="greeting" />
