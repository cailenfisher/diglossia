<script lang="ts">
  import { localText } from './store.svelte.js';

  let {
    slug,
    scope = undefined,
    entityId = undefined,
  }: {
    slug: string;
    scope?: string;
    entityId?: number;
  } = $props();
</script>

{localText(slug, scope, entityId)}
